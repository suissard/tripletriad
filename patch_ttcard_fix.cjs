const fs = require('fs');
const file = 'front/src/components/TripleTriadCard.vue';
let content = fs.readFileSync(file, 'utf8');

const findDoubleStore = `const userStore = useUserStore();

const displayCard = computed(() => {`;

const replaceDoubleStore = `const displayCard = computed(() => {`;

content = content.replace(findDoubleStore, replaceDoubleStore);

fs.writeFileSync(file, content);
