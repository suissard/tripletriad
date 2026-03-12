import fs from 'fs';

const path = 'front/src/components/GameView.vue';
let content = fs.readFileSync(path, 'utf8');

// The regex might have missed nested blocks, let's manually find and replace the block
const startIdx = content.indexOf('@media (max-width: 900px) {');
if (startIdx !== -1) {
  // Find the end of this media query by counting braces
  let braceCount = 0;
  let endIdx = -1;
  let i = startIdx;

  // Find the first opening brace
  while(i < content.length && content[i] !== '{') {
    i++;
  }

  if (content[i] === '{') {
    braceCount = 1;
    i++;
    while(i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      i++;
    }
    endIdx = i;
  }

  if (endIdx !== -1) {
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
    content = content.substring(0, startIdx) + replacement.trim() + content.substring(endIdx);
    fs.writeFileSync(path, content);
    console.log('GameView media query safely replaced');
  }
}
