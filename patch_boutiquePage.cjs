const fs = require('fs');

const path = 'front/src/components/BoutiquePage.vue';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('strapiMock')) {
    content = content.replace("import strapiService from '../api/strapi.js';", "import strapiService from '../api/strapi.js';\nimport strapiMock from '../api/strapiMock.js';");
}

const userStoreImportSearch = "import { useUserStore } from '../stores/userStore.js';";
if (!content.includes(userStoreImportSearch)) {
    content = content.replace("<script setup>", "<script setup>\nimport { useUserStore } from '../stores/userStore.js';\nconst userStore = useUserStore();");
}

const openBoosterSearch = `  try {
    const response = await strapiService.request('POST', '/booster/open');`;

const openBoosterReplace = `  try {
    let response;
    if (!userStore.strapiConnected) {
        response = strapiMock.openBooster();
        userStore.user.coins -= boosterCost.value;
        userStore.syncLocalUserWallets();
    } else {
        response = await strapiService.request('POST', '/booster/open');
    }`;

content = content.replace(openBoosterSearch, openBoosterReplace);

fs.writeFileSync(path, content);
console.log('BoutiquePage.vue patched');
