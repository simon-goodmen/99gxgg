const fs = require('fs');
const path = require('path');
const pool = require('./db');

const outputDir = path.resolve(__dirname, '../../miniprogram/data');

function writeModule(filename, data) {
  const target = path.join(outputDir, filename);
  const content = `module.exports = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(target, content, 'utf8');
}

async function exportHomeData() {
  const [settingsRows] = await pool.query('SELECT setting_key, setting_value, label FROM platform_settings');
  const settings = {};
  settingsRows.forEach((row) => {
    settings[row.setting_key] = { value: row.setting_value, label: row.label };
  });

  const [statsRows] = await pool.query(
    "SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('partner_concrete_stations','shared_steel_factories','fulfillment_rate','phone_kefu')"
  );
  const statsMap = {};
  statsRows.forEach((row) => { statsMap[row.setting_key] = row.setting_value; });

  return {
    generatedAt: new Date().toISOString(),
    settings,
    stats: {
      shared_steel_factories: statsMap.shared_steel_factories || '0',
      partner_concrete_stations: statsMap.partner_concrete_stations || '0',
      fulfillment_rate: statsMap.fulfillment_rate || '0%',
      phone_kefu: statsMap.phone_kefu || '400-888-9999'
    }
  };
}

async function exportSteelData() {
  const [factories] = await pool.query('SELECT * FROM steel_factories ORDER BY id');
  for (const factory of factories) {
    const [timeline] = await pool.query(
      'SELECT * FROM steel_timeline WHERE factory_id = ? ORDER BY id',
      [factory.id]
    );
    factory.tags = factory.tags ? factory.tags.split(',') : [];
    factory.timelineBlocks = timeline;
  }
  return { generatedAt: new Date().toISOString(), factories };
}

async function exportConcreteData() {
  const [stations] = await pool.query('SELECT * FROM concrete_stations ORDER BY id');
  stations.forEach((station) => {
    station.grades = station.grades ? station.grades.split(',') : [];
    station.tags = station.tags ? station.tags.split(',') : [];
    try {
      station.grade_prices = station.grade_prices ? JSON.parse(station.grade_prices) : {};
    } catch {
      station.grade_prices = {};
    }
  });
  return { generatedAt: new Date().toISOString(), stations };
}

async function exportMaterialsData() {
  const [products] = await pool.query('SELECT * FROM material_products ORDER BY category_id, id');
  return { generatedAt: new Date().toISOString(), products };
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const [home, steel, concrete, materials] = await Promise.all([
    exportHomeData(),
    exportSteelData(),
    exportConcreteData(),
    exportMaterialsData()
  ]);

  writeModule('home.js', home);
  writeModule('steel.js', steel);
  writeModule('concrete.js', concrete);
  writeModule('materials.js', materials);

  console.log('Mini-program static data exported to:', outputDir);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
