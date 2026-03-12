import fs from 'fs';

const path = 'front/src/App.vue';
let content = fs.readFileSync(path, 'utf8');

// Also checking if App.vue has routing logic that messes with gameState
if (content.includes('state.gameState =')) {
  console.log('App.vue sets gameState');
} else {
  console.log('App.vue does not set gameState directly');
}
