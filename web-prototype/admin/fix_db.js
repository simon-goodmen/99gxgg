const mysql = require('mysql2/promise');
const { requireDbConfig, loadEnv } = require('../load-env.cjs');

loadEnv();
const dbConfig = requireDbConfig();

async function fix() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    // Check table structure
    const [columns] = await conn.query('DESCRIBE admin_users');
    console.log('Current columns:', columns.map(c => c.Field));
    
    // Add role column if not exists
    const hasRole = columns.some(c => c.Field === 'role');
    if (!hasRole) {
      console.log('Adding role column...');
      await conn.query("ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) DEFAULT 'admin'");
      console.log('role column added');
    }
    
    // Check if admin user exists
    const [users] = await conn.query("SELECT * FROM admin_users WHERE username = 'admin'");
    if (users.length === 0) {
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
      if (!adminPassword) {
        throw new Error('缺少 ADMIN_DEFAULT_PASSWORD，无法创建默认后台账号');
      }
      console.log('Creating default admin user...');
      await conn.query(
        "INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)",
        ['admin', adminPassword, 'superadmin']
      );
      console.log('Default admin created');
    } else {
      console.log('Admin user exists:', users[0].username);
    }
    
    console.log('Fix completed!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}
fix();
