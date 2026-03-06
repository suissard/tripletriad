#!/bin/bash
sed -i '/<div class="builder-actions">/i \
            <div class="import-section">\n\
              <input v-model="importedDeckCode" placeholder="Coller le code ici" class="import-input" />\n\
              <button class="import-btn" @click="importDeckCode" :disabled="!importedDeckCode">\n\
                Importer\n\
              </button>\n\
            </div>\n\
' front/src/components/RightDrawer.vue

sed -i '/function exportDeckCode() {/i \
function importDeckCode() {\n\
  if (!importedDeckCode.value) return;\n\
  try {\n\
    const decodedStr = atob(importedDeckCode.value);\n\
    const cardIds = decodedStr.split(",").map(id => parseInt(id, 10));\n\
    const newCards = [];\n\
    const unownedIds = [];\n\
    const invalidIds = [];\n\
\n\
    for (const id of cardIds) {\n\
      if (isNaN(id)) continue;\n\
      const card = cardLibrary.find(c => c.id === id);\n\
      if (!card) {\n\
        invalidIds.push(id);\n\
      } else if (!isOwned(id)) {\n\
        unownedIds.push(id);\n\
      } else if (newCards.length < 15) {\n\
        newCards.push(id);\n\
      }\n\
    }\n\
\n\
    editingDeck.cards = newCards;\n\
    importedDeckCode.value = "";\n\
    \n\
    if (unownedIds.length > 0 || invalidIds.length > 0) {\n\
      authError.value = `Import partiel : ${unownedIds.length} cartes non possédées, ${invalidIds.length} invalides.`;\n\
    } else {\n\
      authError.value = "Deck importé avec succès !";\n\
    }\n\
    setTimeout(() => { authError.value = ""; }, 4000);\n\
  } catch (err) {\n\
    authError.value = "Code invalide.";\n\
    setTimeout(() => { authError.value = ""; }, 3000);\n\
  }\n\
}\n\
' front/src/components/RightDrawer.vue

cat << 'EOF2' >> front/src/components/RightDrawer.vue
<style scoped>
.import-section {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.import-input {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #444;
  background: #222;
  color: white;
}

.import-btn {
  background: #27ae60;
  border: 1px solid #2ecc71;
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.import-btn:hover:not(:disabled) {
  background: #2ecc71;
}

.import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
EOF2
