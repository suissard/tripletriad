import fs from 'fs';

const path = 'front/src/components/CollectionView.vue';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('userStore.strapiConnected')) {
  console.log('Error: strapiConnected not injected correctly in CollectionView.vue');
} else {
  console.log('CollectionView.vue ok');
}
