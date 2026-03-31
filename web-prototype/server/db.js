// backend/db.js
const mysql = require('mysql2/promise');

// MySQL Credentials
const dbConfig = {
  host: '99.99gxgg.com',
  user: '99app',
  password: '<REDACTED_DB_PASSWORD>',
  database: '99app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

console.log('--- Connecting to MySQL (99.99gxgg.com / 99app) ---');

module.exports = pool;
