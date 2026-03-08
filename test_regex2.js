const fs = require('fs');
const file = 'front/src/components/TripleTriadCard.vue';
let content = fs.readFileSync(file, 'utf8');

const oldScriptRegex = /const emit = defineEmits\(\['click', 'set-cover'\]\);[\s\S]*?emit\('click', props\.card\);\n\}/;
console.log(content.match(oldScriptRegex) ? 'Matches!' : 'No match');
