const mysql = require('mysql2/promise');
const { requireDbConfig, loadEnv } = require('../load-env.cjs');
const { ensureAdminTable } = require('./admin-auth');

loadEnv();
const dbConfig = requireDbConfig();

async function check() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    await ensureAdminTable(conn);
    const [rows] = await conn.query('SELECT id, username, role, created_at FROM admin_users ORDER BY id ASC');
    console.log('admin_users table exists: true');
    console.log('Admin users count:', rows.length);
    console.log('Users:', rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}
check();
