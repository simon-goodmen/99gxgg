const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const releasePath = path.join(rootDir, 'release.json');
const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));

function updateJsonVersion(filePath, nextVersion) {
  const absolutePath = path.join(rootDir, filePath);
  const json = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  json.version = nextVersion;
  fs.writeFileSync(absolutePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

function updateCurrentVersionFile() {
  const content = [
    '# 当前发布版本',
    '',
    `- Version: v${release.version}`,
    `- Date: ${release.date}`,
    `- Title: ${release.title}`,
    `- Notes: [${release.notesFile}](./${release.notesFile})`,
    ''
  ].join('\n');

  fs.writeFileSync(path.join(rootDir, 'VERSION_CURRENT.md'), content, 'utf8');
}

updateJsonVersion(path.join('web-prototype', 'package.json'), release.version);
updateJsonVersion(path.join('web-prototype', 'admin', 'package.json'), release.version);
updateCurrentVersionFile();

console.log(`Release synchronized to v${release.version}`);
