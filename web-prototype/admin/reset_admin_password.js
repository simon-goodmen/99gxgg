const mysql = require('mysql2/promise');
const { requireDbConfig, loadEnv } = require('../load-env.cjs');
const { getDefaultAdminUsername, resetAdminPassword } = require('./admin-auth');

loadEnv();

async function main() {
  const username = process.argv[2] || process.env.ADMIN_DEFAULT_USERNAME || getDefaultAdminUsername();
  const password = process.argv[3] || process.env.ADMIN_DEFAULT_PASSWORD;

  if (!password) {
    throw new Error('缺少新密码。用法: node reset_admin_password.js [username] [newPassword]');
  }

  const conn = await mysql.createConnection(requireDbConfig());
  try {
    const result = await resetAdminPassword(conn, username, password);
    console.log(result.created ? 'Admin created and password set:' : 'Admin password reset:');
    console.log(`- username: ${result.username}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
