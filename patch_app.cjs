const fs = require('fs');

const file = 'front/src/App.vue';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('userStore.restoreAuth()')) {
    content = content.replace('initNotificationManager();', 'initNotificationManager();\n  userStore.restoreAuth();');
    fs.writeFileSync(file, content);
    console.log('Added restoreAuth() to App.vue onMounted');
}
