const mysql = require("mysql2/promise");
require("dotenv").config();

const useSsl = String(process.env.DB_SSL || "").toLowerCase() === "true";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {})
});

module.exports = pool;
