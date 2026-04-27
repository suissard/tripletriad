const fs = require('fs');
const path = require('path');

const friendshipControllerPath = path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts');

let controller = fs.readFileSync(friendshipControllerPath, 'utf8');

// Use proper ts-ignore or properly cast ONLY the strapi.entityService part
controller = controller.replace(/strapi\.entityService/g, "(strapi as any).entityService");
fs.writeFileSync(friendshipControllerPath, controller);

console.log("Patched typescript errors");
