const { Pool } = require('pg');

require("dotenv").config();


/**Remote database */
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    // Set SSL options here
    rejectUnauthorized: false, // You may need to set this to true depending on your PostgreSQL server's SSL settings
  },
});

/**Local database */
/*
const pool = new Pool({
  user: process.env.DB_USER_local,
  host: process.env.DB_HOST_local,
  database: process.env.DB_DATABASE_local,
  password: process.env.DB_PASSWORD_local,
  port: process.env.DB_PORT_local,
  /*ssl: {
    // Set SSL options here
    rejectUnauthorized: false, // You may need to set this to true depending on your PostgreSQL server's SSL settings
  },
});*/

module.exports = pool;
