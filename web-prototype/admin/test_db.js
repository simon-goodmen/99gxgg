const mysql = require('mysql2/promise');
const { requireDbConfig } = require('../../load-env');

const dbConfig = requireDbConfig();

mysql.createConnection(dbConfig).then(conn => {
  console.log('Connected to MySQL successfully.');
  conn.end();
}).catch(err => {
  console.error('Error connecting to MySQL:', err.message);
});
