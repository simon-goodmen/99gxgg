const mysql = require('mysql2/promise');
const { requireDbConfig } = require('./load-env');

const dbConfig = requireDbConfig();

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
