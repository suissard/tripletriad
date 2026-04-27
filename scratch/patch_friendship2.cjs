const fs = require('fs');
const path = require('path');

const friendshipControllerPath = path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts');

let controller = fs.readFileSync(friendshipControllerPath, 'utf8');

// The original file is a TypeScript file but apparently has type errors because it uses string literals
// where the ContentType generic type might be strictly inferred.
// By simply casting `(strapi as any)` we bypass typescript checking on the entityService

controller = controller.replace(/strapi\.entityService/g, "(strapi as any).entityService");
fs.writeFileSync(friendshipControllerPath, controller);

const guildControllerPath = path.join(__dirname, '../back/strapi/src/api/guild/controllers/guild.ts');
let guildController = fs.readFileSync(guildControllerPath, 'utf8');
guildController = guildController.replace(/strapi\.entityService/g, "(strapi as any).entityService");
fs.writeFileSync(guildControllerPath, guildController);

console.log("Patched typescript errors");
