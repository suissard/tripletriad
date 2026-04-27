const fs = require('fs');
const path = require('path');

const friendshipControllerPath = path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts');
const friendshipServicePath = path.join(__dirname, '../back/strapi/src/api/friendship/services/friendship.ts');

let controller = fs.readFileSync(friendshipControllerPath, 'utf8');
controller = controller.replace(/api::friendship\.friendship/g, "api::friendship.friendship' as any");
controller = controller.replace(/'api::friendship\.friendship' as any' as any/g, "'api::friendship.friendship' as any");
fs.writeFileSync(friendshipControllerPath, controller);

let service = fs.readFileSync(friendshipServicePath, 'utf8');
service = service.replace(/api::friendship\.friendship/g, "api::friendship.friendship' as any");
service = service.replace(/'api::friendship\.friendship' as any' as any/g, "'api::friendship.friendship' as any");
fs.writeFileSync(friendshipServicePath, service);

console.log("Patched friendship files");
