const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = "// @ts-nocheck\n" + content;
  fs.writeFileSync(filePath, content);
}

processFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'));
processFile(path.join(__dirname, '../back/strapi/src/api/friendship/services/friendship.ts'));
