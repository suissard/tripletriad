const fs = require('fs');

const path = 'front/src/components/DevOptions.vue';
let content = fs.readFileSync(path, 'utf8');

// Ajouter le bouton Testeur Aléatoire après Testeur API Strapi
if (!content.includes('Testeur Aléatoire Seed')) {
  content = content.replace(
    '<button @click="openDevTestPage" style="color: #00d2ff; border-color: #00d2ff;">🧪 Testeur API Strapi</button>',
    '<button @click="openDevTestPage" style="color: #00d2ff; border-color: #00d2ff;">🧪 Testeur API Strapi</button>\n        <button @click="openSeedTestPage" style="color: #ff9900; border-color: #ff9900;">🎲 Testeur Aléatoire Seed</button>'
  );

  // Ajouter la fonction `openSeedTestPage`
  if (!content.includes('function openSeedTestPage()')) {
    content = content.replace(
      'function openDevTestPage() {',
      `function openSeedTestPage() {\n  router.push('/test-seed');\n  isOpen.value = false;\n}\n\nfunction openDevTestPage() {`
    );
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log('DevOptions updated.');
} else {
  console.log('DevOptions already contains openSeedTestPage.');
}
