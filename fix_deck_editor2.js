import fs from 'fs';

const path = 'front/src/components/DeckEditorPage.vue';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('userStore.strapiConnected')) {
  console.log('Error: strapiConnected not injected correctly in DeckEditorPage.vue');
} else {
  console.log('DeckEditorPage.vue ok');
}
