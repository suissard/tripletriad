const fs = require('fs');
const path = require('path');

const permPath = path.join(__dirname, '../back/strapi/src/permissions.json');
const perms = JSON.parse(fs.readFileSync(permPath, 'utf8'));

perms.routes["api::guild.guild.find"] = "authenticated";
perms.routes["api::guild.guild.findOne"] = "authenticated";
perms.routes["api::guild.guild.join"] = "authenticated";
perms.routes["api::guild.guild.leave"] = "authenticated";

fs.writeFileSync(permPath, JSON.stringify(perms, null, 2));
console.log("Patched permissions.json");
