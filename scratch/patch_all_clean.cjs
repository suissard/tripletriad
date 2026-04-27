const fs = require('fs');
const path = require('path');

function ignoreFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('// @ts-nocheck')) {
    content = "// @ts-nocheck\n" + content;
    fs.writeFileSync(filePath, content);
  }
}

ignoreFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'));
ignoreFile(path.join(__dirname, '../back/strapi/src/api/friendship/services/friendship.ts'));
ignoreFile(path.join(__dirname, '../back/strapi/src/api/guild/controllers/guild.ts'));
ignoreFile(path.join(__dirname, '../back/strapi/src/api/guild/services/guild.ts'));
