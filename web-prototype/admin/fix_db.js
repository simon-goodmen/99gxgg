const mysql = require('mysql2/promise');
const { requireDbConfig, loadEnv } = require('../load-env.cjs');
const { ensureDefaultAdmin } = require('./admin-auth');

loadEnv();
const dbConfig = requireDbConfig();

async function fix() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const result = await ensureDefaultAdmin(conn);
    if (result.created) {
      console.log('Default admin created:', result.username);
    } else if (result.synced) {
      console.log('Default admin password upgraded:', result.username);
    } else {
      console.log('Admin user exists:', result.username);
    }
    console.log('Fix completed!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}
fix();
