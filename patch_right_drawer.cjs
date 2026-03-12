const fs = require('fs');

const file = 'front/src/components/RightDrawer.vue';
let content = fs.readFileSync(file, 'utf8');

// The weird replace caused a newline and broken syntax:
content = content.replace(
  /<HoloButton text="🔔 Paramètres de Notification" @click="currentView = \notifications\\" \/>/g,
  '<HoloButton text="🔔 Paramètres de Notification" @click="currentView = \'notifications\'" />'
);

fs.writeFileSync(file, content);
console.log('Fixed syntax error in RightDrawer.vue');
