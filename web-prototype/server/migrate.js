// backend/migrate.js
const pool = require('./db');

const migrate = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('--- Database Migration Started ---');

    // ─── 1. Steel Factories ───────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS steel_factories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      tags TEXT,
      status VARCHAR(50),
      status_color VARCHAR(20),
      orders VARCHAR(50),
      weekly_capacity VARCHAR(50),
      condition_text VARCHAR(100),
      condition_color VARCHAR(20),
      month_total VARCHAR(50),
      month_remain VARCHAR(50),
      percentage FLOAT,
      timeline_status VARCHAR(50)
    )`);

    await connection.query(`CREATE TABLE IF NOT EXISTS steel_timeline (
      id INT AUTO_INCREMENT PRIMARY KEY,
      factory_id INT,
      name VARCHAR(50),
      theme VARCHAR(20),
      FOREIGN KEY (factory_id) REFERENCES steel_factories(id) ON DELETE CASCADE
    )`);

    // ─── 2. Concrete Stations ─────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS concrete_stations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      distance VARCHAR(20),
      lat DECIMAL(10,7) DEFAULT NULL,
      lng DECIMAL(10,7) DEFAULT NULL,
      status VARCHAR(50),
      status_color VARCHAR(20),
      price DECIMAL(10,2),
      capacity INT,
      weekly_quota INT,
      sold_qty INT,
      days_left INT,
      grades TEXT,
      tags TEXT,
      condition_text VARCHAR(100),
      condition_color VARCHAR(20),
      timeline_status VARCHAR(50),
      percentage FLOAT
    )`);

    // ─── 3. Materials ─────────────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS material_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT,
      name VARCHAR(100),
      mfr VARCHAR(100),
      model VARCHAR(200),
      price DECIMAL(10,2),
      group_price DECIMAL(10,2),
      target_qty INT,
      current_qty INT,
      unit VARCHAR(20),
      img VARCHAR(50),
      transport VARCHAR(50)
    )`);

    // ─── 4. Admin Users ───────────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE,
      password VARCHAR(255),
      role VARCHAR(20) DEFAULT 'operator',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // ─── 5. Platform Settings (key-value) ─────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS platform_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      label VARCHAR(200),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // ─── 6. Homepage Featured Quotes ─────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS homepage_quotes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_name VARCHAR(100),
      price DECIMAL(10,2),
      unit VARCHAR(20),
      effective_time DATETIME,
      tags TEXT,
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // ─── 7. App Users ─────────────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS app_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      openid VARCHAR(100) UNIQUE,
      phone VARCHAR(20),
      real_name VARCHAR(50),
      company VARCHAR(100),
      role ENUM('buyer','admin','superadmin') DEFAULT 'buyer',
      avatar_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL
    )`);

    // ─── 8. User Addresses ──────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS user_addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      label VARCHAR(50),
      province VARCHAR(50),
      city VARCHAR(50),
      district VARCHAR(50),
      detail VARCHAR(200),
      lat DECIMAL(10,7) DEFAULT NULL,
      lng DECIMAL(10,7) DEFAULT NULL,
      contact_name VARCHAR(50),
      contact_phone VARCHAR(20),
      is_default TINYINT(1) DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    )`);

    // ─── 8.5 User Projects ───────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS user_projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      company VARCHAR(100),
      addr VARCHAR(300),
      invoice_title VARCHAR(100),
      invoice_tax_id VARCHAR(50),
      bank VARCHAR(100),
      bank_account VARCHAR(50),
      contact_phone VARCHAR(20),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    )`);

    // ─── 9. Orders ────────────────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_no VARCHAR(30) UNIQUE NOT NULL,
      user_id INT,
      order_type ENUM('concrete','steel','materials') NOT NULL,
      status ENUM('pending','confirmed','delivering','completed','cancelled') DEFAULT 'pending',
      total_amount DECIMAL(12,2),
      delivery_address VARCHAR(300),
      delivery_lat DECIMAL(10,7) DEFAULT NULL,
      delivery_lng DECIMAL(10,7) DEFAULT NULL,
      remark TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL
    )`);

    // ─── 10. Order Items ──────────────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_name VARCHAR(100),
      product_spec VARCHAR(200),
      unit VARCHAR(20),
      qty DECIMAL(10,2),
      unit_price DECIMAL(10,2),
      subtotal DECIMAL(12,2),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    // ─── 11. Order Tracking Nodes ─────────────────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS order_tracking_nodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      node_name VARCHAR(100),
      status ENUM('pending','processing','completed') DEFAULT 'pending',
      event_time DATETIME DEFAULT NULL,
      sort_order INT DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    // ─── 12. Inquiry Log (for homepage stats) ────────────────────────────────
    await connection.query(`CREATE TABLE IF NOT EXISTS inquiry_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      inquiry_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // ═══════════════════════════════════════════════════════════════════════
    // SEEDS
    // ═══════════════════════════════════════════════════════════════════════

    // Seed Admin Users (without role column if not exists)
    try {
      await connection.query(`INSERT IGNORE INTO admin_users (username, password) VALUES
        ('admin', '<REDACTED_ADMIN_PASSWORD>'),
        ('operator', 'op123456')
      `);
    } catch (e) {
      console.log('Admin users seed skipped (may already exist or role column missing)');
    }

    // Seed Platform Settings
    const settingsData = [
      ['partner_concrete_stations', '7', '合作商砼站数量'],
      ['shared_steel_factories',    '5', '共享钢构厂数量'],
      ['wechat_kefu_id',            'gxgg99', '微信客服号'],
      ['phone_kefu',                '400-888-9999', '电话客服号码'],
      ['factory_address',           '郑州市二七区马寨经济开发区', '工厂地址'],
      ['factory_area',              '180亩', '工厂占地面积'],
      ['factory_workshop',          '4万平方米现代化车间', '车间面积'],
      ['factory_annual_output',     '年产10万吨', '年产能'],
      ['response_label',            '7x12 人工响应', '响应服务标签'],
      ['fulfillment_rate',          '98%', '订单履约率'],
      ['steel_base_price_per_ton',  '99', '钢构基础加工费(元/吨)']
    ];
    for (const [k, v, l] of settingsData) {
      await connection.query(
        `INSERT IGNORE INTO platform_settings (setting_key, setting_value, label) VALUES (?, ?, ?)`,
        [k, v, l]
      );
    }

    // Seed Homepage Quotes
    const [hq] = await connection.query('SELECT count(*) as count FROM homepage_quotes');
    if (hq[0].count === 0) {
      await connection.query(`INSERT INTO homepage_quotes
        (product_name, price, unit, effective_time, tags, is_active, sort_order) VALUES
        ('C35 商品混凝土', 405.00, 'm³', '2026-03-16 10:00:00', '含运费,含税,不含泵费', 1, 1),
        ('C30 商品混凝土', 385.00, 'm³', '2026-03-16 10:00:00', '含运费,含税,不含泵费', 1, 2),
        ('P.O 42.5 散装水泥', 340.00, '吨',  '2026-03-16 08:00:00', '含税,到厂价', 1, 3)
      `);
    }

    // Seed Steel Factories
    const [factories] = await connection.query('SELECT count(*) as count FROM steel_factories');
    if (factories[0].count === 0) {
      const [f1] = await connection.query(
        `INSERT INTO steel_factories (name,tags,status,status_color,orders,weekly_capacity,condition_text,condition_color,month_total,month_remain,percentage,timeline_status)
         VALUES ('马寨主厂·精益产线','龙门埋弧焊,数控下料,抛丸涂装','紧张接单','#FFB74D','本月已接 28 单','480吨/周','排期火热','#FFB74D','600吨','210吨',65,'紧张')`
      );
      await connection.query(
        `INSERT INTO steel_timeline (factory_id,name,theme) VALUES (?,?,?),(?,?,?),(?,?,?)`,
        [f1.insertId,'上旬 (排程)','warning', f1.insertId,'中旬 (可订)','available', f1.insertId,'下旬 (空闲)','available']
      );
      const [f2] = await connection.query(
        `INSERT INTO steel_factories (name,tags,status,status_color,orders,weekly_capacity,condition_text,condition_color,month_total,month_remain,percentage,timeline_status)
         VALUES ('经开区分厂·重型产线','H型钢组立,重型焊接,大跨度桁架','空档可接','#81C784','本月已接 12 单','320吨/周','产能充裕','#81C784','400吨','280吨',30,'宽松')`
      );
      await connection.query(
        `INSERT INTO steel_timeline (factory_id,name,theme) VALUES (?,?,?),(?,?,?),(?,?,?)`,
        [f2.insertId,'上旬 (排程)','warning', f2.insertId,'中旬 (可订)','available', f2.insertId,'下旬 (空闲)','available']
      );
    }

    // Seed Concrete Stations
    const [stations] = await connection.query('SELECT count(*) as count FROM concrete_stations');
    if (stations[0].count === 0) {
      await connection.query(`INSERT INTO concrete_stations
        (name,distance,lat,lng,status,status_color,price,capacity,weekly_quota,sold_qty,grades,tags,condition_text,condition_color,timeline_status,percentage) VALUES
        ('江北建材站','4.8km',34.8831,113.6247,'在产正常','#81C784',385,500,5000,4680,'C20,C25,C30,C35,C40,C30P6','120型双核机组,环保A级,24H可打','额度紧张','#FFB74D','紧张',94),
        ('港区东站','5.1km',34.9215,113.7802,'在产正常','#81C784',380,500,5000,3200,'C20,C25,C30,C35,C30P8','大产能站,配送半径20km','正常供应','#81C784','正常',64),
        ('二七区马寨主站','3.2km',34.6891,113.5634,'在产正常','#81C784',390,300,3000,2100,'C20,C25,C30,C40','靠近市区,老牌主站','正常供应','#81C784','正常',70),
        ('惠济区站','8.6km',34.9423,113.6015,'在产正常','#81C784',375,400,4000,1800,'C20,C25,C30,C35','北部配送优先','正常供应','#81C784','正常',45),
        ('高新区西站','6.3km',34.7562,113.5123,'环保限产','#FFB74D',395,200,2000,1900,'C25,C30,C35','限产中,优先VIP','额度告急','#E53935','紧张',95)
      `);
    }

    // Seed Materials
    const [prods] = await connection.query('SELECT count(*) as count FROM material_products');
    if (prods[0].count === 0) {
      await connection.query(`INSERT INTO material_products
        (category_id,name,mfr,model,price,group_price,target_qty,current_qty,unit,img,transport) VALUES
        (0,'优质河沙','信阳淮河矿区','水洗中砂 细度2.3-3.0',95,82,5000,3200,'吨','🏖️','船运'),
        (0,'机制砂','郑州本地矿','5-10mm 含粉量<5%',75,68,3000,2100,'吨','⛏️','汽运'),
        (1,'散装水泥 P.O 42.5','天瑞集团','普通硅酸盐散装',340,310,5000,3800,'吨','🏗️','火车'),
        (1,'袋装水泥 P.O 42.5','中联水泥','50kg/袋 普通硅酸盐',380,355,2000,1500,'吨','📦','汽运'),
        (2,'HRB400 螺纹钢 Φ16','中天钢铁','HRB400E 国标',3850,3720,500,320,'吨','🔩','汽运'),
        (2,'HRB400 螺纹钢 Φ20','中天钢铁','HRB400E 国标',3820,3700,500,280,'吨','🔩','汽运')
      `);
    }

    // Seed Demo App User
    const [users] = await connection.query('SELECT count(*) as count FROM app_users');
    if (users[0].count === 0) {
      const [u] = await connection.query(
        `INSERT INTO app_users (openid,phone,real_name,company,role) VALUES
         ('demo_openid_001','13800138000','李标','河南省标杰建设工程有限公司','buyer'),
         ('demo_openid_admin','13900000001','张管理','99共享建材','admin')`
      );
      // Seed address for demo user
      await connection.query(
        `INSERT INTO user_addresses (user_id,label,province,city,district,detail,lat,lng,contact_name,contact_phone,is_default)
         VALUES (1,'新郑机场项目','河南省','郑州市','二七区','科技路13号 新郑机场T3项目A区',34.7198,113.5908,'李标','13800138000',1)`
      );
    }

    // Seed Demo Orders
    const [ords] = await connection.query('SELECT count(*) as count FROM orders');
    if (ords[0].count === 0) {
      // Concrete order
      const [o1] = await connection.query(
        `INSERT INTO orders (order_no,user_id,order_type,status,total_amount,delivery_address,created_at)
         VALUES ('XC20260316001',1,'concrete','delivering',11550.00,'郑州市二七区大学路项目A区','2026-03-16 08:30:00')`
      );
      await connection.query(
        `INSERT INTO order_items (order_id,product_name,product_spec,unit,qty,unit_price,subtotal)
         VALUES (?,?,?,?,?,?,?)`,
        [o1.insertId,'C30 商品混凝土','塌落度180±20mm','m³',30,385,11550]
      );
      await connection.query(
        `INSERT INTO order_tracking_nodes (order_id,node_name,status,event_time,sort_order) VALUES
         (?,?,?,?,?),(?,?,?,?,?),(?,?,?,?,?),(?,?,?,?,?)`,
        [
          o1.insertId,'支付锁单','completed','2026-03-16 08:30:00',1,
          o1.insertId,'站点接单排产','completed','2026-03-16 09:00:00',2,
          o1.insertId,'混凝土出站装车','completed','2026-03-16 12:00:00',3,
          o1.insertId,'运输中/预计到场','processing','2026-03-16 14:00:00',4
        ]
      );
      // Materials order
      const [o2] = await connection.query(
        `INSERT INTO orders (order_no,user_id,order_type,status,total_amount,delivery_address,created_at)
         VALUES ('XM20260316002',1,'materials','completed',5720.00,'郑州市二七区大学路项目A区','2026-03-15 10:00:00')`
      );
      await connection.query(
        `INSERT INTO order_items (order_id,product_name,product_spec,unit,qty,unit_price,subtotal)
         VALUES (?,?,?,?,?,?,?)`,
        [o2.insertId,'P.O 42.5 水泥','散装','吨',200,28.6,5720]
      );
      await connection.query(
        `INSERT INTO order_tracking_nodes (order_id,node_name,status,event_time,sort_order) VALUES
         (?,?,?,?,?),(?,?,?,?,?),(?,?,?,?,?)`,
        [
          o2.insertId,'支付成功','completed','2026-03-15 10:00:00',1,
          o2.insertId,'仓库备货发运','completed','2026-03-15 14:00:00',2,
          o2.insertId,'已签收确认','completed','2026-03-16 09:30:00',3
        ]
      );
    }

    console.log('--- Database Migration Completed Successfully ---');
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    connection.release();
    process.exit();
  }
};

migrate();

