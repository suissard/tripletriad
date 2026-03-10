const fs = require('fs');

const path = 'front/src/components/MainMenu.vue';
let content = fs.readFileSync(path, 'utf8');

const search = `<div v-if="state.menuView === 'main'" class="menu-buttons">
      <HoloButton width="100%" @click="state.menuView = 'ai'">JOUER CONTRE UNE IA 🤖</HoloButton>`;

const replace = `<div v-if="state.menuView === 'main'" class="menu-buttons">
      <HoloButton width="100%" @click="openStory">MODE HISTOIRE 📖</HoloButton>
      <HoloButton width="100%" @click="state.menuView = 'ai'">JOUER CONTRE UNE IA 🤖</HoloButton>`;

if (content.includes(search)) {
    content = content.replace(search, replace);
}

fs.writeFileSync(path, content);
console.log('Patch appliqué sur le menu pour MODE HISTOIRE');
