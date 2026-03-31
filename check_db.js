const mysql = require('mysql2/promise');

const dbConfig = {
  host: '99.99gxgg.com',
  user: '99app',
  password: '<REDACTED_DB_PASSWORD>',
  database: '99app'
};

async function checkDb() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL successfully.');
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in 99app database:');
    console.log(tables);

    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [[{count}]] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`Table: ${tableName}, Row Count: ${count}`);
    }

    await connection.end();
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
  }
}

checkDb();
