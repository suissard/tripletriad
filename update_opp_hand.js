import fs from 'fs';

const path = 'front/src/components/OpponentHand.vue';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
.opp-cards {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

@media (max-width: 900px) {
  .opp-cards { gap: 2px; }
  .opp-card-slot { transform: scale(0.65); transform-origin: top center; margin: -10px -5px; }
  .opponent-hand { padding: 4px; border-radius: 8px; gap: 4px; }
}

.opp-card-slot {
`;

content = content.replace('.opp-cards {\n  display: flex;\n  gap: 8px;\n  justify-content: center;\n  align-items: center;\n}\n\n.opp-card-slot {', replacement.trim() + '\n');

fs.writeFileSync(path, content);
console.log('OpponentHand updated');
