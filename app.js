const express = require("express");
const session = require("express-session");
const cors = require("cors")
const passport = require("passport");
const pool = require("./db");
const cookieParser = require("cookie-parser");
const pgSession = require("connect-pg-simple")(session);

const app = express();
const PORT = process.env.PORT || 8000;

/*default storage with memomry leaks*/
//const store = new session.MemoryStore();

/*pg storage*/
const store = new pgSession({
    pool, // Pass the PostgreSQL connection pool
    /**default table_name is session if table_name is not specified */
    tableName: "carpalace_session",
    //encrypt: true,
});

/*check if cookie parser is causing a conflict*/
//app.use(cookieParser());
app.use(
    session({
        store: store,
        secret: "qEas5ns3gxl41G",
        cookie: { maxAge: 86400000, secure: true /*secure: false*/ , sameSite: "None", httpsOnly: true},
        resave: false,
        //domain: "localhost",
        /*domain value SHOULD NOT contain protocol"*/
        //domain: "https://carpalace.netlify.app",
        domain: "carpalace.netlify.app",
        saveUninitialized: false,
    })
);

app.use(cors({
    credentials: true,
    //origin: "http://localhost:3000",
    origin: "https://carpalace.netlify.app"
}))
app.use(express.json());




app.get("/loginstatus", async (req, res, next) => {
    let checkStatus = await req.session.authenticated;
    console.log("check status", checkStatus);
    console.log("loginStatus authenticated? ", req.session.authenticated);
    console.log("loginStatus user", req.session.user);
    console.log("login Status req session ID", req.sessionID)
    console.log("login Status res session ID", res.sessionID)



    if (req.session.authenticated) {
        res.status(200).json(true)

    }
    else {
        req.session.authenticated = false;
        res.status(200).json(false)
    }
});

app.post("/register", async (req, res, next) => {
    const data = req.body;
    console.log("Incoming data", data);
    //console.log("Full request object", req);
    let { userName, firstName, email, location, password, phone } = data;
    let usernameCheck = await pool.query("SELECT user_name from carpalace_users WHERE user_name= $1", [userName]);
    console.log("check", usernameCheck);

    if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ error: true, message: "This username already exists please choose another username" })
    }
    else {
        try {
            let newUser = await pool.query("INSERT INTO carpalace_users(user_name, password, first_name, email, location, phone) VALUES($1,$2,$3,$4,$5,$6)", [userName, password, firstName, email, location, phone])
            return res.status(200).json({ error: false, message: "User created" })
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: true, message: "an error occured while creating user" })
        }
    }
});

app.post("/login", async (req, res, next) => {
    const data = req.body;
    console.log("login data", data);
    let userIdentity = data.userName;
    console.log(userIdentity)
    let password = data.password;
    console.log("password", password)
    //checks, validation, and normalization
    try {
        let user_profile = await pool.query("SELECT user_name, first_name, email, location, phone FROM carpalace_users WHERE password=$1 AND (user_name = $2 OR email = $2)", [password, userIdentity]);
        //console.log("profile search", user_profile)
        if (user_profile.rows.length > 0) {
            let user = user_profile.rows[0]
            console.log("User found")
            console.log(user);
            req.session.authenticated = true;
            req.session.user = user;

            console.log("login authenticated? ", req.session.authenticated);
            console.log("user login", req.session.user);
            console.log("login req session ID", req.sessionID)
            console.log("login res session ID", res.sessionID)


            return res.status(200).json({ error: false })


        }
        else {
            console.log("Unauthorized access")
            return res.status(401).json({ error: true, message: "No user found" })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: true, message: "Internal serval error" })
    }
});

app.get("/profile", async (req, res, next) => {
    try {
        console.log("Incoming profile request")
        console.log(req.session.authenticated);
        console.log("user", req.session.user)
        console.log("profile request", req.sessionID)
        console.log("profile res session ID", res.sessionID)

        if (req.session.user) {
            console.log(req.session.user)
            return res.status(200).json(req.session.user);
        }
        else {
            return res.status(404).json();
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json()
    }
})

app.get("/getCart", (req, res, next) => {
    console.log("getting cart items")
    console.log("get cart is authenticated?", req.session.authenticated);

    if (req.session.authenticated) {
        if (req.session.user.cartItems) {
            console.log("returning cart", req.session.user.cartItems)

            let newTotal = 0;
            req.session.user.cartItems.forEach(cartItem => {
                newTotal += cartItem.price;
            });

            console.log("newTotal", newTotal)


            res.status(200).json({ cartItems: req.session.user.cartItems, total: newTotal })
        }
        else {
            console.log("No items currently in cart")
            res.status(200).json({ cartItems: [], total: 0 })
        }
    }
})


app.put("/addToCart", (req, res, next) => {
    console.log("Incoming request", req.body)
    let newItem = req.body;
    let newItemPrice = req.body.price;

    console.log("new item price", newItemPrice);
    if (!req.session.authenticated) {
        console.log("unauthorized action")
        res.status(401).json({ message: "unauthorized" })
    }
    else {
        console.log("authorized")
        try {
            if (req.session.user.cartItems) {
                console.log("existing cart", req.session.user.cartItems)
                let currentItems = req.session.user.cartItems;
                currentItems.push(newItem);
                req.session.user.cartItems = currentItems
                console.log("updated cart", req.session.user.cartItems);


                res.status(200).json({ message: "success" })
            }
            else {
                req.session.user.cartItems = [newItem];
                console.log("creating new cart", req.session.user.cartItems)
                res.status(200).json({ message: "success" })
            }

        } catch (error) {
            return res.status(500).json({ message: "error" })
        }

    }

});

app.delete("/delete-item", async (req, res, next) => {
    let itemToDelete = req.body;
    try {
        if (!req.session.authenticated) {
            console.log("unauthorized action")
            res.status(401).json({ message: "unauthorized" })
        }
        else {
            let currentCart = req.session.user.cartItems;
            console.log("cart before deletion", currentCart);
            let newCart = currentCart.filter((item) => {
                return item.name !== itemToDelete.name;
            });
            console.log("cart after deletion", newCart);
            req.session.user.cartItems = newCart;
            res.status(204).json();
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" })
    }


})


app.post("/logout", async(req, res, next) => {
    // Destroy the session to log the user out
    console.log("log out received")
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ message: "Internal server error" });
            }
            // Respond with a success message
            res.status(200).json({ message: "Logout successful" });
        });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }

});







app.listen(PORT, () => {
    console.log("server listening at port " + PORT)
})
