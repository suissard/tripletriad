const fs = require('fs');
const file = 'front/src/components/CollectionView.vue';
let content = fs.readFileSync(file, 'utf8');

const headerReplacement = `
    <div class="page-header">
      <button class="back-btn" @click="closeCollection">← RETOUR</button>
      <h2 class="page-title">MA COLLECTION</h2>
      <div class="header-stats">
        Possédées : {{ state.collection.length }} / {{ cardLibrary.length }}
        <span style="margin-left: 20px; color: #ffc107;">✨ Poussière: {{ state.user?.dust || 0 }}</span>
      </div>
    </div>
`;
content = content.replace(/<div class="page-header">[\s\S]*?<\/div>/m, headerReplacement);

const templateReplacement = `
         <div class="collection-stats-bar">
           <div>
             Résultats : {{ filteredCardLibrary.length }} cartes | Page {{ currentPage }} / {{ totalPages || 1 }}
           </div>
           <div class="pagination-controls">
             <button class="mass-disenchant-btn" @click="handleMassDisenchant">Désenchantement de masse</button>
             <button :disabled="currentPage === 1" @click="currentPage--">Précédent</button>
             <button :disabled="currentPage === totalPages || totalPages === 0" @click="currentPage++">Suivant</button>
           </div>
         </div>
`;
content = content.replace(/<div class="collection-stats-bar">[\s\S]*?<\/div>\s*<\/div>/m, templateReplacement);

const scriptReplacement = `
import { ref, computed, watch } from 'vue';
import { state, cardLibrary, massDisenchantCards } from '../game/state.js';
import TripleTriadCard from './TripleTriadCard.vue';

async function handleMassDisenchant() {
  await massDisenchantCards();
}
`;
content = content.replace(/import { ref, computed, watch } from 'vue';\s*import { state, cardLibrary } from '\.\.\/game\/state\.js';/m, scriptReplacement);

const styleReplacement = `
.pagination-controls button {
  background: #333;
  color: white;
  border: none;
  padding: 5px 15px;
  margin-left: 10px;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-controls .mass-disenchant-btn {
  background: #f44336;
  font-weight: bold;
}
.pagination-controls .mass-disenchant-btn:hover {
  background: #d32f2f;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;
content = content.replace(/\.pagination-controls button \{[\s\S]*?cursor: not-allowed;\s*\}/m, styleReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched CollectionView.vue');
