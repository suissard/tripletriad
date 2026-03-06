#!/bin/bash
sed -i '/<div class="builder-actions">/a \
              <button class="export-btn" @click="exportDeckCode" :disabled="editingDeck.cards.length === 0">\n\
                Copier le code\n\
              </button>\n\
' front/src/components/RightDrawer.vue

sed -i '/async function saveDeck() {/i \
function exportDeckCode() {\n\
  if (editingDeck.cards.length === 0) return;\n\
  const idString = editingDeck.cards.join(",");\n\
  const encodedCode = btoa(idString);\n\
  navigator.clipboard.writeText(encodedCode).then(() => {\n\
    authError.value = "Code du deck copié dans le presse-papier !";\n\
    setTimeout(() => { authError.value = ""; }, 3000);\n\
  }).catch(err => {\n\
    authError.value = "Erreur lors de la copie du code.";\n\
  });\n\
}\n\
' front/src/components/RightDrawer.vue

cat << 'EOF2' >> front/src/components/RightDrawer.vue
<style scoped>
.export-btn {
  background: #34495e;
  border: 1px solid #2c3e50;
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.export-btn:hover:not(:disabled) {
  background: #2c3e50;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
EOF2
