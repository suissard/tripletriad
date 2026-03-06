#!/bin/bash
sed -i 's/const isBuilding = ref(false);/const isBuilding = ref(false);\nconst showManaCurve = ref(false);\nconst importedDeckCode = ref("");/g' front/src/components/RightDrawer.vue

sed -i '/const filteredCollection = computed(() => {/i \
const manaCurve = computed(() => {\n\
  const curve = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };\n\
  editingDeck.cards.forEach(cardId => {\n\
    const card = cardLibrary.find(c => c.id === cardId);\n\
    if (card && curve[card.level] !== undefined) {\n\
      curve[card.level]++;\n\
    }\n\
  });\n\
  return curve;\n\
});\n\
\n\
const maxManaCount = computed(() => {\n\
  const max = Math.max(...Object.values(manaCurve.value));\n\
  return max > 0 ? max : 1;\n\
});\n\
' front/src/components/RightDrawer.vue
