import cardsData from '../../../shared/data/cards.json';

const OFFLINE_DECKS_KEY = 'tt_offline_decks';

class StrapiMock {
  constructor() {
    this.cards = cardsData;
  }

  // Helper to load offline decks
  getOfflineDecks() {
    try {
      const data = localStorage.getItem(OFFLINE_DECKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Helper to save offline decks
  saveOfflineDecks(decks) {
    localStorage.setItem(OFFLINE_DECKS_KEY, JSON.stringify(decks));
  }

  // --- Collection Mock ---
  // Returns all cards with a large quantity
  getOfflineCollection() {
    return this.cards.map(card => ({
      id: card.id,
      cardId: card.id,
      quantity: 99,
      isPremium: false,
      card: card
    }));
  }

  // --- Decks Mock ---
  getOfflineUserDecks() {
    return this.getOfflineDecks().map(deck => ({
      id: deck.id,
      documentId: deck.documentId,
      name: deck.name,
      cover: deck.cover,
      cards: deck.cards // Card IDs
    }));
  }

  saveDeck(payload, deckDocumentId = null) {
    const decks = this.getOfflineDecks();
    if (deckDocumentId) {
      // Update
      const index = decks.findIndex(d => d.documentId === deckDocumentId);
      if (index !== -1) {
        decks[index] = { ...decks[index], ...payload };
      }
    } else {
      // Create
      const newDeck = {
        id: Date.now(),
        documentId: `offline_deck_${Date.now()}`,
        ...payload
      };
      decks.push(newDeck);
    }
    this.saveOfflineDecks(decks);
    return true;
  }

  deleteDeck(deckDocumentId) {
    const decks = this.getOfflineDecks();
    const updatedDecks = decks.filter(d => d.documentId !== deckDocumentId);
    this.saveOfflineDecks(updatedDecks);
    return true;
  }

  // --- Booster Mock ---
  openBooster() {
    // Return 5 random cards from the pool
    const pulled = [];
    for(let i=0; i<5; i++) {
        const randomIndex = Math.floor(Math.random() * this.cards.length);
        pulled.push(this.cards[randomIndex]);
    }
    return {
        success: true,
        cards: pulled,
        newGemsTotal: 0
    };
  }
}

const strapiMock = new StrapiMock();
export default strapiMock;
