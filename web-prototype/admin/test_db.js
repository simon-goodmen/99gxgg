const mysql = require('mysql2/promise');
const dbConfig = {
  host: '99.99gxgg.com',
  user: '99app',
  password: '<REDACTED_DB_PASSWORD>',
  database: '99app'
};

mysql.createConnection(dbConfig).then(conn => {
  console.log('Connected to MySQL successfully.');
  conn.end();
}).catch(err => {
  console.error('Error connecting to MySQL:', err.message);
});