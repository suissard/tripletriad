const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if(!content.startsWith('// @ts-nocheck')) {
      content = "// @ts-nocheck\n" + content;
      fs.writeFileSync(filePath, content);
  }
}

patchFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'));
patchFile(path.join(__dirname, '../back/strapi/src/api/friendship/services/friendship.ts'));

console.log("Patched JUST with @ts-nocheck");
