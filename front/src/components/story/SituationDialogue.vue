<template>
  <div class="situation-dialogue" @click="advanceDialogue">
    <!-- Background Portraits -->
    <div class="vn-portrait-layer">
      <Transition name="portrait-slide-left">
        <img v-if="leftSpeakerPortrait" :src="leftSpeakerPortrait"
          class="vn-portrait left" :class="{ 'is-dimmed': activeSpeakerPosition !== 'left' }" />
      </Transition>
      <Transition name="portrait-slide-right">
        <img v-if="rightSpeakerPortrait" :src="rightSpeakerPortrait"
          class="vn-portrait right" :class="{ 'is-dimmed': activeSpeakerPosition !== 'right' }" />
      </Transition>
    </div>

    <!-- Header Controls (Skip) -->
    <div class="vn-header-controls">
      <button class="vn-skip-btn" @click.stop="skipAllDialogue">Passer ⏭</button>
    </div>

    <!-- Dialogue Area -->
    <div class="vn-dialogue-area">
      <div class="vn-chat-log" ref="chatLogRef">
        <div v-for="(line, idx) in displayedLines" :key="idx" class="dialogue-line" :class="{
          'narration': line.isNarration,
          'hero': !line.isNarration && line.position === 'left',
          'npc': !line.isNarration && line.position === 'right',
          'is-latest': idx === displayedLines.length - 1
        }">
          <img v-if="line.card && !line.isNarration" :src="getAvatarUrl(line.card)" class="dialogue-avatar" />
          <div class="dialogue-content">
            <strong v-if="!line.isNarration && line.name" class="speaker-name">{{ line.name }}</strong>
            <span v-html="marked(line.sentence)"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Click Indicator -->
    <div v-if="!isSituationFinished" class="vn-click-hint">Cliquez pour continuer ▼</div>

    <!-- End Actions -->
    <Transition name="vn-fade">
      <div v-if="isSituationFinished" class="vn-modal-overlay">
        <div class="vn-modal-content fade-in-up">
          <AppButton @click.stop="$emit('next')" variant="ghost" class="mt-4">
            Continuer
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';
import { useUserStore } from '../../stores/userStore.js';
import strapiService from '../../api/strapi.js';
import AppButton from '../ui/AppButton.vue';

const props = defineProps({
  situation: { type: Object, required: true }
});
const emit = defineEmits(['next']);
const userStore = useUserStore();

const displayedLines = ref([]);
const activeLineIndex = ref(0);
const dialogueTimer = ref(null);
const isSituationFinished = ref(false);
const chatLogRef = ref(null);

const activeSpeakerPosition = computed(() => {
  if (displayedLines.value.length === 0) return null;
  const lastLine = displayedLines.value[displayedLines.value.length - 1];
  if (lastLine.isNarration) return null;
  return lastLine.position || 'left';
});

const leftSpeakerPortrait = computed(() => {
  for (let i = displayedLines.value.length - 1; i >= 0; i--) {
    const line = displayedLines.value[i];
    if (line.position === 'left' && line.card) return getAvatarUrl(line.card);
  }
  return userStore.user.avatar || null;
});

const rightSpeakerPortrait = computed(() => {
  for (let i = displayedLines.value.length - 1; i >= 0; i--) {
    const line = displayedLines.value[i];
    if (line.position === 'right' && line.card) return getAvatarUrl(line.card);
  }
  return null;
});

function getAvatarUrl(card) {
  if (!card) return '';
  let url = card.imageUrl || card.img;
  if (!url && card.image?.url) {
    url = card.image.url.startsWith('http') ? card.image.url : `${strapiService.MEDIA_URL}${card.image.url}`;
  }
  if (!url) {
    const seed = card.id || card.documentId || card.name || '0';
    url = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
  }
  return url;
}

function startDialogueSequence() {
  clearTimeout(dialogueTimer.value);
  displayedLines.value = [];
  activeLineIndex.value = 0;
  isSituationFinished.value = false;
  showNextLine();
}

