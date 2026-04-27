const fs = require('fs');
const path = require('path');

const permPath = path.join(__dirname, '../back/strapi/src/permissions.json');
const perms = JSON.parse(fs.readFileSync(permPath, 'utf8'));

perms.routes["api::chat-message.chat-message.find"] = "authenticated";
perms.routes["api::chat-message.chat-message.sendMessage"] = "authenticated";
perms.routes["api::chat-message.chat-message.getMessages"] = "authenticated";

fs.writeFileSync(permPath, JSON.stringify(perms, null, 2));
console.log("Patched permissions.json for chat");
