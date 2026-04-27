const fs = require('fs');
const path = require('path');

const permPath = path.join(__dirname, '../back/strapi/src/permissions.json');
const perms = JSON.parse(fs.readFileSync(permPath, 'utf8'));

if (!perms.Authenticated.guild) {
  perms.Authenticated.guild = {
    controllers: {
      guild: {
        find: { enabled: true },
        findOne: { enabled: true },
        join: { enabled: true },
        leave: { enabled: true }
      }
    }
  };
  fs.writeFileSync(permPath, JSON.stringify(perms, null, 2));
  console.log("Patched permissions.json");
} else {
  console.log("Already patched permissions");
}
