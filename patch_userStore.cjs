const fs = require('fs');

const userStorePath = 'front/src/stores/userStore.js';
let content = fs.readFileSync(userStorePath, 'utf8');

// Add import for mock
if (!content.includes('strapiMock')) {
    content = content.replace("import strapiService from '../api/strapi.js';", "import strapiService from '../api/strapi.js';\nimport strapiMock from '../api/strapiMock.js';");
}

// Modify fetchUserCollection
const fetchCollectionSearch = `    async fetchUserCollection() {
      if (!this.isLoggedIn) return;
      try {
        const result = await strapiService.find('user-cards', {`;

const fetchCollectionReplace = `    async fetchUserCollection() {
      if (!this.isLoggedIn) return;
      if (!this.strapiConnected) {
          this.collection = strapiMock.getOfflineCollection();
          return;
      }
      try {
        const result = await strapiService.find('user-cards', {`;

content = content.replace(fetchCollectionSearch, fetchCollectionReplace);

// Modify fetchUserDecks
const fetchDecksSearch = `    async fetchUserDecks() {
      if (!this.isLoggedIn) return;
      try {
        const result = await strapiService.find('decks', {`;

const fetchDecksReplace = `    async fetchUserDecks() {
      if (!this.isLoggedIn) return;
      if (!this.strapiConnected) {
          this.userDecks = strapiMock.getOfflineUserDecks();
          return;
      }
      try {
        const result = await strapiService.find('decks', {`;

content = content.replace(fetchDecksSearch, fetchDecksReplace);

// Modify saveDeck
const saveDeckSearch = `    async saveDeck(deck) {
      if (!this.isLoggedIn) return false;
      const isNew = !deck.documentId;
      try {`;

const saveDeckReplace = `    async saveDeck(deck) {
      if (!this.isLoggedIn) return false;
      if (!this.strapiConnected) {
          const payload = {
              name: deck.name,
              cover: deck.cover,
              cards: deck.cards
          };
          strapiMock.saveDeck(payload, deck.documentId);
          this.fetchUserDecks();
          return true;
      }
      const isNew = !deck.documentId;
      try {`;

content = content.replace(saveDeckSearch, saveDeckReplace);

// Modify deleteDeck
const deleteDeckSearch = `    async deleteDeck(deckDocumentId) {
      if (!this.isLoggedIn) return false;
      try {`;

const deleteDeckReplace = `    async deleteDeck(deckDocumentId) {
      if (!this.isLoggedIn) return false;
      if (!this.strapiConnected) {
          strapiMock.deleteDeck(deckDocumentId);
          this.fetchUserDecks();
          return true;
      }
      try {`;

content = content.replace(deleteDeckSearch, deleteDeckReplace);


fs.writeFileSync(userStorePath, content);
console.log('userStore.js patched');
