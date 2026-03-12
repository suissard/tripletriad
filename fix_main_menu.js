import fs from 'fs';

const path = 'front/src/components/MainMenu.vue';
let content = fs.readFileSync(path, 'utf8');

// Inside MainMenu.vue, it imports onMounted. We want to ensure state.gameState = 'menu' on mount.
// Let's find onMounted and inject the state initialization if it's missing.

if (!content.includes('state.gameState = \'menu\'')) {
  // Let's inject into onMounted
  const onMountedRegex = /onMounted\(\(\) => \{/;
  if (onMountedRegex.test(content)) {
    content = content.replace(onMountedRegex, "onMounted(() => {\n  state.gameState = 'menu';\n");
    fs.writeFileSync(path, content);
    console.log('MainMenu updated with state.gameState = "menu"');
  } else {
    console.log('Could not find onMounted, looking for alternative injection point');
  }
} else {
  // Wait, if it already contains state.gameState = 'menu', let's check where.
  console.log('state.gameState = menu is already in the file');
}
