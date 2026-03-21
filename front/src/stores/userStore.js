import { defineStore } from 'pinia';
import strapiService from '../api/strapi.js';
import strapiMock from '../api/strapiMock.js';
import { getCardById } from '../game/state.js';

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    jwt: null,
      user: {
        id: null,
        documentId: null,
        username: 'Joueur Anonyme',
        avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=player&backgroundColor=transparent',
        avatar_card: null,
        coins: 0,
        gems: 0,
        dust: 0
      },
    collection: [],
    collectionLoaded: false,
    userDecks: [],
    decksLoaded: false,
    quests: [],
    storyProgresses: [],
    storyProgressesLoaded: false,
    strapiConnected: false,
    hasEverConnected: false,
    initializationStatus: 'loading', // 'loading' | 'ready'
    error: null
  }),

  getters: {
    isOffline: (state) => !state.strapiConnected,
    isAdmin: (state) => state.user?.role === 'Admin' || state.user?.role === 'Super Admin'
  },

  actions: {
    async login(identifier, password) {
      this.error = null;
      try {
        const response = await strapiService.login({ identifier, password });
        if (response.error) {
          this.error = response.error.message || 'Login failed';
          return { error: response.error };
        }

        // Set initial auth to enable subsequent authenticated calls
        this.setAuth(response.jwt, response.user);
        
        // Fetch User with their role and wallet (Consolidated)
        await this.updateUserData();
        
        return { jwt: response.jwt, user: this.user };
      } catch (err) {
        console.error('Login error:', err);
        this.error = 'Network error';
        return { error: { message: 'Network error' } };
      }
    },

    async register(payload) {
      this.error = null;
      try {
        const response = await strapiService.register(payload);
        if (response.error) {
          this.error = response.error.message || 'Registration failed';
          return { error: response.error };
        }

        // Set initial auth to enable subsequent authenticated calls
        this.setAuth(response.jwt, response.user);

        // Fetch User with their role and wallet (Consolidated)
        await this.updateUserData();
        
        return { jwt: response.jwt, user: this.user };
      } catch (err) {
        console.error('Registration error:', err);
        this.error = 'Network error';
        return { error: { message: 'Network error' } };
      }
    },

    async updateUserData() {
      if (!this.isLoggedIn) return;
      try {
        // Consolidated call including role, wallet and avatar_card
        const meRes = await strapiService.request('GET', '/users/me?populate[role]=*&populate[wallet]=*&populate[avatar_card][populate][image]=*');
        if (!meRes.error) {
          // Handle nested wallet data from Strapi 5
          const wallet = meRes.wallet || {};
          
          this.user = {
            ...this.user,
            id: meRes.id,
            documentId: meRes.documentId,
            username: meRes.username,
            role: meRes.role?.name,
            avatar_card: meRes.avatar_card,
            avatar: meRes.avatar_card?.image?.url 
              ? `${strapiService.MEDIA_URL}${meRes.avatar_card.image.url}`
              : `https://api.dicebear.com/9.x/bottts/svg?seed=${meRes.username}&backgroundColor=transparent`,
            // Wallet data
            coins: wallet.coins ?? meRes.coins ?? 0,
            gems: wallet.gems ?? meRes.gems ?? 0,
            dust: wallet.dust ?? meRes.dust ?? 0
          };
          this.syncLocalUserWallets();
        }
      } catch (e) {
        console.error('Update user data failed', e);
      }
    },

    setAuth(jwt, user) {
      this.jwt = jwt;
      this.user = {
        id: user.id,
        documentId: user.documentId,
        username: user.username,
        role: user.role,
        coins: user.coins || 0,
        gems: user.gems || 0,
        dust: user.dust || 0,
        avatar_card: user.avatar_card || null,
        avatar: user.avatar_card?.image?.url 
          ? `${strapiService.MEDIA_URL}${user.avatar_card.image.url}`
          : `https://api.dicebear.com/9.x/bottts/svg?seed=${user.username}&backgroundColor=transparent`
      };
      
      this.isLoggedIn = true;
      strapiService.setToken(jwt);
      localStorage.setItem('tt_jwt', jwt);
      localStorage.setItem('tt_user', JSON.stringify(this.user));

      // Reset cache flags on new login
      this.collectionLoaded = false;
      this.decksLoaded = false;

      // Initial Sync (wallet is now synced in updateUserData)
      this.fetchUserCollection();
      this.fetchUserDecks();
      this.fetchUserQuests();
      this.fetchUserStoryProgresses();
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
        avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=player&backgroundColor=transparent',
        coins: 0,
        gems: 0,
        dust: 0,
        role: null
      };
      this.isLoggedIn = false;
      this.collection = [];
      this.collectionLoaded = false;
      this.userDecks = [];
      this.decksLoaded = false;
      this.quests = [];
      this.storyProgresses = [];
      this.storyProgressesLoaded = false;
      strapiService.signOut();
      localStorage.removeItem('tt_jwt');
      localStorage.removeItem('tt_user');
    },

    toArray(result) {
      if (Array.isArray(result)) return result;
      if (result?.data && Array.isArray(result.data)) return result.data;
      return [];
    },

    async fetchUserCollection(force = false) {
      if (!this.strapiConnected) {
          this.collection = strapiMock.getOfflineCollection();
          this.collectionLoaded = true;
          return;
      }
      if (!this.isLoggedIn) return;
      if (this.collectionLoaded && !force) return;

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
        this.collectionLoaded = true;

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

    async fetchUserDecks(force = false) {
      if (!this.strapiConnected) {
          this.userDecks = strapiMock.getOfflineUserDecks();
          this.decksLoaded = true;
          return;
      }
      if (!this.isLoggedIn) return;
      if (this.decksLoaded && !force) return;

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
        this.decksLoaded = true;
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

    async fetchUserStoryProgresses(force = false) {
      if (!this.strapiConnected) return;
      if (!this.isLoggedIn) return;
      if (this.storyProgressesLoaded && !force) return;

      try {
        const result = await strapiService.find('player-story-progresses', {
          filters: { user: this.user.id },
          populate: ['story']
        });
        this.storyProgresses = this.toArray(result);
        this.storyProgressesLoaded = true;
      } catch (e) {
        console.error('Story progress sync failed', e);
        this.storyProgresses = [];
      }
    },

    async saveDeck(deck, overrideUser = null) {
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
          cards: deck.cards.map(id => getCardById(id)?.documentId || id),
          cardBack: deck.cardBack || 'default',
          user: overrideUser || this.user.documentId || this.user.id
        };
        let res;
        if (isNew) {
          res = await strapiService.create('decks', payload);
        } else {
          res = await strapiService.update('decks', deck.documentId, payload);
        }

        // Local cache update
        const savedItem = res.data || res;
        if (savedItem) {
          const normalized = {
            id: savedItem.id,
            documentId: savedItem.documentId,
            name: savedItem.name,
            cover: savedItem.cover,
            cards: [...deck.cards] // Use current IDs to maintain UI state
          };

          if (isNew) {
            this.userDecks.push(normalized);
          } else {
            const index = this.userDecks.findIndex(d => d.documentId === deck.documentId);
            if (index !== -1) {
              this.userDecks[index] = normalized;
            }
          }
        }
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
        // Local cache update
        this.userDecks = this.userDecks.filter(d => d.documentId !== deckDocumentId);
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
          if (result.newDustTotal !== undefined) {
            this.user.dust = result.newDustTotal;
            this.syncLocalUserWallets();
          }
          if (result.totalCardsDisenchanted > 0) {
            this.collection.forEach(item => {
              if (item.quantity > 1) item.quantity = 1;
            });
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
        gems: this.user.gems,
        role: this.user.role
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
          this.fetchUserStoryProgresses();
        }
      } else {
        // Fallback to offline data
        this.fetchUserCollection();
        this.fetchUserDecks();
      }
    },

    async fetchUsers() {
      if (!this.strapiConnected || !this.isLoggedIn) return [];
      try {
        const result = await strapiService.request('GET', '/users');
        return this.toArray(result);
      } catch (e) {
        console.error('Failed to fetch users', e);
        return [];
      }
    },
    async updateProfile(payload) {
      if (!this.isLoggedIn) return { error: 'Not logged in' };
      try {
        // Use the new custom /users/profile/update endpoint
        const res = await strapiService.request('PUT', '/users/profile/update', {
          body: payload
        });
        
        if (!res.error) {
          await this.updateUserData();
          return { success: true };
        }
        return { error: res.error };
      } catch (e) {
        console.error('Update profile failed', e);
        return { error: 'Network error' };
      }
    }
  }
});
