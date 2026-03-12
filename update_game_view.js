import fs from 'fs';

const path = 'front/src/components/GameView.vue';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
.game-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .game-layout { padding: 4px; justify-content: center; gap: 8px; }
  .arena { margin: 10px 0; }
}

.opponent-area, .player-area {
`;

content = content.replace('.game-layout {\n  display: flex;\n  flex-direction: column;\n  height: 100vh;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px;\n  box-sizing: border-box;\n}\n\n.opponent-area, .player-area {', replacement.trim() + '\n');

fs.writeFileSync(path, content);
console.log('GameView updated');
