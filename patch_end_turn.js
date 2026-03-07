const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front', 'src', 'components', 'EndTurnButton.vue');
let code = fs.readFileSync(filePath, 'utf8');

const scriptReplacement = `
<<<<<<< SEARCH
<script setup>
import { computed } from 'vue';
import { state, confirmAction } from '../game/state.js';
import { endTurn, aiPlay } from '../game/engine.js';
import { refillHand } from '../game/three-scene.js';

const isReady = computed(() => {
  if (state.turn !== 'player') return false;
  if (state.pMana === 0) return true;

  // Check if player has affordable cards
  const affordableCard = state.pHand.find(c => (c.userData.data.level || 1) <= state.pMana);
  return !affordableCard;
});

const handleEndTurn = async () => {
  if (state.turn !== 'player') return;

  if (!isReady.value) {
    const confirm = await confirmAction('Fin de Tour', 'Il vous reste du Mana et des cartes jouables. Êtes-vous sûr de vouloir terminer votre tour ?');
    if (!confirm) return;
  }

  state.turn = 'ai'; // Temporarily set to avoid double clicks while animating
  endTurn('player');
  refillHand('player');

  if (!state.online) {
      setTimeout(async () => {
          const { aiPlay } = await import('../game/input.js');
          aiPlay();
      }, 800);
  }
};
</script>
=======
<script setup>
import { computed } from 'vue';
import { state, confirmAction } from '../game/state.js';
import { endTurn } from '../game/engine.js';
import { refillHand } from '../game/three-scene.js';

const isReady = computed(() => {
  if (state.turn !== 'player') return false;
  if (state.pMana === 0) return true;

  // Check if player has affordable cards
  const affordableCard = state.pHand.find(c => (c.userData?.data?.level || 1) <= state.pMana);
  return !affordableCard;
});

const handleEndTurn = async () => {
  if (state.turn !== 'player') return;

  if (!isReady.value) {
    const confirm = await confirmAction('Fin de Tour', 'Il vous reste du Mana et des cartes jouables. Êtes-vous sûr de vouloir terminer votre tour ?');
    if (!confirm) return;
  }

  state.turn = 'ai'; // Temporarily set to avoid double clicks while animating
  endTurn('player');
  refillHand('player');

  if (!state.online) {
      setTimeout(async () => {
          const { aiPlay } = await import('../game/input.js');
          aiPlay();
      }, 800);
  }
};
</script>
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

code = applyPatch(code, scriptReplacement, 'script');


fs.writeFileSync(filePath, code, 'utf8');
