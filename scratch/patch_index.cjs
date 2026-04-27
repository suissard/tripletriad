const fs = require('fs');
const path = require('path');

const indexTsPath = path.join(__dirname, '../back/strapi/src/index.ts');
let indexTs = fs.readFileSync(indexTsPath, 'utf8');

// Import bootstrap function
if (!indexTs.includes('bootstrapGuild')) {
  indexTs = indexTs.replace(
    "import { initSocketIO } from \"./socketio\";",
    "import { initSocketIO } from \"./socketio\";\nimport { bootstrapGuild } from \"./api/guild/services/guild-bootstrap\";"
  );

  // Add bootstrap call
  indexTs = indexTs.replace(
    "await strapi.service('api::story.story-bootstrap').bootstrapStories();",
    "await strapi.service('api::story.story-bootstrap').bootstrapStories();\n      await bootstrapGuild(strapi);"
  );

  fs.writeFileSync(indexTsPath, indexTs);
  console.log("Patched index.ts to bootstrap guild.");
} else {
  console.log("Already patched.");
}
