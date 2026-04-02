const mysql = require('mysql2/promise');
const dbConfig = {
  host: '99.99gxgg.com',
  user: '99app',
  password: '<REDACTED_DB_PASSWORD>',
  database: '99app'
};

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
      await conn.query(
        "INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)",
        ['admin', '<REDACTED_ADMIN_PASSWORD>', 'superadmin']
      );
      console.log('Default admin user created: admin / <REDACTED_ADMIN_PASSWORD>');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}
check();
