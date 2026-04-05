// backend/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const { loadEnv } = require('../load-env.cjs');
const pool = require('./db');
const { STEEL_FACTORY_PATCHES } = require('./defaults');
const { authenticateAdmin, ensureDefaultAdmin } = require('./admin-auth');

loadEnv();

const app = express();
const PORT = Number(process.env.PORT || 5001);

app.use(cors());
app.use(bodyParser.json());

const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const adminSessions = new Map();

function parseCookies(headerValue = '') {
  return headerValue.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {});
}

function createAdminSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  adminSessions.set(token, {
    user,
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
  });
  return token;
}

function getAdminSession(req) {
  const token = parseCookies(req.headers.cookie || '')[ADMIN_SESSION_COOKIE];
  if (!token) return null;

  const session = adminSessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(token);
    return null;
  }

  session.expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  return { token, ...session };
}

function setAdminSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_SESSION_TTL_MS / 1000}`);
}

function clearAdminSessionCookie(res) {
  res.setHeader('Set-Cookie', `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function requireAdminApiAuth(req, res, next) {
  const session = getAdminSession(req);
  if (!session) {
    return res.status(401).json({ success: false, message: '请先登录后台账号' });
  }
  req.adminUser = session.user;
  req.adminSessionToken = session.token;
  next();
}

function requireAdminPageAuth(req, res, next) {
  const session = getAdminSession(req);
  if (!session) {
    return res.redirect('/admin');
  }
  req.adminUser = session.user;
  req.adminSessionToken = session.token;
  next();
}

function normalizeConcreteStation(row) {
  const normalized = { ...row };
  normalized.grades = normalized.grades ? normalized.grades.split(',') : [];
  try {
    normalized.grade_prices = normalized.grade_prices ? JSON.parse(normalized.grade_prices) : {};
  } catch {
    normalized.grade_prices = {};
  }
  normalized.tags = normalized.tags ? normalized.tags.split(',') : [];
  return normalized;
}

async function syncSteelFactoriesToDb() {
  for (const patch of STEEL_FACTORY_PATCHES) {
    await pool.query(
      'UPDATE steel_factories SET month_total=?, month_remain=? WHERE id=?',
      [patch.month_total, patch.month_remain, patch.id]
    );
  }
}

async function syncDefaultBusinessData() {
  try {
    await syncSteelFactoriesToDb();
    console.log('[Bootstrap] Steel defaults synced to DB');
  } catch (err) {
    console.error('[Bootstrap] Data sync failed:', err.message);
  }
}

app.get('/admin/dashboard.html', requireAdminPageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve Admin UI
app.use('/admin', express.static(__dirname));

// Redirect root to admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      database: 'connected',
      port: PORT,
      uptimeSeconds: Math.round(process.uptime())
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

// ─── Admin Login ──────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await authenticateAdmin(pool, username, password);
    if (user) {
      const token = createAdminSession(user);
      setAdminSessionCookie(res, token);
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: '账号或密码错误' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/me', requireAdminApiAuth, (req, res) => {
  res.json({ success: true, user: req.adminUser });
});

app.post('/api/admin/logout', requireAdminApiAuth, (req, res) => {
  adminSessions.delete(req.adminSessionToken);
  clearAdminSessionCookie(res);
  res.json({ success: true });
});

