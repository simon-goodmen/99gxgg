const crypto = require('crypto');

const HASH_PREFIX = 'scrypt';
const HASH_KEYLEN = 64;
const SALT_BYTES = 16;

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, HASH_KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

function getDefaultAdminUsername() {
  return String(process.env.ADMIN_DEFAULT_USERNAME || 'admin').trim() || 'admin';
}

function isHashedPassword(password) {
  return typeof password === 'string' && password.startsWith(`${HASH_PREFIX}$`);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = await scryptAsync(String(password), salt);
  return `${HASH_PREFIX}$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;
  if (!isHashedPassword(storedPassword)) {
    return String(password) === String(storedPassword);
  }

  const [, salt, digest] = storedPassword.split('$');
  if (!salt || !digest) return false;

  const derivedKey = await scryptAsync(String(password), salt);
  const storedBuffer = Buffer.from(digest, 'hex');
  if (storedBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derivedKey);
}

async function ensureAdminTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [columns] = await pool.query('DESCRIBE admin_users');
  if (!columns.some((column) => column.Field === 'role')) {
    await pool.query("ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) DEFAULT 'admin'");
  }
}

async function ensureDefaultAdmin(pool, options = {}) {
  await ensureAdminTable(pool);

  const username = getDefaultAdminUsername();
  const defaultPassword = String(process.env.ADMIN_DEFAULT_PASSWORD || '');
  const syncPasswordOnBoot = String(
    options.syncPasswordOnBoot ?? process.env.ADMIN_SYNC_PASSWORD_ON_BOOT ?? 'false'
  ).toLowerCase() === 'true';

  const [rows] = await pool.query('SELECT * FROM admin_users WHERE username = ? LIMIT 1', [username]);
  if (rows.length === 0) {
    if (!defaultPassword) {
      throw new Error('缺少 ADMIN_DEFAULT_PASSWORD，无法创建默认后台账号');
    }

    await pool.query(
      'INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)',
      [username, await hashPassword(defaultPassword), 'superadmin']
    );
    return { created: true, synced: false, username };
  }

  const user = rows[0];
  let synced = false;

  if (!isHashedPassword(user.password)) {
    const nextPassword = defaultPassword || user.password;
    await pool.query('UPDATE admin_users SET password=? WHERE id=?', [
      await hashPassword(nextPassword),
      user.id
    ]);
    synced = true;
  } else if (syncPasswordOnBoot && defaultPassword) {
    await pool.query('UPDATE admin_users SET password=? WHERE id=?', [
      await hashPassword(defaultPassword),
      user.id
    ]);
    synced = true;
  }

  return { created: false, synced, username };
}

async function authenticateAdmin(pool, username, password) {
  const [rows] = await pool.query('SELECT * FROM admin_users WHERE username = ? LIMIT 1', [username]);
  if (rows.length === 0) return null;

  const user = rows[0];
  const matched = await verifyPassword(password, user.password);
  if (!matched) return null;

  if (!isHashedPassword(user.password)) {
    await pool.query('UPDATE admin_users SET password=? WHERE id=?', [
      await hashPassword(password),
      user.id
    ]);
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role || 'admin'
  };
}

async function resetAdminPassword(pool, username, nextPassword) {
  await ensureAdminTable(pool);
  const account = String(username || getDefaultAdminUsername()).trim();
  const password = String(nextPassword || '').trim();
  if (!password) {
    throw new Error('新密码不能为空');
  }

  const [rows] = await pool.query('SELECT id FROM admin_users WHERE username = ? LIMIT 1', [account]);
  const hashedPassword = await hashPassword(password);

  if (rows.length === 0) {
    await pool.query(
      'INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)',
      [account, hashedPassword, 'superadmin']
    );
    return { created: true, username: account };
  }

  await pool.query('UPDATE admin_users SET password=? WHERE id=?', [hashedPassword, rows[0].id]);
  return { created: false, username: account };
}

module.exports = {
  authenticateAdmin,
  ensureAdminTable,
  ensureDefaultAdmin,
  getDefaultAdminUsername,
  hashPassword,
  isHashedPassword,
  resetAdminPassword,
  verifyPassword,
};
