import fs from 'fs';

const path = 'front/src/components/CollectionView.vue';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
function isOwned(cardId) {
  if (!userStore.strapiConnected) return true;
  return userStore.collection.some(c => c.cardId === cardId);
}

function getOwnedQuantity(cardId) {
  if (!userStore.strapiConnected) return 99;
  const owned = userStore.collection.find(c => c.cardId === cardId);
  return owned ? owned.quantity : 0;
}
`;

content = content.replace(
  /function isOwned\(cardId\) \{[\s\S]*?\}\n\nfunction getOwnedQuantity\(cardId\) \{[\s\S]*?\}/,
  replacement.trim()
);

fs.writeFileSync(path, content);
console.log('CollectionView offline collection access enabled');
