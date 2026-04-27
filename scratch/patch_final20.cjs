const fs = require('fs');
const path = require('path');

let controllerPath = path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts');
let content = fs.readFileSync(controllerPath, 'utf8');

// Use proper ts-ignore or properly cast ONLY the `strapi.entityService` parts, BUT we have to be careful with replace all
content = content.replace(/strapi\.entityService\.([a-zA-Z]+)/g, "(strapi as any).entityService.$1");

// Then cast existingFriendships array
content = content.replace(/if \(existingFriendships\.length > 0\)/g, "if ((existingFriendships as any[]).length > 0)");
content = content.replace(/const existing = existingFriendships\[0\];/g, "const existing = (existingFriendships as any[])[0];");

// Cast friendship object
content = content.replace(/friendship\.receiver/g, "(friendship as any).receiver");
content = content.replace(/friendship\.requester/g, "(friendship as any).requester");
content = content.replace(/friendship\.status/g, "(friendship as any).status");

fs.writeFileSync(controllerPath, content);
