// backend/db.js
const mysql = require('mysql2/promise');
const { requireDbConfig } = require('../../load-env');

const baseConfig = requireDbConfig();
const dbConfig = {
  ...baseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

console.log(`--- Connecting to MySQL (${dbConfig.host} / ${dbConfig.database}) ---`);

module.exports = pool;
