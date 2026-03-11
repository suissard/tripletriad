<template>
  <PageLayout title="Test de Carte" backRoute="/">
    <div class="test-container">

      <!-- Panneau de contrôle -->
      <div class="control-panel">
        <h3>Contrôles des Props</h3>

        <div class="control-group">
          <label>Taille (Width):</label>
          <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; margin-left: 10px;">
            <div style="display: flex; gap: 5px; align-items: center;">
              <select v-model="cardProps.size" v-if="!isCustomSize" style="flex: 1;">
                <option value="xs">XS (70px)</option>
                <option value="sm">SM (90px)</option>
                <option value="md">MD (150px)</option>
                <option value="lg">LG (180px)</option>
                <option value="xl">XL (350px)</option>
              </select>
              <button @click="toggleCustomSize" class="toggle-btn">
                {{ isCustomSize ? 'Presets' : 'Libre' }}
              </button>
            </div>
            
            <div v-if="isCustomSize" class="slider-container">
              <input type="range" v-model.number="customSize" min="50" max="800" step="10">
              <div class="slider-value">
                <input type="number" v-model.number="customSize"> <span>px</span>
              </div>
            </div>
          </div>
        </div>

        <div class="control-group">
          <label>Ratio (W/H):</label>
          <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; margin-left: 10px;">
            <div class="slider-container">
              <input type="range" v-model.number="cardProps.ratio" min="0.3" max="2.0" step="0.05">
              <div class="slider-value">
                <input type="number" v-model.number="cardProps.ratio" step="0.05">
              </div>
            </div>
          </div>
        </div>

        <div class="control-group">
          <label><input type="checkbox" v-model="cardProps.flat"> Flat (pas de 3D)</label>
        </div>

        <div class="control-group">
          <label><input type="checkbox" v-model="cardProps.unowned"> Unowned (Grise/Cadenas)</label>
        </div>

        <div class="control-group">
          <label><input type="checkbox" v-model="cardProps.isPremium"> Premium (Holographique)</label>
        </div>

        <div class="control-group">
          <label><input type="checkbox" v-model="cardProps.selected"> Selected (Sélectionnée)</label>
        </div>

        <div class="control-group">
          <label><input type="checkbox" v-model="cardProps.isCover"> isCover (Couverture Deck)</label>
        </div>

        <div class="control-group">
          <label><input type="checkbox" v-model="cardProps.disableZoom"> Disable Zoom (Désactiver Zoom Long Press)</label>
        </div>

        <div class="control-group">
          <label><input type="checkbox" v-model="cardProps.faceDown"> Face Down (Dos de la Carte)</label>
        </div>

        <div class="control-group">
          <label>Quantité (quantity):</label>
          <input type="number" v-model="cardProps.quantity" min="0" max="99" style="width: 50px;">
        </div>

        <div class="control-group">
          <label>Couleur Bordure (borderColor):</label>
          <input type="color" v-model="cardProps.borderColor">
          <button @click="cardProps.borderColor = ''" style="margin-left:5px; padding:2px 5px; font-size: 0.8em;">Clear</button>
        </div>
-
        <div class="control-group">
          <label>Largeur Bordure (borderWidth):</label>
          <div class="slider-container" style="flex: 1; margin-left:10px;">
            <input type="range" v-model.number="cardProps.borderWidth" min="0" max="20" step="1">
            <div class="slider-value">
              <input type="number" v-model.number="cardProps.borderWidth"> <span>px</span>
            </div>
          </div>
        </div>

        <hr style="border-color: #334; margin: 15px 0;">

        <h3>Données de la Carte</h3>
        <div class="control-group">
          <label>Nom :</label>
          <input type="text" v-model="cardData.name" style="width: 100%;">
        </div>

        <div class="control-group">
          <label>Niveau (1-10) :</label>
          <input type="number" v-model="cardData.level" min="1" max="10" style="width: 50px;">
        </div>

        <div class="control-group">
          <label>Éléments :</label>
          <div style="display: flex; flex-wrap: wrap; gap: 5px; flex: 1; margin-left: 10px; padding: 5px 0;">
            <label v-for="el in ['eau', 'radiation', 'reseau', 'spore', 'furtif', 'longue_portee', 'faille_dimensionnelle', 'hacking', 'obsidienne']" :key="el" style="display:flex; align-items:center; gap:4px; font-size: 0.85em; background: rgba(0,0,0,0.3); padding: 4px 6px; border-radius: 4px; border: 1px solid #444; cursor: pointer;">
              <input type="checkbox" :value="el" v-model="cardData.elements" style="margin: 0;"> {{ el.replace('_', ' ') }}
            </label>
          </div>
        </div>

        <div class="stats-grid">
          <div>Haut: <input type="number" v-model="cardData.topValue" min="1" max="10"></div>
          <div>Gauche: <input type="number" v-model="cardData.leftValue" min="1" max="10"></div>
          <div>Droite: <input type="number" v-model="cardData.rightValue" min="1" max="10"></div>
          <div>Bas: <input type="number" v-model="cardData.bottomValue" min="1" max="10"></div>
        </div>
      </div>

      <!-- Zone de la Carte -->
      <div class="card-display">
        <TripleTriadCard
          :card="cardData"
          :size="isCustomSize ? customSize : cardProps.size"
          :ratio="cardProps.ratio"
          :ratioContent="cardProps.ratioContent"
          :flat="cardProps.flat"
          :unowned="cardProps.unowned"
          :isPremium="cardProps.isPremium"
          :selected="cardProps.selected"
          :isCover="cardProps.isCover"
          :quantity="cardProps.quantity"
          :borderColor="cardProps.borderColor"
          :borderWidth="cardProps.borderWidth"
          :disableZoom="cardProps.disableZoom"
          :face-down="cardProps.faceDown"
          @click="logEvent('click', $event)"
          @left-click="logEvent('left-click', $event)"
          @right-click="logEvent('right-click', $event)"
          @long-left-click="logEvent('long-left-click', $event)"
          @long-right-click="logEvent('long-right-click', $event)"
          @set-cover="logEvent('set-cover', $event)"
        />
      </div>

      <!-- Journal d'événements -->
      <div class="event-log">
        <div class="log-header">
          <h3>Journal d'Événements</h3>
          <button @click="logs = []" class="clear-btn">Effacer</button>
        </div>
        <div class="logs-container">
          <div v-if="logs.length === 0" class="empty-log">Aucun événement...</div>
          <div v-for="(log, index) in logs.slice().reverse()" :key="index" class="log-entry">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-name">{{ log.name }}</span>
            <span class="log-data">Carte: {{ log.cardName }}</span>
          </div>
        </div>
      </div>

    </div>
  </PageLayout>
