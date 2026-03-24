<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { useUserStore } from '../../stores/userStore.js';
import strapiService from '../../api/strapi.js';

const props = defineProps({
  situation: { type: Object, required: true }
});
const emit = defineEmits(['next', 'line', 'finished-state']);

const activeLineIndex = ref(0);
const dialogueTimer = ref(null);
const isSituationFinished = ref(false);

function startDialogueSequence() {
  clearTimeout(dialogueTimer.value);
  activeLineIndex.value = 0;
  isSituationFinished.value = false;
  emit('finished-state', false);
  showNextLine();
}

function showNextLine() {
  const dialoguesArray = props.situation.dialogues || [];
  if (activeLineIndex.value >= dialoguesArray.length) {
    isSituationFinished.value = true;
    emit('finished-state', true);
    return;
  }

  const nextLine = dialoguesArray[activeLineIndex.value];
  emit('line', nextLine);
  activeLineIndex.value++;
}

function advanceDialogue() {
  if (isSituationFinished.value) {
     emit('next');
     return;
  }
  clearTimeout(dialogueTimer.value);
  showNextLine();
}

function skipAllDialogue() {
  clearTimeout(dialogueTimer.value);
  const dialoguesArray = props.situation.dialogues || [];
  // Send all remaining lines
  for (let i = activeLineIndex.value; i < dialoguesArray.length; i++) {
    emit('line', dialoguesArray[i]);
  }
  activeLineIndex.value = dialoguesArray.length;
  isSituationFinished.value = true;
  emit('finished-state', true);
}

defineExpose({ advanceDialogue, skipAllDialogue });

watch(() => props.situation, () => {
  startDialogueSequence();
}, { immediate: true });

onUnmounted(() => {
  clearTimeout(dialogueTimer.value);
});
</script>

<template>
  <div class="dialogue-driver"></div>
</template>

<style scoped>
.dialogue-driver { display: none; }
</style>
