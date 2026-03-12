import fs from 'fs';

const path = 'front/src/components/PackOpening.vue';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
const openPack = async () => {
  const currency = selectedPackType.value === 'premium' ? 'gems' : 'coins';

  if (userStore.strapiConnected && wallet.value[currency] < 100) {
    errorMessage.value = \`Pas assez de \${currency === 'gems' ? 'gemmes' : 'pièces'} !\`;
    setTimeout(() => errorMessage.value = '', 3000);
    return;
  }
`;

content = content.replace(
  "const openPack = async () => {\n  const currency = selectedPackType.value === 'premium' ? 'gems' : 'coins';\n  if (wallet.value[currency] < 100) {\n    errorMessage.value = `Pas assez de ${currency === 'gems' ? 'gemmes' : 'pièces'} !`;\n    setTimeout(() => errorMessage.value = '', 3000);\n    return;\n  }",
  replacement.trim()
);

fs.writeFileSync(path, content);
console.log('PackOpening offline fun enabled (ignored wallet checks when offline)');
