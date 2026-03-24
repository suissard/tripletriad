const fs = require('fs');

const path = 'front/src/game/engine.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "export function captureCard(boardEntry, newOwner) {",
  "export function captureCard(boardEntry, newOwner, direction = null) {"
);

content = content.replace(
  "boardEntry.owner = newOwner;",
  "boardEntry.owner = newOwner;\n    if (direction) {\n        boardEntry.data.impactDirection = direction;\n        // Ensure reactive update trigger if needed, but modifying data object should suffice\n    }"
);

// We need to fix resolveRules
// 1. complexCaptures loop: It doesn't have direction easily accessible because rulesRegistry returns a Set of entries.
// For now, complex rules (like Plus/Same) might not have a clear single direction. We'll pass 'center' or null.
// 2. neighbors loop:
content = content.replace(
  "captureCard(adj, owner);\n                actionRecord.capturedCards.push(adj.data);",
  "captureCard(adj, owner, n.opp); // The side of adj that was attacked is its opp side\n                actionRecord.capturedCards.push(adj.data);"
);

// 3. combo loop:
content = content.replace(
  "captureCard(adj, owner);\n                actionRecord.capturedCards.push(adj.data);\n                comboStack.push(n.i);",
  "captureCard(adj, owner, n.opp);\n                actionRecord.capturedCards.push(adj.data);\n                comboStack.push(n.i);"
);

fs.writeFileSync(path, content);
console.log('Done');
