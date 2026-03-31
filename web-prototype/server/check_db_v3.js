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
    console.log('--- DATABASE CHECK START ---');
    console.log(`Connected to host: ${dbConfig.host}`);
    
    const [tables] = await connection.query('SHOW TABLES');
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`Table: ${tableName} | Count: ${rows[0].count}`);
    }

    console.log('--- DATABASE CHECK END ---');
    await connection.end();
  } catch (err) {
    console.log('--- DATABASE CHECK ERROR ---');
    console.error(err.message);
  }
}

checkDb();
