<template>
  <PageLayout title="Test de Carte" backRoute="/">
    <div class="test-container">

      <!-- Panneau de contrôle -->
      <div class="control-panel">
        <h3>Contrôles des Props</h3>

        <div class="control-group">
          <label>Taille (size):</label>
          <select v-model="cardProps.size">
            <option value="xs">XS</option>
            <option value="sm">SM</option>
            <option value="md">MD</option>
            <option value="lg">LG</option>
            <option value="xl">XL</option>
          </select>
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
          <label>Quantité (quantity):</label>
          <input type="number" v-model="cardProps.quantity" min="0" max="99" style="width: 50px;">
        </div>

        <div class="control-group">
          <label>Couleur Bordure (borderColor):</label>
          <input type="color" v-model="cardProps.borderColor">
          <button @click="cardProps.borderColor = ''" style="margin-left:5px; padding:2px 5px; font-size: 0.8em;">Clear</button>
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
          <label>Élément :</label>
          <select v-model="cardData.element">
            <option value="None">Aucun</option>
            <option value="Fire">Fire 🔥</option>
            <option value="Ice">Ice ❄️</option>
            <option value="Thunder">Thunder ⚡</option>
            <option value="Earth">Earth 🌍</option>
            <option value="Poison">Poison ☠️</option>
            <option value="Wind">Wind 🌪️</option>
            <option value="Water">Water 💧</option>
            <option value="Holy">Holy ✨</option>
          </select>
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
          :size="cardProps.size"
          :flat="cardProps.flat"
          :unowned="cardProps.unowned"
          :isPremium="cardProps.isPremium"
          :selected="cardProps.selected"
          :isCover="cardProps.isCover"
          :quantity="cardProps.quantity"
          :borderColor="cardProps.borderColor"
          :disableZoom="cardProps.disableZoom"
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
  flat: false,
  unowned: false,
  isPremium: false,
  selected: false,
  isCover: false,
  quantity: 1,
  borderColor: '',
  disableZoom: false
});

const cardData = reactive({
  id: 9999,
  name: 'Testeur Suprême',
  level: 8,
  element: 'Fire',
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
