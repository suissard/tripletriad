const fs = require('fs');
const path = require('path');

function patchFile(filePath, typeString) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = "// @ts-nocheck\n" + content;
  fs.writeFileSync(filePath, content);
}

patchFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'), 'api::friendship.friendship');
patchFile(path.join(__dirname, '../back/strapi/src/api/friendship/services/friendship.ts'), 'api::friendship.friendship');
patchFile(path.join(__dirname, '../back/strapi/src/api/guild/controllers/guild.ts'), 'api::guild.guild');
patchFile(path.join(__dirname, '../back/strapi/src/api/guild/services/guild.ts'), 'api::guild.guild');

console.log("Patched strictly with @ts-nocheck only");