function showNextLine() {
  const dialoguesArray = props.situation.dialogues || [];
  if (activeLineIndex.value >= dialoguesArray.length) {
    isSituationFinished.value = true;
    return;
  }

  const nextLine = dialoguesArray[activeLineIndex.value];
  displayedLines.value.push(nextLine);
  activeLineIndex.value++;

  nextTick(() => {
    if (chatLogRef.value) chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
  });

  const textLength = nextLine.sentence ? nextLine.sentence.length : 10;
  const delay = Math.min(Math.max(1500, textLength * 60), 10000);
  dialogueTimer.value = setTimeout(() => {
    showNextLine();
  }, delay);
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
  displayedLines.value = [...dialoguesArray];
  activeLineIndex.value = dialoguesArray.length;
  isSituationFinished.value = true;
  nextTick(() => {
    if (chatLogRef.value) chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
  });
}

watch(() => props.situation, () => {
  startDialogueSequence();
}, { immediate: true });

onUnmounted(() => {
  clearTimeout(dialogueTimer.value);
});
</script>

<style scoped>
.situation-dialogue {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}

.vn-portrait-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.vn-portrait {
  position: absolute;
  bottom: 0;
  height: 85vh;
  max-width: 50vw;
  object-fit: contain;
  opacity: 0.8;
  filter: drop-shadow(0 0 30px rgba(0, 210, 255, 0.3));
  mask-image: linear-gradient(to top, transparent 0%, black 30%);
  -webkit-mask-image: linear-gradient(to top, transparent 0%, black 30%);
}

.vn-portrait.left { left: -5%; transform-origin: bottom left; }
.vn-portrait.right {
  right: -5%;
  transform-origin: bottom right;
  filter: drop-shadow(0 0 30px rgba(255, 100, 100, 0.3));
}

.vn-portrait.is-dimmed {
  filter: brightness(0.3) grayscale(0.5);
  opacity: 0.6;
  transform: scale(0.95);
}

.vn-header-controls {
  position: absolute;
  top: 1.5rem;
  right: 2rem;
  z-index: 20;
}

.vn-skip-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  backdrop-filter: blur(5px);
  transition: all 0.3s;
  font-weight: 600;
}

.vn-skip-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.vn-dialogue-area {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  height: 60vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 10;
  pointer-events: none;
}

.vn-chat-log {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding: 1rem;
  padding-bottom: 3rem;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
  pointer-events: auto;
}

.vn-chat-log::-webkit-scrollbar { width: 4px; }
.vn-chat-log::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }

.dialogue-line {
  padding: 1rem 1.5rem;
  border-radius: 16px;
  background: rgba(20, 20, 30, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 1.1rem;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  max-width: 85%;
  animation: slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}

.dialogue-line.is-latest { border-color: rgba(255, 255, 255, 0.4); }

.dialogue-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.speaker-name {
  display: block;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.4rem;
}

.dialogue-line.hero {
  align-self: flex-start;
  background: rgba(0, 100, 200, 0.2);
  border-left: 4px solid #00d2ff;
}
.dialogue-line.hero .speaker-name { color: #00d2ff; }

.dialogue-line.npc {
  align-self: flex-end;
  background: rgba(200, 50, 50, 0.2);
  border-right: 4px solid #ff6464;
  flex-direction: row-reverse;
  text-align: right;
}
.dialogue-line.npc .speaker-name { color: #ff6464; }

.narration {
  background: transparent;
  border: none;
  font-style: italic;
  text-align: center;
  align-self: center;
  color: #ccc;
}

.vn-modal-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 50;
  pointer-events: auto;
}

.vn-modal-content {
  background: rgba(15, 15, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 3rem;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.vn-click-hint {
  position: absolute;
  bottom: 2%;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  letter-spacing: 2px;
  animation: pulse-hint 2s infinite;
}

@keyframes slide-up-fade { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-hint {
  0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
  50% { opacity: 0.7; transform: translateX(-50%) translateY(-5px); }
}

.vn-fade-enter-active, .vn-fade-leave-active { transition: opacity 0.5s ease; }
.vn-fade-enter-from, .vn-fade-leave-to { opacity: 0; }

.portrait-slide-left-enter-active, .portrait-slide-left-leave-active,
.portrait-slide-right-enter-active, .portrait-slide-right-leave-active {
  transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.portrait-slide-left-enter-from, .portrait-slide-left-leave-to { opacity: 0; transform: translateX(-30px); }
.portrait-slide-right-enter-from, .portrait-slide-right-leave-to { opacity: 0; transform: translateX(30px); }

.fade-in-up {
  animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
