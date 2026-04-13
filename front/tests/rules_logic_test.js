import assert from 'node:assert';
import { rulesRegistry } from '../src/game/rules.js';

const sameRule = rulesRegistry.find(r => r.id === 'same');
const plusRule = rulesRegistry.find(r => r.id === 'plus');

console.log('🚀 Running minimalist tests for rules logic...');

try {
    console.log('Testing "Same" rule...');
    assert.ok(sameRule, 'Same rule should be defined');

    // Scenario: Same with 2 matches (Capture)
    const centerSame2 = { data: { top: 5, right: 3, bottom: 2, left: 8 } };
    const neighborsSame2 = [
        { i: 1, dir: 'top', opp: 'bottom' },
        { i: 5, dir: 'right', opp: 'left' }
    ];
    const boardSame2 = {
        1: { data: { bottom: 5 } }, // matches center.top
        5: { data: { left: 3 } }    // matches center.right
    };
    const resultSame2 = sameRule.execute(centerSame2, neighborsSame2, boardSame2);
    assert.strictEqual(resultSame2.triggered, true, 'Same should trigger with 2 matches');
    assert.strictEqual(resultSame2.captures.length, 2, 'Should capture 2 cards');
    assert.strictEqual(resultSame2.alertMessage, "SAME!");

    // Scenario: Same with 1 match (No Capture)
    const boardSame1 = {
        1: { data: { bottom: 5 } }, // matches center.top
        5: { data: { left: 9 } }    // NO match
    };
    const resultSame1 = sameRule.execute(centerSame2, neighborsSame2, boardSame1);
    assert.strictEqual(resultSame1.triggered, false, 'Same should NOT trigger with 1 match');
    assert.strictEqual(resultSame1.captures.length, 0, 'Should capture 0 cards');

    // Scenario: Same with 3 matches (Capture)
    const neighborsSame3 = [
        { i: 1, dir: 'top', opp: 'bottom' },
        { i: 5, dir: 'right', opp: 'left' },
        { i: 7, dir: 'bottom', opp: 'top' }
    ];
    const boardSame3 = {
        1: { data: { bottom: 5 } },
        5: { data: { left: 3 } },
        7: { data: { top: 2 } }
    };
    const resultSame3 = sameRule.execute(centerSame2, neighborsSame3, boardSame3);
    assert.strictEqual(resultSame3.triggered, true, 'Same should trigger with 3 matches');
    assert.strictEqual(resultSame3.captures.length, 3, 'Should capture 3 cards');

    console.log('Testing "Plus" rule...');
    assert.ok(plusRule, 'Plus rule should be defined');

    // Scenario: Plus with 2 matches (Capture)
    // sum = center[dir] + adj[opp]
    // center: {top: 5, right: 3, ...}
    // adj1: {bottom: 5} -> sum = 5 + 5 = 10
    // adj2: {left: 7} -> sum = 3 + 7 = 10
    const centerPlus2 = { data: { top: 5, right: 3, bottom: 2, left: 8 } };
    const neighborsPlus2 = [
        { i: 1, dir: 'top', opp: 'bottom' },
        { i: 5, dir: 'right', opp: 'left' }
    ];
    const boardPlus2 = {
        1: { data: { bottom: 5 } }, // sum = 10
        5: { data: { left: 7 } }    // sum = 10
    };
    const resultPlus2 = plusRule.execute(centerPlus2, neighborsPlus2, boardPlus2);
    assert.strictEqual(resultPlus2.triggered, true, 'Plus should trigger with 2 matches of same sum');
    assert.strictEqual(resultPlus2.captures.length, 2, 'Should capture 2 cards');
    assert.strictEqual(resultPlus2.alertMessage, "PLUS!");

    // Scenario: Plus with different sums (No Capture)
    const boardPlusDiff = {
        1: { data: { bottom: 5 } }, // sum = 10
        5: { data: { left: 8 } }    // sum = 11
    };
    const resultPlusDiff = plusRule.execute(centerPlus2, neighborsPlus2, boardPlusDiff);
    assert.strictEqual(resultPlusDiff.triggered, false, 'Plus should NOT trigger with different sums');
    assert.strictEqual(resultPlusDiff.captures.length, 0, 'Should capture 0 cards');

    // Scenario: Plus with 3 matches of same sum (Capture)
    const neighborsPlus3 = [
        { i: 1, dir: 'top', opp: 'bottom' },
        { i: 5, dir: 'right', opp: 'left' },
        { i: 7, dir: 'bottom', opp: 'top' }
    ];
    const boardPlus3 = {
        1: { data: { bottom: 5 } }, // sum = 10
        5: { data: { left: 7 } },    // sum = 10
        7: { data: { top: 8 } }      // sum = 2 + 8 = 10
    };
    const resultPlus3 = plusRule.execute(centerPlus2, neighborsPlus3, boardPlus3);
    assert.strictEqual(resultPlus3.triggered, true, 'Plus should trigger with 3 matches of same sum');
    assert.strictEqual(resultPlus3.captures.length, 3, 'Should capture 3 cards');

    console.log('✅ All rules logic tests passed!');
} catch (error) {
    console.error('❌ Rules logic tests failed:');
    console.error(error.message);
    process.exit(1);
}
