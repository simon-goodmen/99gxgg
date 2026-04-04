const mysql = require('mysql2/promise');
const { requireDbConfig, loadEnv } = require('../../load-env');

loadEnv();
const dbConfig = requireDbConfig();

async function check() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    // Check if admin_users table exists
    const [tables] = await conn.query("SHOW TABLES LIKE 'admin_users'");
    console.log('admin_users table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      const [rows] = await conn.query('SELECT id, username, role FROM admin_users');
      console.log('Admin users count:', rows.length);
      console.log('Users:', rows);
    } else {
      console.log('Creating admin_users table...');
      await conn.query(`
        CREATE TABLE admin_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Table created. Inserting default admin user...');
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
      if (!adminPassword) {
        throw new Error('缺少 ADMIN_DEFAULT_PASSWORD，无法创建默认后台账号');
      }
      await conn.query(
        "INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)",
        ['admin', adminPassword, 'superadmin']
      );
      console.log('Default admin user created: admin / [from ADMIN_DEFAULT_PASSWORD]');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}
check();
