const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'front', 'src', 'game', 'state.js');

let code = fs.readFileSync(file, 'utf8');

code = code.replace('\nwindow.__gameState = state; // EXPOSED FOR PLAYWRIGHT\n', '');

fs.writeFileSync(file, code);
