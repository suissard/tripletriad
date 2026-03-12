import fs from 'fs';

const path = 'front/src/components/GameView.vue';
let content = fs.readFileSync(path, 'utf8');

// Ensure GameView uses standard layout style for mobile
const replacement = `
@media (max-width: 900px) {
  .game-layout {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px;
    gap: 4px;
    overflow: hidden;
  }

  .side-panel {
    flex-direction: row;
    min-width: unset;
    width: 100%;
    justify-content: center;
    gap: 8px;
    padding: 5px;
  }

  .arena {
    transform: scale(0.85);
    margin: -15px 0;
  }
}
`;

content = content.replace(/@media \(max-width: 900px\) {[\s\S]*?}/, replacement.trim());

fs.writeFileSync(path, content);
console.log('GameView mobile layout adjusted');
