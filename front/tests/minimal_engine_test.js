// Minimalist test script without external dependencies
import assert from 'node:assert';
import { getNeighbors } from '../src/game/getNeighbors.js';

console.log('🚀 Running minimalist tests for getNeighbors...');

try {
    // Test Index 0 (Top-Left Corner)
    const n0 = getNeighbors(0);
    assert.strictEqual(n0.length, 2, 'Index 0 should have 2 neighbors');
    assert.ok(n0.find(n => n.i === 3 && n.dir === 'bottom'), 'Index 0 should have neighbor at index 3 (bottom)');
    assert.ok(n0.find(n => n.i === 1 && n.dir === 'right'), 'Index 0 should have neighbor at index 1 (right)');

    // Test Index 4 (Center)
    const n4 = getNeighbors(4);
    assert.strictEqual(n4.length, 4, 'Index 4 should have 4 neighbors');
    assert.ok(n4.find(n => n.i === 1 && n.dir === 'top'), 'Index 4 should have neighbor at index 1 (top)');
    assert.ok(n4.find(n => n.i === 7 && n.dir === 'bottom'), 'Index 4 should have neighbor at index 7 (bottom)');
    assert.ok(n4.find(n => n.i === 3 && n.dir === 'left'), 'Index 4 should have neighbor at index 3 (left)');
    assert.ok(n4.find(n => n.i === 5 && n.dir === 'right'), 'Index 4 should have neighbor at index 5 (right)');

    // Test Index 8 (Bottom-Right Corner)
    const n8 = getNeighbors(8);
    assert.strictEqual(n8.length, 2, 'Index 8 should have 2 neighbors');
    assert.ok(n8.find(n => n.i === 5 && n.dir === 'top'), 'Index 8 should have neighbor at index 5 (top)');
    assert.ok(n8.find(n => n.i === 7 && n.dir === 'left'), 'Index 8 should have neighbor at index 7 (left)');

    // Test Index 1 (Top Edge)
    const n1 = getNeighbors(1);
    assert.strictEqual(n1.length, 3, 'Index 1 should have 3 neighbors');
    assert.ok(n1.find(n => n.i === 4 && n.dir === 'bottom'), 'Index 1 should have neighbor at index 4 (bottom)');
    assert.ok(n1.find(n => n.i === 0 && n.dir === 'left'), 'Index 1 should have neighbor at index 0 (left)');
    assert.ok(n1.find(n => n.i === 2 && n.dir === 'right'), 'Index 1 should have neighbor at index 2 (right)');

    // Test Index 3 (Left Edge)
    const n3 = getNeighbors(3);
    assert.strictEqual(n3.length, 3, 'Index 3 should have 3 neighbors');
    assert.ok(n3.find(n => n.i === 0 && n.dir === 'top'), 'Index 3 should have neighbor at index 0 (top)');
    assert.ok(n3.find(n => n.i === 6 && n.dir === 'bottom'), 'Index 3 should have neighbor at index 6 (bottom)');
    assert.ok(n3.find(n => n.i === 4 && n.dir === 'right'), 'Index 3 should have neighbor at index 4 (right)');

    console.log('✅ All minimalist tests passed!');
} catch (error) {
    console.error('❌ Minimalist tests failed:');
    console.error(error.message);
    process.exit(1);
}
