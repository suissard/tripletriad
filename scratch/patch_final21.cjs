const fs = require('fs');
const path = require('path');

function replaceFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Let's just cast `id` and bypass all problems
  content = content.replace(/strapi\.entityService\.([a-zA-Z]+)\('api::friendship\.friendship'/g, "strapi.entityService.$1('api::friendship.friendship' as any");

  fs.writeFileSync(filePath, content);
}

replaceFile(path.join(__dirname, '../back/strapi/src/api/friendship/controllers/friendship.ts'));
replaceFile(path.join(__dirname, '../back/strapi/src/api/friendship/services/friendship.ts'));

console.log("Replaced");
