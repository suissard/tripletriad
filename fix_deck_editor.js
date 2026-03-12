import fs from 'fs';

const path = 'front/src/components/DeckEditorPage.vue';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
function isOwned(cardId) {
  if (!userStore.strapiConnected) return true; // Offline: all cards owned
  return userStore.collection.some(c => c.cardId === cardId);
}
`;

content = content.replace(
  "function isOwned(cardId) {\n  return userStore.collection.some(c => c.cardId === cardId);\n}",
  replacement.trim()
);

fs.writeFileSync(path, content);
console.log('DeckEditorPage offline collection access enabled');
