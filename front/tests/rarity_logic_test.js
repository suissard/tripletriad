// Minimalist test script for rarity logic without external dependencies
import assert from 'node:assert';
import { DECK_SIZE, getRarity, displayVal } from '../src/game/constants.js';

console.log('🚀 Running minimalist tests for rarity logic...');

try {
    // 1. Test DECK_SIZE
    console.log('Testing DECK_SIZE...');
    assert.strictEqual(DECK_SIZE, 30, 'DECK_SIZE should be 30');

    // 2. Test displayVal
    console.log('Testing displayVal...');
    assert.strictEqual(displayVal(10), 'A', 'displayVal(10) should be "A"');
    assert.strictEqual(displayVal(5), 5, 'displayVal(5) should be 5');
    assert.strictEqual(displayVal(1), 1, 'displayVal(1) should be 1');

    // 3. Test getRarity
    console.log('Testing getRarity...');

    // Commun: sum < 20
    const communMin = getRarity({ top: 0, right: 0, bottom: 0, left: 0 }); // sum = 0
    assert.strictEqual(communMin.name, 'Commun', 'Sum 0 should be Commun');

    const communCase = getRarity({ top: 4, right: 5, bottom: 5, left: 5 }); // sum = 19
    assert.strictEqual(communCase.name, 'Commun', 'Sum 19 should be Commun');
    assert.strictEqual(communCase.color, '#4a4a4a', 'Commun color mismatch');
    assert.strictEqual(communCase.hex, 0x666666, 'Commun hex mismatch');

    // Peu Commun: 20 <= sum < 26
    const peuCommunMin = getRarity({ top: 5, right: 5, bottom: 5, left: 5 }); // sum = 20
    assert.strictEqual(peuCommunMin.name, 'Peu Commun', 'Sum 20 should be Peu Commun');
    assert.strictEqual(peuCommunMin.color, '#1b5e20', 'Peu Commun color mismatch');
    assert.strictEqual(peuCommunMin.hex, 0x2ecc71, 'Peu Commun hex mismatch');

    const peuCommunMax = getRarity({ top: 6, right: 6, bottom: 6, left: 7 }); // sum = 25
    assert.strictEqual(peuCommunMax.name, 'Peu Commun', 'Sum 25 should be Peu Commun');

    // Rare: 26 <= sum < 32
    const rareMin = getRarity({ top: 6, right: 6, bottom: 7, left: 7 }); // sum = 26
    assert.strictEqual(rareMin.name, 'Rare', 'Sum 26 should be Rare');
    assert.strictEqual(rareMin.color, '#0d47a1', 'Rare color mismatch');
    assert.strictEqual(rareMin.hex, 0x3498db, 'Rare hex mismatch');

    const rareMax = getRarity({ top: 7, right: 8, bottom: 8, left: 8 }); // sum = 31
    assert.strictEqual(rareMax.name, 'Rare', 'Sum 31 should be Rare');

    // Épique: 32 <= sum < 36
    const epiqueMin = getRarity({ top: 8, right: 8, bottom: 8, left: 8 }); // sum = 32
    assert.strictEqual(epiqueMin.name, 'Épique', 'Sum 32 should be Épique');
    assert.strictEqual(epiqueMin.color, '#4a148c', 'Épique color mismatch');
    assert.strictEqual(epiqueMin.hex, 0x9b59b6, 'Épique hex mismatch');

    const epiqueMax = getRarity({ top: 8, right: 9, bottom: 9, left: 9 }); // sum = 35
    assert.strictEqual(epiqueMax.name, 'Épique', 'Sum 35 should be Épique');

    // Légendaire: sum >= 36
    const legendaireMin = getRarity({ top: 9, right: 9, bottom: 9, left: 9 }); // sum = 36
    assert.strictEqual(legendaireMin.name, 'Légendaire', 'Sum 36 should be Légendaire');
    assert.strictEqual(legendaireMin.color, '#b8860b', 'Légendaire color mismatch');
    assert.strictEqual(legendaireMin.hex, 0xf1c40f, 'Légendaire hex mismatch');

    const legendaireHigh = getRarity({ top: 10, right: 10, bottom: 10, left: 10 }); // sum = 40
    assert.strictEqual(legendaireHigh.name, 'Légendaire', 'Sum 40 should be Légendaire');

    console.log('✅ All rarity logic tests passed!');
} catch (error) {
    console.error('❌ Rarity logic tests failed:');
    console.error(error.message);
    process.exit(1);
}
