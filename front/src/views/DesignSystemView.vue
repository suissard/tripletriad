<template>
  <div class="design-system-page">
    <header class="ds-header">
      <h1>Design System - Terra Nullius</h1>
      <p class="subtitle">Référentiel des composants UI du projet</p>
    </header>

    <div class="ds-container">
      <!-- NAVIGATION RAPIDE -->
      <nav class="ds-nav">
        <a href="#buttons">Boutons</a>
        <a href="#badges">Badges</a>
        <a href="#panels">Panneaux & Cartes</a>
        <a href="#game">Composants Jeu</a>
        <a href="#icons">Icônes</a>
      </nav>

      <section id="buttons" class="ds-section">
        <h2>Boutons (AppButton)</h2>
        <p class="file-path">Fichier : <code>front/src/components/ui/AppButton.vue</code></p>
        
        <div class="ds-grid">
          <div class="ds-item">
            <AppButton variant="primary">Primary</AppButton>
            <span>Primary</span>
          </div>
          <div class="ds-item">
            <AppButton variant="secondary">Secondary</AppButton>
            <span>Secondary (Default)</span>
          </div>
          <div class="ds-item">
            <AppButton variant="accent">Accent</AppButton>
            <span>Accent</span>
          </div>
          <div class="ds-item">
            <AppButton variant="ghost">Ghost</AppButton>
            <span>Ghost</span>
          </div>
          <div class="ds-item">
            <AppButton variant="primary" loading>Loading</AppButton>
            <span>Loading State</span>
          </div>
          <div class="ds-item">
            <AppButton variant="primary" disabled>Disabled</AppButton>
            <span>Disabled State</span>
          </div>
          <div class="ds-item">
            <AppButton :glass="false" variant="primary">No Glass</AppButton>
            <span>Glass: false</span>
          </div>
        </div>
      </section>

      <section id="badges" class="ds-section">
        <h2>Badges (AppBadge)</h2>
        <p class="file-path">Fichier : <code>front/src/components/ui/AppBadge.vue</code></p>

        <div class="ds-grid">
          <div class="ds-item">
            <AppBadge content="12" variant="primary" />
            <span>Primary</span>
          </div>
          <div class="ds-item">
            <AppBadge content="Warning" variant="warning" />
            <span>Warning</span>
          </div>
          <div class="ds-item">
            <AppBadge content="Danger" variant="danger" pulsate />
            <span>Danger + Pulsate</span>
          </div>
          <div class="ds-item">
            <AppBadge content="Success" variant="success" bounce />
            <span>Success + Bounce</span>
          </div>
          <div class="ds-item">
            <AppBadge content="Info" variant="info" size="lg" />
            <span>Info + Large</span>
          </div>
          <div class="ds-item">
            <AppBadge content="XS" variant="secondary" size="xs" />
            <span>Secondary + XS</span>
          </div>
        </div>
      </section>

      <section id="panels" class="ds-section">
        <h2>Panneaux & Cartes (AppPanel, AppCard)</h2>
        <p class="file-path">Fichiers : <code>front/src/components/ui/AppPanel.vue</code>, <code>front/src/components/ui/AppCard.vue</code></p>

        <div class="ds-grid-large">
          <div class="ds-item">
            <AppPanel title="AppPanel - Primary" variant="primary">
              <p>Panneau standard avec variante Primary.</p>
              <template #footer><AppButton variant="primary" size="sm">Action</AppButton></template>
            </AppPanel>
            <span>AppPanel (Primary)</span>
          </div>
          <div class="ds-item">
            <AppPanel title="AppPanel - Secondary" variant="secondary">
              <p>Panneau standard avec variante Secondary.</p>
              <template #footer><AppButton variant="secondary" size="sm">Action</AppButton></template>
            </AppPanel>
            <span>AppPanel (Secondary)</span>
          </div>
          <div class="ds-item">
            <AppPanel title="AppPanel - Accent" variant="accent">
              <p>Panneau standard avec variante Accent.</p>
              <template #footer><AppButton variant="accent" size="sm">Action</AppButton></template>
            </AppPanel>
            <span>AppPanel (Accent)</span>
          </div>
          <div class="ds-item">
            <AppCard variant="primary">
              <h3>AppCard - Primary</h3>
              <p>Carte simple avec variante Primary.</p>
            </AppCard>
            <span>AppCard (Primary)</span>
          </div>
          <div class="ds-item">
            <AppCard variant="secondary">
              <h3>AppCard - Secondary</h3>
              <p>Carte simple avec variante Secondary.</p>
            </AppCard>
            <span>AppCard (Secondary)</span>
          </div>
          <div class="ds-item">
            <AppCard variant="accent">
              <h3>AppCard - Accent</h3>
              <p>Carte simple avec variante Accent.</p>
            </AppCard>
            <span>AppCard (Accent)</span>
          </div>

          <div class="ds-item">
            <AppButton @click="showModal = true">Ouvrir Modal</AppButton>
            <AppModal v-model="showModal" title="Design System Modal">
              <p>Ceci est un exemple de modal utilisant <code>AppModal</code>.</p>
              <template #footer>
                <AppButton @click="showModal = false" variant="primary">Fermer</AppButton>
              </template>
            </AppModal>
            <span>AppModal (<code>front/src/components/ui/AppModal.vue</code>)</span>
          </div>
        </div>
      </section>

      <section id="game" class="ds-section">
        <h2>Composants de Jeu</h2>
        
        <div class="ds-grid-large">
          <div class="ds-item">
            <div style="width: 150px; height: 210px;">
              <TripleTriadCard :card="mockCard" />
            </div>
            <span>TripleTriadCard (<code>front/src/components/TripleTriadCard.vue</code>)</span>
          </div>
          <div class="ds-item">
             <DifficultySelector v-model="difficulty" />
             <span>DifficultySelector (<code>front/src/components/DifficultySelector.vue</code>)</span>
          </div>
        </div>
      </section>

      <section id="forms" class="ds-section">
        <h2>Formulaires & Sélecteurs</h2>
        <div class="ds-grid-large">
          <div class="ds-item" style="align-items: stretch; text-align: left;">
            <PremiumSelect
              v-model="selectedOption"
              :options="selectOptions"
              label="Sélection Premium"
              placeholder="Choisir une option"
            />
            <span style="text-align: center; margin-top: 15px;">PremiumSelect (<code>front/src/admin/components/PremiumSelect.vue</code>)</span>
          </div>
        </div>
      </section>

      <section id="icons" class="ds-section">
        <h2>Icônes (FactionIcon, ElementIcon)</h2>
        <p class="file-path">Fichiers : <code>front/src/components/FactionIcon.vue</code>, <code>front/src/components/ElementIcon.vue</code></p>

        <div class="ds-grid">
          <div class="ds-item">
            <FactionIcon faction="technocrates" size="40px" />
            <span>Technocrates</span>
          </div>
          <div class="ds-item">
            <FactionIcon faction="ecolocusts" size="40px" />
            <span>Ecolocusts</span>
          </div>
          <div class="ds-item">
            <ElementIcon element="fire" size="40px" />
            <span>Feu</span>
          </div>
          <div class="ds-item">
            <ElementIcon element="water" size="40px" />
            <span>Eau</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AppButton from '../components/ui/AppButton.vue';