</template>

<script setup>
import { ref, reactive } from 'vue';
import PageLayout from './PageLayout.vue';
import TripleTriadCard from './TripleTriadCard.vue';

const cardProps = reactive({
  size: 'xl',
  ratio: 2.5 / 3.5,
  ratioContent: 0.08,
  flat: false,
  unowned: false,
  isPremium: false,
  selected: false,
  isCover: false,
  quantity: 1,
  borderColor: '',
  borderWidth: 2,
  disableZoom: false,
  faceDown: false
});

const isCustomSize = ref(false);
const customSize = ref(200);

function toggleCustomSize() {
  isCustomSize.value = !isCustomSize.value;
}

const cardData = reactive({
  id: 9999,
  name: 'Testeur Suprême',
  level: 8,
  elements: ['eau', 'radiation'],
  topValue: 9,
  leftValue: 5,
  rightValue: 6,
  bottomValue: 8,
  description: 'Une carte générée dynamiquement pour tester les composants Vue.',
  img: 'https://api.dicebear.com/9.x/bottts/png?seed=TesteurSupreme&backgroundColor=transparent'
});

const logs = ref([]);

function logEvent(eventName, card) {
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

  logs.value.push({
    time: timeString,
    name: eventName,
    cardName: card?.name || 'Inconnu'
  });

  // Limiter à 50 logs max
  if (logs.value.length > 50) {
    logs.value.shift();
  }
}
</script>

<style scoped>
.test-container {
  display: flex;
  height: 100%;
  padding: 20px;
  gap: 20px;
  box-sizing: border-box;
  flex-wrap: wrap;
}

.control-panel {
  flex: 1;
  min-width: 250px;
  max-width: 350px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  overflow-y: auto;
}

.control-panel h3 {
  margin-top: 0;
  color: #00d2ff;
  border-bottom: 1px solid #334;
  padding-bottom: 5px;
}

.control-group {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.control-group label {
  cursor: pointer;
  user-select: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.stats-grid div {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-grid input {
  width: 40px;
}

input[type="text"], input[type="number"], select {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #555;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
}

.toggle-btn {
  padding: 4px 8px;
  font-size: 0.75em;
  background: #444;
  border: 1px solid #666;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.toggle-btn:hover {
  background: #555;
}

.slider-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.slider-container input[type="range"] {
  width: 100%;
}

.slider-value {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8em;
  color: #aaa;
}

.slider-value input {
  width: 60px;
}

.card-display {
  flex: 2;
  min-width: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  padding: 20px;
}

.event-log {
  flex: 1;
  min-width: 250px;
  max-width: 350px;
  max-height: 80vh; /* Restrict height to allow scrolling inner container */
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #334;
  background: rgba(255, 255, 255, 0.05);
}

.log-header h3 {
  margin: 0;
  color: #ffc107;
  font-size: 1.1rem;
}

.clear-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.clear-btn:hover {
  background: #d32f2f;
}

.logs-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.empty-log {
  color: #777;
  font-style: italic;
  text-align: center;
  margin-top: 20px;
}

.log-entry {
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  border-left: 3px solid #00d2ff;
  display: flex;
  flex-direction: column;
}

.log-time {
  color: #888;
  font-family: monospace;
  font-size: 0.75rem;
}

.log-name {
  color: #00ffaa;
  font-weight: bold;
}

.log-data {
  color: #ddd;
}
</style>
