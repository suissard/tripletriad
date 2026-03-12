import fs from 'fs';

const path = 'front/src/components/GameView.vue';
let content = fs.readFileSync(path, 'utf8');

// There are multiple duplicated side-panel and arena blocks after line 266, ending with extra `}`
// Let's strip out everything after the first valid `@media` block and replace it correctly.

const mediaStart = content.indexOf('@media (max-width: 900px)');
const styleEnd = content.indexOf('</style>');

const cleanMedia = `
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

content = content.substring(0, mediaStart) + cleanMedia.trim() + '\n</style>\n';

fs.writeFileSync(path, content);
console.log('GameView CSS completely fixed');