import AppBadge from '../components/ui/AppBadge.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppPanel from '../components/ui/AppPanel.vue';
import AppModal from '../components/ui/AppModal.vue';
import PremiumSelect from '../admin/components/PremiumSelect.vue';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import DifficultySelector from '../components/DifficultySelector.vue';
import FactionIcon from '../components/FactionIcon.vue';
import ElementIcon from '../components/ElementIcon.vue';

const difficulty = ref(50);
const showModal = ref(false);
const selectedOption = ref(null);
const selectOptions = [
  { label: 'Option A (Primary)', value: 'a' },
  { label: 'Option B (Secondary)', value: 'b' },
  { label: 'Option C (Accent)', value: 'c' }
];

const mockCard = {
  name: "Général d'Acier",
  imageUrl: "https://picsum.photos/400/600?random=1",
  top: 8,
  right: 5,
  bottom: 9,
  left: 2,
  element: "metal",
  rarity: "epic",
  skills: [{ type: "Growing" }],
  faction: "technocrates"
};
</script>

<style scoped>
.design-system-page {
  padding: 40px 20px;
  color: white;
  background: radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary, #ffbf00) 10%, transparent), transparent 40%),
              radial-gradient(circle at bottom left, color-mix(in srgb, var(--color-secondary, #3c5096) 10%, transparent), transparent 40%),
              #0a0a0f;
  min-height: 100vh;
  overflow-y: auto;
}

.ds-header {
  text-align: center;
  margin-bottom: 60px;
}

.ds-header h1 {
  font-size: 3rem;
  margin: 0;
  background: linear-gradient(to right, #fff, var(--color-primary, #ffbf00));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.subtitle {
  opacity: 0.7;
  font-size: 1.2rem;
}

.ds-container {
  max-width: 1200px;
  margin: 0 auto;
}

.ds-nav {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
  position: sticky;
  top: 20px;
  z-index: 100;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(10px);
  padding: 10px;
  border-radius: 99px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.ds-nav a {
  color: white;
  text-decoration: none;
  font-weight: 600;
  padding: 5px 15px;
  border-radius: 20px;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.ds-nav a:hover {
  background: var(--color-primary, #ffbf00);
  color: black;
}

.ds-section {
  margin-bottom: 80px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.ds-section h2 {
  font-size: 2rem;
  margin-bottom: 10px;
  border-left: 5px solid var(--color-primary, #ffbf00);
  padding-left: 15px;
}

.file-path {
  margin-bottom: 30px;
  opacity: 0.6;
  font-size: 0.9rem;
}

.file-path code {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-primary, #ffbf00);
}

.ds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 30px;
}

.ds-grid-large {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
}

.ds-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  text-align: center;
}

.ds-item span {
  font-size: 0.8rem;
  opacity: 0.5;
  font-family: monospace;
}
</style>
