const fs = require('fs');

const path = 'front/src/game/TurnManager.js';
let content = fs.readFileSync(path, 'utf8');

// The original emit: gameEvents.emit('CARD_PLACED', { action, captures: this.state.lastCaptures || [] });
// We want to add emit for captures, turn start, and game over.

// Function to replace and add new events
function injectEvents(str) {
  return str.replace(
    /gameEvents\.emit\('CARD_PLACED', \{ action, captures: this\.state\.lastCaptures \|\| \[\] \}\);/g,
    `gameEvents.emit('CARD_PLACED', { action, captures: this.state.lastCaptures || [] });

    // Emettre l'événement de capture si applicable
    if (this.state.lastCaptures && this.state.lastCaptures.length > 0) {
      gameEvents.emit('CARD_CAPTURED', {
        count: this.state.lastCaptures.length,
        capturer: action.player
      });
    }

    // Emettre l'événement de fin de partie ou de début de tour
    if (this.state.isFinished) {
      gameEvents.emit('GAME_OVER', { winner: this.state.winner });
    } else {
      gameEvents.emit('TURN_START', { player: this.state.currentPlayer });
    }`
  );
}

content = injectEvents(content);
fs.writeFileSync(path, content);
console.log('TurnManager patched with additional events.');
