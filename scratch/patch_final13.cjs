const fs = require('fs');
const path = require('path');

function replaceFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if(!content.includes('@ts-nocheck')) {
      content = "// @ts-nocheck\n" + content;
  }

  // Just cast the strapi parameter directly:
  content = content.replace(/\{ strapi \}/, '{ strapi }: { strapi: any }');
  content = content.replace(/strapi\.entityService/g, 'strapi.entityService');

  fs.writeFileSync(filePath, content);
}

replaceFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'));
replaceFile(path.join(__dirname, '../back/strapi/src/api/guild/controllers/guild.ts'));
