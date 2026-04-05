const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const releasePath = path.join(rootDir, 'release.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function buildNotesFilename(version) {
  const shortVersion = String(version).replace(/\.0$/, '');
  return `VERSION_v${shortVersion}.md`;
}

function buildTemplate({ version, date, title }) {
  const shortVersion = String(version).replace(/\.0$/, '');
  return [
    '# 共享建材平台 (99gxgg)',
    '',
    '## 当前版本',
    `**Version: v${shortVersion}**`,
    '',
    '## 版本说明',
    '1. **更新点 1**：请填写本次最重要的功能或修复。',
    '2. **更新点 2**：请填写第二项关键变化。',
    '3. **更新点 3**：请填写第三项关键变化。',
    '',
    `## 最近更新记录 (${date})`,
    '- 请补充本次上传涉及的具体文件或行为变化。',
    ''
  ].join('\n');
}

function main() {
  const version = process.argv[2];
  const title = process.argv[3];
  const date = process.argv[4] || new Date().toISOString().slice(0, 10);

  if (!version) fail('用法: node scripts/create-release.js <version> "<title>" [date]');
  if (!title) fail('缺少标题。用法: node scripts/create-release.js <version> "<title>" [date]');

  const notesFile = buildNotesFilename(version);
  const notesPath = path.join(rootDir, notesFile);

  if (fs.existsSync(notesPath)) {
    fail(`版本文件已存在: ${notesFile}`);
  }

  const release = {
    version,
    date,
    notesFile,
    title
  };

  fs.writeFileSync(releasePath, `${JSON.stringify(release, null, 2)}\n`, 'utf8');
  fs.writeFileSync(notesPath, buildTemplate(release), 'utf8');

  console.log(`Created ${notesFile}`);
  console.log(`Updated release.json to v${version}`);
  console.log('Next step: node scripts/sync-release.js');
}

main();