// ─── Platform Settings ────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value, label FROM platform_settings');
    const obj = {};
    rows.forEach(r => { obj[r.setting_key] = { value: r.setting_value, label: r.label }; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', requireAdminApiAuth, async (req, res) => {
  const updates = req.body; // { key: value, ... }
  try {
    for (const [k, v] of Object.entries(updates)) {
      await pool.query(
        'INSERT INTO platform_settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?',
        [k, v, v]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Homepage Stats ───────────────────────────────────────────────────────────
app.get('/api/homepage/stats', async (req, res) => {
  try {
    const [settings] = await pool.query(
      "SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('partner_concrete_stations','shared_steel_factories','response_label','fulfillment_rate')"
    );
    const smap = {};
    settings.forEach(s => { smap[s.setting_key] = s.setting_value; });

    // Today inquiry count
    const today = new Date().toISOString().slice(0, 10);
    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM inquiry_log WHERE DATE(created_at) = ?', [today]
    );

    res.json({
      partner_concrete_stations: smap.partner_concrete_stations || '7',
      shared_steel_factories: smap.shared_steel_factories || '5',
      today_inquiries: cnt,
      response_label: smap.response_label || '7x12 人工响应',
      fulfillment_rate: smap.fulfillment_rate || '98%'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Homepage Quotes ──────────────────────────────────────────────────────────
app.get('/api/homepage/quotes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM homepage_quotes WHERE is_active=1 ORDER BY sort_order ASC'
    );
    rows.forEach(r => { r.tags = r.tags ? r.tags.split(',') : []; });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/homepage/quotes', requireAdminApiAuth, async (req, res) => {
  const { product_name, price, unit, effective_time, tags, is_active, sort_order } = req.body;
  try {
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    await pool.query(
      'INSERT INTO homepage_quotes (product_name,price,unit,effective_time,tags,is_active,sort_order) VALUES (?,?,?,?,?,?,?)',
      [product_name, price, unit, effective_time, tagsStr, is_active ?? 1, sort_order ?? 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/homepage/quotes/:id', requireAdminApiAuth, async (req, res) => {
  const { id } = req.params;
  const { product_name, price, unit, effective_time, tags, is_active, sort_order } = req.body;
  try {
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    await pool.query(
      'UPDATE homepage_quotes SET product_name=?,price=?,unit=?,effective_time=?,tags=?,is_active=?,sort_order=? WHERE id=?',
      [product_name, price, unit, effective_time, tagsStr, is_active, sort_order, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/homepage/quotes/:id', requireAdminApiAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM homepage_quotes WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Inquiry Log (埋点) ───────────────────────────────────────────────────────
app.post('/api/inquiry/log', async (req, res) => {
  const { user_id, inquiry_type } = req.body;
  try {
    await pool.query('INSERT INTO inquiry_log (user_id, inquiry_type) VALUES (?,?)', [user_id || null, inquiry_type || 'general']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Steel API ───────────────────────────────────────────────────────────────
app.get('/api/steel/factories', async (req, res) => {
  try {
    const [factories] = await pool.query('SELECT * FROM steel_factories');
    for (let f of factories) {
      const [timeline] = await pool.query('SELECT * FROM steel_timeline WHERE factory_id = ? ORDER BY id', [f.id]);
      f.tags = f.tags ? f.tags.split(',') : [];
      f.timelineBlocks = timeline;
    }
    res.json(factories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/steel/factories/:id', requireAdminApiAuth, async (req, res) => {
  const { id } = req.params;
  const { status, status_color, orders, weekly_capacity, condition_text, condition_color, month_remain, percentage, timeline_status } = req.body;
  try {
    await pool.query(
      'UPDATE steel_factories SET status=?,status_color=?,orders=?,weekly_capacity=?,condition_text=?,condition_color=?,month_remain=?,percentage=?,timeline_status=? WHERE id=?',
      [status, status_color, orders, weekly_capacity, condition_text, condition_color, month_remain, percentage, timeline_status, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a single timeline block
app.put('/api/steel/timeline/:id', requireAdminApiAuth, async (req, res) => {
  const { name, theme } = req.body;
  try {
    await pool.query('UPDATE steel_timeline SET name=?,theme=? WHERE id=?', [name, theme, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Concrete API ─────────────────────────────────────────────────────────────
app.get('/api/concrete/stations', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM concrete_stations ORDER BY id ASC');
    const normalizedRows = rows.map(normalizeConcreteStation);
    res.json(normalizedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', async (req, res) => {
  const { source, lead_type, name, phone, message } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和手机号必填' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO customer_leads (source, lead_type, name, phone, message) VALUES (?,?,?,?,?)',
      [source || 'miniprogram', lead_type || 'consultation', name, phone, message || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/leads', requireAdminApiAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customer_leads ORDER BY created_at DESC, id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/concrete/stations/:id', requireAdminApiAuth, async (req, res) => {
  const { id } = req.params;
  const {
    name, status, status_color, price, weekly_quota, sold_qty,
    condition_text, condition_color, percentage, timeline_status,
    grades, grade_prices
  } = req.body;
  const gradesStr = Array.isArray(grades) ? grades.join(',') : grades;
  const gradePricesStr = grade_prices ? JSON.stringify(grade_prices) : null;
  try {
    await pool.query(
      `UPDATE concrete_stations
       SET name = COALESCE(?, name),
           status = COALESCE(?, status),
           status_color = COALESCE(?, status_color),
           price = COALESCE(?, price),
           weekly_quota = COALESCE(?, weekly_quota),
           sold_qty = COALESCE(?, sold_qty),
           condition_text = COALESCE(?, condition_text),
           condition_color = COALESCE(?, condition_color),
           percentage = COALESCE(?, percentage),
           timeline_status = COALESCE(?, timeline_status),
           grades = COALESCE(?, grades),
           grade_prices = COALESCE(?, grade_prices)
       WHERE id=?`,
      [name, status, status_color, price, weekly_quota, sold_qty, condition_text, condition_color, percentage, timeline_status, gradesStr, gradePricesStr, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atomic deduct quota (抢单扣减)
app.post('/api/concrete/stations/:id/deduct', async (req, res) => {
  const { qty } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[station]] = await conn.query('SELECT weekly_quota, sold_qty FROM concrete_stations WHERE id=? FOR UPDATE', [req.params.id]);
    const remaining = station.weekly_quota - station.sold_qty;
    if (remaining < qty) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: '库存不足，请减少订购量' });
    }
    await conn.query('UPDATE concrete_stations SET sold_qty=sold_qty+? WHERE id=?', [qty, req.params.id]);
    await conn.commit();
    res.json({ success: true, remaining: remaining - qty });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─── Materials API ────────────────────────────────────────────────────────────
app.get('/api/materials/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM material_products ORDER BY category_id, id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/materials/products/:id', requireAdminApiAuth, async (req, res) => {
  const { id } = req.params;
  const { price, group_price, current_qty } = req.body;
  try {
    await pool.query(
      'UPDATE material_products SET price=?,group_price=?,current_qty=? WHERE id=?',
      [price, group_price, current_qty, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Auth: Phone + Code Login ─────────────────────────────────────────────────
// In-memory code store (development): { phone: { code, expires } }
const codeSessions = {};

app.post('/api/auth/send-code', (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 11) {
    return res.status(400).json({ error: '请输入正确的11位手机号' });
  }
  // Fixed code "1234" for development; replace with SMS service in production
  codeSessions[phone] = { code: '1234', expires: Date.now() + 5 * 60 * 1000 };
  console.log(`[Auth] Verification code for ${phone}: 1234`);
  res.json({ success: true, message: '验证码已发送 (开发模式: 1234)' });
});

app.post('/api/auth/verify-code', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: '参数不完整' });

  const session = codeSessions[phone];
  if (!session) return res.status(400).json({ error: '请先获取验证码' });
  if (Date.now() > session.expires) {
    delete codeSessions[phone];
    return res.status(400).json({ error: '验证码已过期，请重新获取' });
  }
  if (session.code !== String(code)) {
    return res.status(400).json({ error: '验证码错误' });
  }
  delete codeSessions[phone];

  try {
    let [rows] = await pool.query('SELECT * FROM app_users WHERE phone=?', [phone]);
    if (rows.length === 0) {
      // Auto-register
      const openid = `phone_${phone}`;
      await pool.query(
        'INSERT INTO app_users (openid, phone) VALUES (?, ?)',
        [openid, phone]
      );
      [rows] = await pool.query('SELECT * FROM app_users WHERE phone=?', [phone]);
    } else {
      await pool.query('UPDATE app_users SET last_login=NOW() WHERE id=?', [rows[0].id]);
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/quick-login', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const realName = String(req.body.real_name || '').trim();
  if (!phone || !realName) {
    return res.status(400).json({ error: '手机号和姓名必填' });
  }
  if (!/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ error: '请输入正确的11位手机号' });
  }

  try {
    let [rows] = await pool.query('SELECT * FROM app_users WHERE phone=? ORDER BY id DESC LIMIT 1', [phone]);
    if (rows.length === 0) {
      const openid = `quick_${phone}`;
      await pool.query(
        'INSERT INTO app_users (openid, phone, real_name, last_login) VALUES (?, ?, ?, NOW())',
        [openid, phone, realName]
      );
      [rows] = await pool.query('SELECT * FROM app_users WHERE phone=? ORDER BY id DESC LIMIT 1', [phone]);
    } else {
      await pool.query(
        'UPDATE app_users SET real_name=?, last_login=NOW() WHERE id=?',
        [realName, rows[0].id]
      );
      [rows] = await pool.query('SELECT * FROM app_users WHERE id=?', [rows[0].id]);
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── App Users API ────────────────────────────────────────────────────────────
// Get or create user by openid (WeChat mini-program login)
app.post('/api/users/login', async (req, res) => {
  const { openid, phone, real_name, avatar_url } = req.body;
  if (!openid) return res.status(400).json({ error: 'openid required' });
  try {
    let [rows] = await pool.query('SELECT * FROM app_users WHERE openid=?', [openid]);
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO app_users (openid,phone,real_name,avatar_url) VALUES (?,?,?,?)',
        [openid, phone || null, real_name || null, avatar_url || null]
      );
      [rows] = await pool.query('SELECT * FROM app_users WHERE openid=?', [openid]);
    } else {
      await pool.query('UPDATE app_users SET last_login=NOW() WHERE id=?', [rows[0].id]);
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const [[user]] = await pool.query('SELECT id,openid,phone,real_name,company,role,avatar_url,created_at FROM app_users WHERE id=?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [addresses] = await pool.query('SELECT * FROM user_addresses WHERE user_id=? ORDER BY is_default DESC', [req.params.id]);
    res.json({ ...user, addresses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { phone, real_name, company } = req.body;
  try {
    await pool.query('UPDATE app_users SET phone=?,real_name=?,company=? WHERE id=?', [phone, real_name, company, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User Addresses API ───────────────────────────────────────────────────────
app.get('/api/users/:id/addresses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM user_addresses WHERE user_id=? ORDER BY is_default DESC, id DESC', [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/addresses', async (req, res) => {
  const { label, province, city, district, detail, lat, lng, contact_name, contact_phone, is_default } = req.body;
  try {
    if (is_default) {
      await pool.query('UPDATE user_addresses SET is_default=0 WHERE user_id=?', [req.params.id]);
    }
    const [result] = await pool.query(
      'INSERT INTO user_addresses (user_id,label,province,city,district,detail,lat,lng,contact_name,contact_phone,is_default) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [req.params.id, label, province, city, district, detail, lat || null, lng || null, contact_name, contact_phone, is_default ? 1 : 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/addresses/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM user_addresses WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User Projects API ────────────────────────────────────────────────────────
app.get('/api/users/:id/projects', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM user_projects WHERE user_id=? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/projects', async (req, res) => {
  const { name, company, addr, invoice_title, invoice_tax_id, bank, bank_account, contact_phone, notes } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO user_projects (user_id,name,company,addr,invoice_title,invoice_tax_id,bank,bank_account,contact_phone,notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [req.params.id, name, company || null, addr || null, invoice_title || null, invoice_tax_id || null, bank || null, bank_account || null, contact_phone || null, notes || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/projects/:projectId', async (req, res) => {
  const { name, company, addr, invoice_title, invoice_tax_id, bank, bank_account, contact_phone, notes } = req.body;
  try {
    await pool.query(
      'UPDATE user_projects SET name=?,company=?,addr=?,invoice_title=?,invoice_tax_id=?,bank=?,bank_account=?,contact_phone=?,notes=? WHERE id=? AND user_id=?',
      [name, company, addr, invoice_title, invoice_tax_id, bank, bank_account, contact_phone, notes, req.params.projectId, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id/projects/:projectId', async (req, res) => {
  try {
    await pool.query('DELETE FROM user_projects WHERE id=? AND user_id=?', [req.params.projectId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders API ───────────────────────────────────────────────────────────────
// Generate order number
const genOrderNo = (type) => {
  const prefix = { concrete: 'XC', steel: 'XG', materials: 'XM' }[type] || 'XO';
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = String(Math.floor(Math.random()*900)+100);
  return `${prefix}${ds}${rand}`;
};

app.get('/api/orders', async (req, res) => {
  const { user_id, status, order_type, order_no } = req.query;
  try {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (user_id) { sql += ' AND user_id=?'; params.push(user_id); }
    if (status)  { sql += ' AND status=?';  params.push(status); }
    if (order_type) { sql += ' AND order_type=?'; params.push(order_type); }
    if (order_no) { sql += ' AND order_no=?'; params.push(order_no); }
    sql += ' ORDER BY created_at DESC';
    const [orders] = await pool.query(sql, params);
    for (const o of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id=?', [o.id]);
      const [nodes] = await pool.query('SELECT * FROM order_tracking_nodes WHERE order_id=? ORDER BY sort_order', [o.id]);
      o.items = items;
      o.tracking = nodes;
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id=?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id=?', [order.id]);
    const [nodes] = await pool.query('SELECT * FROM order_tracking_nodes WHERE order_id=? ORDER BY sort_order', [order.id]);
    order.items = items;
    order.tracking = nodes;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { user_id, order_type, items, delivery_address, delivery_lat, delivery_lng, remark } = req.body;
  if (!order_type || !items || items.length === 0) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const total = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
    const order_no = genOrderNo(order_type);
    const [result] = await conn.query(
      'INSERT INTO orders (order_no,user_id,order_type,status,total_amount,delivery_address,delivery_lat,delivery_lng,remark) VALUES (?,?,?,?,?,?,?,?,?)',
      [order_no, user_id || null, order_type, 'pending', total, delivery_address, delivery_lat || null, delivery_lng || null, remark || null]
    );
    const orderId = result.insertId;
    for (const item of items) {
      await conn.query(
        'INSERT INTO order_items (order_id,product_name,product_spec,unit,qty,unit_price,subtotal) VALUES (?,?,?,?,?,?,?)',
        [orderId, item.product_name, item.product_spec || '', item.unit || '', item.qty, item.unit_price, item.unit_price * item.qty]
      );
    }
    // Default tracking nodes based on type
    const nodeTemplates = {
      concrete: ['支付锁单','站点接单排产','混凝土出站装车','运输中/预计到场','已签收确认'],
      steel:    ['订单立项','深化图纸审核','原材料备料','精益加工中','质检发货','已签收确认'],
      materials:['支付成功','仓库备货发运','运输中','已签收确认']
    };
    const nodes = nodeTemplates[order_type] || nodeTemplates.materials;
    for (let i = 0; i < nodes.length; i++) {
      await conn.query(
        'INSERT INTO order_tracking_nodes (order_id,node_name,status,sort_order) VALUES (?,?,?,?)',
        [orderId, nodes[i], i === 0 ? 'completed' : 'pending', i + 1]
      );
    }
    await conn.commit();
    // Log inquiry
    await pool.query('INSERT INTO inquiry_log (user_id, inquiry_type) VALUES (?,?)', [user_id || null, order_type]);
    res.json({ success: true, order_no, order_id: orderId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Update order status
app.put('/api/orders/:id/status', requireAdminApiAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending','confirmed','delivering','completed','cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await pool.query('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/logistics', requireAdminApiAuth, async (req, res) => {
  const { logistics_company, logistics_no, driver_name, driver_phone, dispatcher_phone, vehicle_no, shipped_at } = req.body;
  if (!logistics_company || !logistics_no) {
    return res.status(400).json({ error: '物流公司和物流单号必填' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query('SELECT * FROM orders WHERE id=? FOR UPDATE', [req.params.id]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: '订单不存在' });
    }

    const shipTime = shipped_at || new Date();
    await conn.query(
      `UPDATE orders
       SET logistics_company=?, logistics_no=?, driver_name=?, driver_phone=?, dispatcher_phone=?, vehicle_no=?, shipped_at=?, logistics_status='assigned', logistics_updated_at=?, status='delivering'
       WHERE id=?`,
      [logistics_company, logistics_no, driver_name || null, driver_phone || null, dispatcher_phone || null, vehicle_no || null, shipTime, shipTime, req.params.id]
    );

    const [nodes] = await conn.query(
      'SELECT * FROM order_tracking_nodes WHERE order_id=? ORDER BY sort_order',
      [req.params.id]
    );

    const shippingNodeIndex = nodes.findIndex(n =>
      /发货|运输|发运|装车/.test(n.node_name || '')
    );

    if (shippingNodeIndex >= 0) {
      for (let i = 0; i < shippingNodeIndex; i += 1) {
        if (nodes[i].status !== 'completed') {
          await conn.query(
            'UPDATE order_tracking_nodes SET status=?, event_time=COALESCE(event_time, ?) WHERE id=?',
            ['completed', shipTime, nodes[i].id]
          );
        }
      }

      const shippingNode = nodes[shippingNodeIndex];
      const shippingNodeName = `${shippingNode.node_name} · ${logistics_company} / ${logistics_no}`;
      await conn.query(
        'UPDATE order_tracking_nodes SET node_name=?, status=?, event_time=? WHERE id=?',
        [shippingNodeName, 'processing', shipTime, shippingNode.id]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.put('/api/orders/:id/logistics-progress', requireAdminApiAuth, async (req, res) => {
  const { logistics_status, logistics_remark } = req.body;
  const validStatuses = ['assigned', 'loaded', 'in_transit', 'arriving', 'signed', 'exception'];
  if (!validStatuses.includes(logistics_status)) {
    return res.status(400).json({ error: '非法物流状态' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const now = new Date();
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id=? FOR UPDATE', [req.params.id]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: '订单不存在' });
    }

    const orderStatus = logistics_status === 'signed' ? 'completed' : logistics_status === 'exception' ? order.status : 'delivering';
    await conn.query(
      'UPDATE orders SET logistics_status=?, logistics_remark=?, logistics_updated_at=?, status=? WHERE id=?',
      [logistics_status, logistics_remark || null, now, orderStatus, req.params.id]
    );

    const [nodes] = await conn.query('SELECT * FROM order_tracking_nodes WHERE order_id=? ORDER BY sort_order', [req.params.id]);
    const shippingNodeIndex = nodes.findIndex(n => /发货|运输|发运|装车/.test(n.node_name || ''));
    const signNodeIndex = nodes.findIndex(n => /签收/.test(n.node_name || ''));

    if (shippingNodeIndex >= 0) {
      const shippingNode = nodes[shippingNodeIndex];
      let shippingNodeName = shippingNode.node_name || '运输中';
      if (order.logistics_company && order.logistics_no) {
        shippingNodeName = `运输中/预计到场 · ${order.logistics_company} / ${order.logistics_no}`;
      }

      if (['assigned', 'loaded', 'in_transit', 'arriving', 'exception'].includes(logistics_status)) {
        const stageLabelMap = {
          assigned: '已派车',
          loaded: '已装车',
          in_transit: '运输中',
          arriving: '即将到达',
          exception: '运输异常'
        };
        await conn.query(
          'UPDATE order_tracking_nodes SET node_name=?, status=?, event_time=? WHERE id=?',
          [`${shippingNodeName} · ${stageLabelMap[logistics_status]}`, logistics_status === 'exception' ? 'processing' : 'processing', now, shippingNode.id]
        );
      }

      if (logistics_status === 'signed') {
        for (const node of nodes) {
          await conn.query(
            'UPDATE order_tracking_nodes SET status=?, event_time=COALESCE(event_time, ?) WHERE id=?',
            ['completed', now, node.id]
          );
        }
      } else if (signNodeIndex >= 0) {
        for (let i = 0; i < signNodeIndex; i += 1) {
          const node = nodes[i];
          if (i < shippingNodeIndex && node.status !== 'completed') {
            await conn.query(
              'UPDATE order_tracking_nodes SET status=?, event_time=COALESCE(event_time, ?) WHERE id=?',
              ['completed', now, node.id]
            );
          }
        }
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Update tracking node
app.put('/api/orders/tracking/:nodeId', requireAdminApiAuth, async (req, res) => {
  const { status, event_time } = req.body;
  try {
    await pool.query(
      'UPDATE order_tracking_nodes SET status=?,event_time=? WHERE id=?',
      [status, event_time || null, req.params.nodeId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: All Users List ────────────────────────────────────────────────────
app.get('/api/admin/users', requireAdminApiAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id,phone,real_name,company,role,created_at,last_login FROM app_users ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id/role', requireAdminApiAuth, async (req, res) => {
  const { role } = req.body;
  if (!['buyer','admin','superadmin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    await pool.query('UPDATE app_users SET role=? WHERE id=?', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Orders List ───────────────────────────────────────────────────────
app.get('/api/admin/orders', requireAdminApiAuth, async (req, res) => {
  const { status, order_type, page = 1, limit = 20 } = req.query;
  try {
    let sql = 'SELECT o.*, u.real_name, u.phone FROM orders o LEFT JOIN app_users u ON o.user_id=u.id WHERE 1=1';
    const params = [];
    if (status)     { sql += ' AND o.status=?';     params.push(status); }
    if (order_type) { sql += ' AND o.order_type=?'; params.push(order_type); }
    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
    const [orders] = await pool.query(sql, params);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM orders');
    res.json({ orders, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Steel CRUD ──────────────────────────────────────────────────────
app.post('/api/steel/factories', requireAdminApiAuth, async (req, res) => {
  const { name, weekly_capacity, condition_text } = req.body;
  try {
    const [r] = await pool.query(
      'INSERT INTO steel_factories (name, status, status_color, orders, weekly_capacity, condition_text, condition_color, month_total, month_remain, percentage, timeline_status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [name, '接单中', 'green', 0, weekly_capacity||0, condition_text||'正常运营', 'green', weekly_capacity||0, weekly_capacity||0, 0, 'active']
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/steel/factories/:id', requireAdminApiAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM steel_factories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Concrete CRUD ────────────────────────────────────────────────────
app.post('/api/concrete/stations', requireAdminApiAuth, async (req, res) => {
  const {
    name,
    price,
    weekly_quota,
    condition_text,
    condition_color,
    status,
    status_color,
    timeline_status,
    grades,
    grade_prices
  } = req.body;
  const gradesStr = Array.isArray(grades) ? grades.join(',') : (grades || 'C15,C20,C25,C30,C35');
  const gradePricesStr = grade_prices ? JSON.stringify(grade_prices) : null;
  try {
    const [r] = await pool.query(
      `INSERT INTO concrete_stations
       (name, status, status_color, price, capacity, weekly_quota, sold_qty, grades, grade_prices, condition_text, condition_color, percentage, timeline_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        name,
        status || '开放预购',
        status_color || '#2E7D32',
        price || 0,
        weekly_quota || 0,
        weekly_quota || 0,
        0,
        gradesStr,
        gradePricesStr,
        condition_text || '正常供应',
        condition_color || '#2E7D32',
        0,
        timeline_status || '正常'
      ]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/concrete/stations/:id', requireAdminApiAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM concrete_stations WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Materials CRUD ───────────────────────────────────────────────────
app.post('/api/materials/products', requireAdminApiAuth, async (req, res) => {
  const { name, category_id, unit_price, price, unit, target_qty, group_price } = req.body;
  const actualPrice = price || unit_price || 0;
  try {
    const [r] = await pool.query(
      'INSERT INTO material_products (name, category_id, price, unit, target_qty, group_price, current_qty) VALUES (?,?,?,?,?,?,?)',
      [name, category_id||1, actualPrice, unit||'吨', target_qty||0, group_price||0, 0]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/materials/products/:id', requireAdminApiAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM material_products WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function installProcessHandlers(server) {
  const shutdown = async (signal) => {
    console.log(`[Shutdown] Received ${signal}, closing server...`);
    server.close(async () => {
      try {
        await pool.end();
      } catch (err) {
        console.error('[Shutdown] DB pool close failed:', err.message);
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    console.error('[UnhandledRejection]', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[UncaughtException]', err);
  });
}

async function bootstrap() {
  const adminBootstrap = await ensureDefaultAdmin(pool);
  if (adminBootstrap.created) {
    console.log(`[Bootstrap] Default admin created: ${adminBootstrap.username}`);
  } else if (adminBootstrap.synced) {
    console.log(`[Bootstrap] Default admin password upgraded for: ${adminBootstrap.username}`);
  }

  await syncDefaultBusinessData();

  const server = app.listen(PORT, () => {
    console.log(`--- Backend Server Running on http://localhost:${PORT} ---`);
    console.log(`--- Admin UI: http://localhost:${PORT}/admin ---`);
  });

  installProcessHandlers(server);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal error:', err);
  process.exit(1);
});

