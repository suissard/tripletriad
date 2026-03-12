import fs from 'fs';

const path = 'front/src/components/PackOpening.vue';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('userStore.strapiConnected')) {
  console.log('Error: strapiConnected not injected correctly in PackOpening.vue');
} else {
  console.log('PackOpening.vue ok');
}
