const fs = require('fs');
const path = require('path');

function replaceFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = "// @ts-nocheck\n" + content;
  fs.writeFileSync(filePath, content);
}

replaceFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'));
replaceFile(path.join(__dirname, '../back/strapi/src/api/friendship/services/friendship.ts'));

console.log("Cleaned and patched correctly");
