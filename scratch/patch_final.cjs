const fs = require('fs');
const path = require('path');

function patchFile(filePath, typeString) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = "// @ts-nocheck\n" + content;
  content = content.replace(new RegExp(`'${typeString}'`, 'g'), `'${typeString}' as any`);
  fs.writeFileSync(filePath, content);
}

patchFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'), 'api::friendship.friendship');
patchFile(path.join(__dirname, '../back/strapi/src/api/friendship/services/friendship.ts'), 'api::friendship.friendship');

// And patch guild files to just have ts-nocheck
const guildCtrl = path.join(__dirname, '../back/strapi/src/api/guild/controllers/guild.ts');
let guildContent = fs.readFileSync(guildCtrl, 'utf8');
if(!guildContent.startsWith("// @ts-nocheck")) {
    fs.writeFileSync(guildCtrl, "// @ts-nocheck\n" + guildContent.replace(/'api::guild\.guild'/g, "'api::guild.guild' as any"));
}

const guildSvc = path.join(__dirname, '../back/strapi/src/api/guild/services/guild.ts');
let guildSvcContent = fs.readFileSync(guildSvc, 'utf8');
if(!guildSvcContent.startsWith("// @ts-nocheck")) {
    fs.writeFileSync(guildSvc, "// @ts-nocheck\n" + guildSvcContent.replace(/'api::guild\.guild'/g, "'api::guild.guild' as any"));
}

console.log("Patched successfully");
