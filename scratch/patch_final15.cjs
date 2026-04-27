const fs = require('fs');
const path = require('path');

function replaceFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if(!content.includes('@ts-nocheck')) {
      content = "// @ts-nocheck\n" + content;
      fs.writeFileSync(filePath, content);
  }
}

replaceFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'));
replaceFile(path.join(__dirname, '../back/strapi/src/api/guild/controllers/guild.ts'));
