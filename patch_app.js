const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front', 'src', 'App.vue');
let code = fs.readFileSync(filePath, 'utf8');

const importReplacement = `
<<<<<<< SEARCH
import DecksPage from './components/DecksPage.vue';
import BoutiquePage from './components/BoutiquePage.vue';
import { state } from './game/state.js';
=======
import DecksPage from './components/DecksPage.vue';
import BoutiquePage from './components/BoutiquePage.vue';
import ActionLog from './components/ActionLog.vue';
import EndTurnButton from './components/EndTurnButton.vue';
import { state } from './game/state.js';
>>>>>>> REPLACE
`;

const uiLayerReplacement = `
<<<<<<< SEARCH
  <template v-if="state.gameState === 'playing' || state.gameState === 'gameover'">
    <div id="ui" class="ui-layer">
      <ScorePanel label="Plateau Joueur" :score="state.pScore" color="#00d2ff" />
      <ScorePanel label="Plateau IA" :score="state.aiScore" color="#ff0055" />
    </div>

    <!-- Rules Panel moved out for now per user request -->

    <div id="msg" class="ui-layer">Glisse une carte bleue sur le plateau 👆</div>
=======
  <template v-if="state.gameState === 'playing' || state.gameState === 'gameover'">
    <div id="ui" class="ui-layer">
      <ScorePanel label="Héros" :score="state.pScore" color="#00d2ff" :health="state.pHealth" :mana="state.pMana" :maxMana="state.pMaxMana" />
      <ScorePanel label="Adversaire" :score="state.aiScore" color="#ff0055" :health="state.aiHealth" :mana="state.aiMana" :maxMana="state.aiMaxMana" />
    </div>

    <!-- Action Log -->
    <ActionLog />

    <!-- End Turn Button -->
    <EndTurnButton />

    <!-- Rules Panel moved out for now per user request -->

    <div id="msg" class="ui-layer">Glisse une carte bleue sur le plateau 👆</div>
>>>>>>> REPLACE
`;

function applyPatch(original, patchStr, name) {
    const searchMarker = '<<<<<<< SEARCH\n';
    const replaceMarker = '=======\n';
    const endMarker = '>>>>>>> REPLACE\n';

    const searchStart = patchStr.indexOf(searchMarker);
    const replaceStart = patchStr.indexOf(replaceMarker);
    const replaceEnd = patchStr.indexOf(endMarker);

    if (searchStart === -1 || replaceStart === -1 || replaceEnd === -1) {
        console.error('Patch format invalid for ' + name);
        return original;
    }

    const searchBlock = patchStr.substring(searchStart + searchMarker.length, replaceStart);
    const replaceBlock = patchStr.substring(replaceStart + replaceMarker.length, replaceEnd);

    if (original.includes(searchBlock)) {
        console.log('Applied ' + name);
        return original.replace(searchBlock, replaceBlock);
    } else {
        console.error('Could not find block for ' + name);
        return original;
    }
}

code = applyPatch(code, importReplacement, 'import');
code = applyPatch(code, uiLayerReplacement, 'uiLayer');


fs.writeFileSync(filePath, code, 'utf8');
