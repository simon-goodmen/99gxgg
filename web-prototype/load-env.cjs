const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadEnv(startDir = __dirname) {
  const candidates = [
    path.join(startDir, '.env'),
    path.join(startDir, '.env.local'),
    path.join(startDir, 'admin', '.env')
  ];

  for (const filePath of candidates) {
    parseEnvFile(filePath);
  }
}

function getDbConfig() {
  loadEnv();

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '99app'
  };
}

function requireDbConfig() {
  const config = getDbConfig();
  const missing = [];
  if (!config.user) missing.push('DB_USER');
  if (!config.password) missing.push('DB_PASSWORD');
  if (missing.length) {
    throw new Error(`缺少数据库环境变量: ${missing.join(', ')}`);
  }
  return config;
}

module.exports = {
  loadEnv,
  getDbConfig,
  requireDbConfig,
};
