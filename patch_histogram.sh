#!/bin/bash
sed -i '/const isBuilding = ref(false);/a const showManaCurve = ref(false);\nconst importedDeckCode = ref("");' front/src/components/RightDrawer.vue

# Add computed properties
sed -i '/const filteredCollection = computed(() => {/i const manaCurve = computed(() => {\n  const curve = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };\n  editingDeck.cards.forEach(cardId => {\n    const card = cardLibrary.find(c => c.id === cardId);\n    if (card && card.level >= 1 && card.level <= 10) {\n      curve[card.level]++;\n    }\n  });\n  return curve;\n});\n\nconst maxManaCount = computed(() => {\n  const max = Math.max(...Object.values(manaCurve.value));\n  return max > 0 ? max : 1;\n});\n' front/src/components/RightDrawer.vue
