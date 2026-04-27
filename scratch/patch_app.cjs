const fs = require('fs');
const path = require('path');

const appVuePath = path.join(__dirname, '../front/src/App.vue');
let content = fs.readFileSync(appVuePath, 'utf8');

if (!content.includes('ChatWidget')) {
  // Add import
  content = content.replace(
    "import LeftDrawer from './components/LeftDrawer.vue';",
    "import LeftDrawer from './components/LeftDrawer.vue';\nimport ChatWidget from './components/ChatWidget.vue';"
  );

  // Add component
  content = content.replace(
    "<FpsCounter />",
    "<FpsCounter />\n    <ChatWidget />"
  );

  fs.writeFileSync(appVuePath, content);
  console.log("Patched App.vue");
} else {
  console.log("Already patched");
}
