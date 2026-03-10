const fs = require('fs');

const path = 'front/src/components/MainMenu.vue';
let content = fs.readFileSync(path, 'utf8');

const searchFn = `function openCollection() {`;
const replaceFn = `function openStory() {
  state.showStoryPage = true;
  window.history.pushState({}, '', '/story');
}

function openCollection() {`;

if (!content.includes('function openStory()')) {
    content = content.replace(searchFn, replaceFn);
}

fs.writeFileSync(path, content);
console.log('Patch fonction openStory appliqué');
