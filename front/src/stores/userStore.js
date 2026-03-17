import { defineStore } from 'pinia';
import strapiService from '../api/strapi.js';
import strapiMock from '../api/strapiMock.js';

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    jwt: null,
    user: {
      id: null,
      username: 'Joueur Anonyme',
      avatar: 'https://api.dicebear.com/9.x/bottts/png?seed=player&backgroundColor=transparent',
      coins: 0,
      gems: 0,
      dust: 0
    },
    collection: [],
    userDecks: [],
    quests: [],
    strapiConnected: false,
    hasEverConnected: false,
    initializationStatus: 'loading' // 'loading' | 'ready'
  }),

  getters: {
    isOffline: (state) => !state.strapiConnected
  },

  actions: {
    setAuth(jwt, user) {
      this.jwt = jwt;
      this.user = {
        id: user.id,
        username: user.username,
        coins: user.coins || 0,
        gems: user.gems || 0,
        dust: user.dust || 0,
        avatar: `https://api.dicebear.com/9.x/bottts/png?seed=${user.username}&backgroundColor=transparent`
      };
      
      this.isLoggedIn = true;
      strapiService.setToken(jwt);
      localStorage.setItem('tt_jwt', jwt);
      localStorage.setItem('tt_user', JSON.stringify(user));

      // Initial Sync
      this.fetchUserCollection();
      this.fetchUserDecks();
      this.fetchUserQuests();
    },

    restoreAuth() {
      const savedJwt = localStorage.getItem('tt_jwt');
      const savedUser = localStorage.getItem('tt_user');
      if (savedJwt && savedUser) {
        try {
          this.setAuth(savedJwt, JSON.parse(savedUser));
        } catch (e) {
          this.logout();
        }
      }
    },

    logout() {
      this.jwt = null;
      this.user = {
        id: null,
        username: 'Joueur Anonyme',
        avatar: 'https://api.dicebear.com/9.x/bottts/png?seed=player&backgroundColor=transparent',
        coins: 0,
        gems: 0,
        dust: 0
      };
      this.isLoggedIn = false;
      this.collection = [];
      this.userDecks = [];
      this.quests = [];
      strapiService.signOut();
      localStorage.removeItem('tt_jwt');
      localStorage.removeItem('tt_user');
    },

    toArray(result) {
      if (Array.isArray(result)) return result;
      if (result?.data && Array.isArray(result.data)) return result.data;
      return [];
    },

    async fetchUserCollection() {
      if (!this.strapiConnected) {
          this.collection = strapiMock.getOfflineCollection();
          return;
      }
      if (!this.isLoggedIn) return;
      try {
        const result = await strapiService.find('user-cards', {
          populate: ['card'],
          pagination: { pageSize: 1000 }
        });
        const items = this.toArray(result);
        this.collection = items.map(item => ({
          id: item.id,
          cardId: item.card?.id,
          quantity: item.quantity,
          isPremium: !!item.isPremium
        }));

        const walletResult = await strapiService.request('GET', '/wallets/me');
        if (walletResult && walletResult.data) {
          const wallet = walletResult.data;
          this.user.coins = wallet.coins || 0;
          this.user.gems = wallet.gems || 0;
          this.user.dust = wallet.dust || 0;
          
          this.syncLocalUserWallets();
        }
        this.strapiConnected = true;
        this.hasEverConnected = true;
      } catch (e) {
        console.error('Collection sync failed, falling back to mock', e);
        this.collection = strapiMock.getOfflineCollection();
        if (e.status === 401) {
          console.warn('Session expired (401). Logging out.');
          this.logout();
        }
      }
    },

    async fetchUserDecks() {
      if (!this.strapiConnected) {
          this.userDecks = strapiMock.getOfflineUserDecks();
          return;
      }
      if (!this.isLoggedIn) return;
      try {
        const result = await strapiService.find('decks', {
          populate: ['cards']
        });
        const items = this.toArray(result);
        this.userDecks = items.map(item => ({
          id: item.id,
          documentId: item.documentId,
          name: item.name,
          cover: item.cover,
          cards: (item.cards || []).map(c => c.id)
        }));
      } catch (e) {
        console.error('Decks sync failed, falling back to mock', e);
        this.userDecks = strapiMock.getOfflineUserDecks();
        if (e.status === 401) {
          this.logout();
        }
      }
    },

    async fetchUserQuests() {
      if (!this.isLoggedIn) return;
      try {
        const result = await strapiService.find('player-quests', {
          populate: ['quest_template']
        });
        const items = this.toArray(result);
        this.quests = items.map(item => ({
          id: item.id,
          title: item.quest_template?.title || 'Quête sans titre',
          description: item.quest_template?.description || '',
          progress: item.progress || 0,
          target: item.quest_template?.target || 1,
          reward: item.quest_template?.rewardCoins || item.quest_template?.reward || 0,
          status: item.status || 'active'
        }));
      } catch (e) {
        console.error('Quests sync failed', e);
        this.quests = [];
      }
    },

    async saveDeck(deck) {
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
      if (!this.isLoggedIn) return false;
      const isNew = !deck.documentId;
      try {
        const payload = {
          name: deck.name,
          cover: deck.cover,
          cards: deck.cards,
          cardBack: deck.cardBack || 'default',
          user: this.user.id
        };
        if (isNew) {
          await strapiService.create('decks', payload);
        } else {
          await strapiService.update('decks', deck.documentId, payload);
        }
        this.fetchUserDecks();
        return true;
      } catch (e) {
        console.error('Deck save failed', e);
      }
      return false;
    },

    async deleteDeck(deckDocumentId) {
      if (!this.strapiConnected) {
          strapiMock.deleteDeck(deckDocumentId);
          this.fetchUserDecks();
          return true;
      }
      if (!this.isLoggedIn) return false;
      try {
        await strapiService.delete('decks', deckDocumentId);
        this.fetchUserDecks();
        return true;
      } catch (e) {
        console.error('Deck delete failed', e);
      }
      return false;
    },

    async craftCard(cardId) {
      if (!this.isLoggedIn) return false;
      try {
        const result = await strapiService.request('POST', '/user-cards/craft', {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId })
        });
        if (!result.error) {
          this.user.dust = result.newDustTotal;
          const existing = this.collection.find(c => c.cardId === cardId);
          if (existing) {
            existing.quantity = result.newQuantity;
          } else {
            this.collection.push({ cardId, quantity: 1 });
          }
          this.syncLocalUserWallets();
          return true;
        } else {
          console.error('Crafting failed:', result.error?.message || result.error);
          return false;
        }
      } catch (e) {
        console.error('Crafting failed', e);
        return false;
      }
    },

    async disenchantCard(cardId) {
      if (!this.isLoggedIn) return false;
      try {
        const result = await strapiService.request('POST', '/user-cards/disenchant', {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId })
        });
        if (!result.error) {
          this.user.dust = result.newDustTotal;
          const existingIndex = this.collection.findIndex(c => c.cardId === cardId);
          if (existingIndex !== -1) {
            if (result.newQuantity === 0) {
              this.collection.splice(existingIndex, 1);
            } else {
              this.collection[existingIndex].quantity = result.newQuantity;
            }
          }
          this.syncLocalUserWallets();
          return true;
        } else {
          console.error('Disenchant failed:', result.error?.message || result.error);
          return false;
        }
      } catch (e) {
        console.error('Disenchanting failed', e);
        return false;
      }
    },

    async massDisenchantCards() {
      if (!this.isLoggedIn) return false;
      try {
        const result = await strapiService.request('POST', '/user-cards/mass-disenchant', {
          headers: { 'Content-Type': 'application/json' }
        });

        if (!result.error) {
          if (result.cardsDestroyed > 0) {
            await this.fetchUserCollection();
          }
          return true;
        } else {
          console.error('Mass disenchant failed:', result.error?.message || result.error);
          return false;
        }
      } catch (e) {
        console.error('Mass disenchanting failed', e);
        return false;
      }
    },

    async addDevCurrencies(payload) {
      if (!this.isLoggedIn) return false;
      try {
        const result = await strapiService.request('POST', '/dev/add-currencies', {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!result.error) {
          if (result.coins !== undefined) this.user.coins = result.coins;
          if (result.gems !== undefined) this.user.gems = result.gems;
          if (result.dust !== undefined) this.user.dust = result.dust;
          this.syncLocalUserWallets();
          return true;
        }
        return false;
      } catch (e) {
        console.error('[Dev] Failed to add currencies:', e);
        return false;
      }
    },

    syncLocalUserWallets() {
      const savedUser = JSON.parse(localStorage.getItem('tt_user') || '{}');
      const updatedUser = { 
        ...savedUser,
        dust: this.user.dust, 
        coins: this.user.coins,
        gems: this.user.gems
      };
      localStorage.setItem('tt_user', JSON.stringify(updatedUser));
    },

    setConnectionStatus(isConnected) {
      this.strapiConnected = isConnected;
      if (isConnected) {
        this.hasEverConnected = true;
        if (this.isLoggedIn) {
          this.fetchUserCollection();
          this.fetchUserDecks();
          this.fetchUserQuests();
        }
      } else {
        // Fallback to offline data
        this.fetchUserCollection();
        this.fetchUserDecks();
      }
    }
  }
});
