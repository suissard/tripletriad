import fs from 'fs';

const path = 'front/src/components/MainMenu.vue';
let content = fs.readFileSync(path, 'utf8');

// The main issue is that we only reset state.gameState to 'menu' inside the onMounted of MainMenu,
// and we should probably also make sure `state.menuView = 'main'` is called to reset the view.

content = content.replace(
  "onMounted(() => {\n  state.gameState = 'menu';",
  "onMounted(() => {\n  state.gameState = 'menu';\n  state.menuView = 'main';"
);

fs.writeFileSync(path, content);
console.log('MainMenu menuView also initialized');
