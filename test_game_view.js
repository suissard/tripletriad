import fs from 'fs';
const path = 'front/src/components/GameView.vue';
const content = fs.readFileSync(path, 'utf8');
console.log(content.match(/@media \(max-width: 900px\) {[\s\S]*?}/)[0]);
