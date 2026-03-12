const fs = require('fs');

const path = 'front/src/components/PackOpening.vue';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('strapiMock')) {
    content = content.replace("import { useUserStore } from '../stores/userStore.js';", "import { useUserStore } from '../stores/userStore.js';\nimport strapiMock from '../api/strapiMock.js';");
}

// Update openPack
const openPackSearch = `  try {
    const token = localStorage.getItem('tt_jwt');
    const response = await fetch('http://localhost:1337/api/booster/open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
      },
      body: JSON.stringify({ type: selectedPackType.value })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to open pack');
    }

    const data = await response.json();`;

const openPackReplace = `  try {
    let data;
    if (!userStore.strapiConnected) {
        data = strapiMock.openBooster();
        data.wallet = { coins: wallet.value.coins - (selectedPackType.value === 'classic' ? 100 : 0), gems: wallet.value.gems - (selectedPackType.value === 'premium' ? 100 : 0), dust: wallet.value.dust };
    } else {
        const token = localStorage.getItem('tt_jwt');
        const response = await fetch('http://localhost:1337/api/booster/open', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({ type: selectedPackType.value })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to open pack');
        }

        data = await response.json();
    }`;

content = content.replace(openPackSearch, openPackReplace);

fs.writeFileSync(path, content);
console.log('PackOpening.vue patched');
