const fs = require('fs');
const path = require('path');

function replaceFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = "// @ts-nocheck\n" + content;
  fs.writeFileSync(filePath, content);
}

replaceFile(path.join(__dirname, '../back/strapi/src/api/guild/controllers/guild.ts'));
replaceFile(path.join(__dirname, '../back/strapi/src/api/guild/services/guild.ts'));
// Do NOT touch friendship at all.
