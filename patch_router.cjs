const fs = require('fs');

const path = 'front/src/router/index.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('SeedTesterPage')) {
  // Add import
  content = content.replace(
    "import CardTestPage from '../components/CardTestPage.vue'",
    "import CardTestPage from '../components/CardTestPage.vue'\nimport SeedTesterPage from '../components/SeedTesterPage.vue'"
  );

  // Add route
  content = content.replace(
    "{ path: '/test-card', component: CardTestPage },",
    "{ path: '/test-card', component: CardTestPage },\n  { path: '/test-seed', component: SeedTesterPage },"
  );

  fs.writeFileSync(path, content, 'utf8');
  console.log('Router updated.');
} else {
  console.log('Router already contains SeedTesterPage.');
}
