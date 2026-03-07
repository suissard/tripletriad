const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front', 'src', 'game', 'state.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add new state variables
const stateVarReplacement = `
    winner: null,
    gameState: 'menu',
    pHealth: 20,
    aiHealth: 20,
    pMana: 1,
    pMaxMana: 1,
    aiMana: 1,
    aiMaxMana: 1,
    actionLog: [],
    aiDifficulty: 1,`;

code = code.replace(/winner: null,\s*gameState: 'menu',\s*aiDifficulty: 1,/, stateVarReplacement.trim());


// 2. Add reset lines to resetGame
const resetReplacement = `
    state.gameOver = false;
    state.winner = null;
    state.gameState = 'menu';
    state.pHealth = 20;
    state.aiHealth = 20;
    state.pMaxMana = 1;
    state.aiMaxMana = 1;
    state.pMana = 1;
    state.aiMana = 1;
    state.actionLog = [];
}
`;
code = code.replace(/state\.gameOver = false;\s*state\.winner = null;\s*state\.gameState = 'menu';\s*}/, resetReplacement.trim());

fs.writeFileSync(filePath, code, 'utf8');
console.log('patched');
