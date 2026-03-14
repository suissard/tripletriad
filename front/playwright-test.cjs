const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
      console.log('BROWSER CONSOLE:', msg.text());
  });

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);

  // Setup the store/state directly
  const logs = await page.evaluate(async () => {

    const { state, resetGame, initAIMatch, refillHand, getCardById, normalizeCard } = await import('/src/game/state.js');
    const { sendGameLog } = await import('/src/game/logger.js');

    window.sendGameLogArgs = [];
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        if (args[0] && args[0].includes('/webrtc/matches/')) {
            console.log("MOCKED FETCH CALLED:", args[0], args[1].body);
            window.sendGameLogArgs.push(JSON.parse(args[1].body));
            return { ok: true, json: async () => ({}) };
        }
        if (args[0] && args[0].includes('/webrtc/matches')) {
            console.log("MOCKED MATCH CREATION");
            return { ok: true, json: async () => ({}) };
        }
        return originalFetch(...args);
    };

    state.online = false;

    // Create a dummy deck
    const deckCards = [1,2,3,4,5].map(id => normalizeCard({ id, topValue: 'A', rightValue: 'A', bottomValue: 'A', leftValue: 'A' }));

    state.gameState = 'playing';
    resetGame(30, false, 'player');

    await initAIMatch();
    state.matchId = 'test-uuid';

    state.deck = [...deckCards];
    refillHand('player');
    state.deck = [...deckCards];
    refillHand('ai');

    state.pMana = 99; // Plenty of mana for test

    return new Promise((resolve) => {
        setTimeout(async () => {
            const { placeCard, selectCard, handleEndTurn } = await import('/src/game/game-actions.js');
            selectCard(0);
            await placeCard(4); // Place in center

            setTimeout(() => {
                handleEndTurn();
                setTimeout(() => resolve(window.sendGameLogArgs), 1000);
            }, 1000);
        }, 1000);
    });
  });

  console.log("Captured Logs:", JSON.stringify(logs, null, 2));

  await browser.close();
})();
