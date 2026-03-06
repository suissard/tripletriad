const fs = require('fs');

let content = fs.readFileSync('front/src/components/RightDrawer.vue', 'utf8');

content = content.replace(
  `          <div class="menu-list">
            <!-- <button class="menu-item"> -->
              <span class="icon">⚙️</span>
              Paramètres du Jeu
            </button>
            <!-- <button class="menu-item" @click="openDecksPage"> -->
              <span class="icon">🎴</span>
              Mes Decks ({{ state.userDecks.length }}/5)
            </button>
            <!-- <button class="menu-item" @click="openCollectionPage"> -->
              <span class="icon">📚</span>
              Ma Collection ({{ state.collection.length }} / 45)
            </button>
            <!-- <button class="menu-item"> -->
              <span class="icon">📜</span>
              Historique des Matchs
            </button>
          </div>`,
  `          <div class="menu-list">
            <HoloButton text="⚙️ Paramètres du Jeu" activeText="Ouverture..." />
            <HoloButton :text="\`🎴 Mes Decks (\${state.userDecks.length}/5)\`" activeText="Ouverture..." @click="openDecksPage" />
            <HoloButton :text="\`📚 Ma Collection (\${state.collection.length} / 45)\`" activeText="Ouverture..." @click="openCollectionPage" />
            <HoloButton text="📜 Historique des Matchs" activeText="Ouverture..." />
          </div>`
);

// Add import
content = content.replace(
  `import TripleTriadCard from './TripleTriadCard.vue';`,
  `import TripleTriadCard from './TripleTriadCard.vue';\nimport HoloButton from './HoloButton.vue';`
);

fs.writeFileSync('front/src/components/RightDrawer.vue', content);
