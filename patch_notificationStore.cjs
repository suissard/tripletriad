const fs = require('fs');

const path = 'front/src/stores/notificationStore.js';
let content = fs.readFileSync(path, 'utf8');

const search = `      GAME_OVER: true,`;
const replace = `      GAME_OVER: true,
      SYSTEM: true,`;

content = content.replace(search, replace);

fs.writeFileSync(path, content);
console.log('notificationStore.js patched');
