import { defineStore } from 'pinia';
import strapiService from '../api/strapi.js';
import strapiMock from '../api/strapiMock.js';
import { getCardById } from '../game/state.js';
import { getStrapiUrl, getStrapiMediaUrl } from '../utils/url.js';
import { useEffectStore } from './effectStore.js';
import DEFAULT_FRAME_COORDS from '../game/frame_defaults.json';

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
        dust: 0,
        boosters: []
      },
    collection: [],
    collectionLoaded: false,
    userDecks: [],
    decksLoaded: false,
    quests: [],
    weeklyConfig: null,
    weeklyProgress: null,
    storyProgresses: [],
    storyProgressesLoaded: false,
    collections: [],
    collectionsLoaded: false,
    strapiConnected: false,
    hasEverConnected: false,
    initializationStatus: 'loading', // 'loading' | 'ready'
    isOfflineStoryMode: false,
    gameConfig: null,
    cardFrames: [],
    cardFramesLoaded: false,
    defaultFrameId: null, // Set to the documentId of the default frame
    cardBacks: [],
    cardBacksLoaded: false,
    defaultBackId: null,
    boardBackgrounds: [],
    boardBackgroundsLoaded: false,
    error: null
  }),
  getters: {
    defaultFrame(state) {
      if (state.defaultFrameId) {
        const found = state.cardFrames.find(f => f.documentId === state.defaultFrameId || f.id === state.defaultFrameId);
        if (found) return found;
      }
      
      // Fallback to global default frame from gameConfig
      if (state.gameConfig?.defaultCardFrame) {
        const globalDefault = state.gameConfig.defaultCardFrame;
        const foundGlobal = state.cardFrames.find(f => f.documentId === globalDefault.documentId || f.id === globalDefault.id);
        if (foundGlobal) return foundGlobal;
      }

      return state.cardFrames[0] || null;
    },
    unlockedFrames(state) {
      if (!state.user) return [];
      // Handle both objects and primitive IDs
      const unlocked = (state.user.unlockedCardFrames || []).map(f => {
        if (typeof f === 'object' && f !== null) return f;
        return { id: f, documentId: String(f) };
      });
      
      let globalDefault = state.gameConfig?.defaultCardFrame;
      if (globalDefault) {
        const flatGlobal = globalDefault.data 
          ? { id: globalDefault.data.id, documentId: globalDefault.data.documentId, ...globalDefault.data.attributes }
          : globalDefault;

        const gId = String(flatGlobal.documentId || flatGlobal.id);
        const hasGlobal = unlocked.some(f => String(f.documentId || f.id) === gId);
        if (!hasGlobal) {
          unlocked.push(flatGlobal);
        }
      }
      return unlocked;
    },
    defaultBack(state) {
      if (state.defaultBackId) {
        const found = state.cardBacks.find(b => String(b.documentId || b.id) === String(state.defaultBackId));
        if (found) return found;
      }
      
      let globalDefault = state.gameConfig?.defaultCardBack;
      if (globalDefault) {
        const flatGlobal = globalDefault.data 
          ? { id: globalDefault.data.id, documentId: globalDefault.data.documentId, ...globalDefault.data.attributes }
          : globalDefault;
        
        const gId = String(flatGlobal.documentId || flatGlobal.id);
        const foundGlobal = state.cardBacks.find(b => String(b.documentId || b.id) === gId);
        if (foundGlobal) return foundGlobal;
      }

      return state.cardBacks[0] || null;
    },
    unlockedBacks(state) {
      if (!state.user) return [];
      // Handle both objects and primitive IDs
      const unlocked = (state.user.unlockedCardBacks || []).map(b => {
        if (typeof b === 'object' && b !== null) return b;
        return { id: b, documentId: String(b) };
      });
      
      let globalDefault = state.gameConfig?.defaultCardBack;
      if (globalDefault) {
        const flatGlobal = globalDefault.data 
          ? { id: globalDefault.data.id, documentId: globalDefault.data.documentId, ...globalDefault.data.attributes }
          : globalDefault;

        const gId = String(flatGlobal.documentId || flatGlobal.id);
        const hasGlobal = unlocked.some(b => String(b.documentId || b.id) === gId);
        if (!hasGlobal) {
          unlocked.push(flatGlobal);
        }
      }
      return unlocked;
    },
    isAdmin: (state) => {
      if (!state.user || !state.user.role) return false;
      const role = state.user.role;
      if (typeof role === 'string') return role.toLowerCase() === 'admin';
      return role.type === 'admin' || (role.name && role.name.toLowerCase() === 'admin');
    },
    latestStoryProgress: (state) => {
      if (!state.storyProgresses || state.storyProgresses.length === 0) return null;
      return [...state.storyProgresses]
        .filter(p => p.status !== 'completed' && p.progressStatus !== 'completed')
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.updated_at || 0);
          const dateB = new Date(b.updatedAt || b.updated_at || 0);
          return dateB - dateA;
        })[0] || null;
    },
    hasClaimableQuests: (state) => {
      return state.quests.some(q => q.status === 'completed' && !q.rewardClaimed);
    },
    hasClaimableWeeklyTiers: (state) => {
       if (!state.weeklyConfig || !state.weeklyProgress) return false;
       const completed = state.weeklyProgress.completedCount || 0;
       const claimed = state.weeklyProgress.claimedTiers || [];
       const tiers = state.weeklyConfig.tiers || [];
       return tiers.some(t => completed >= t.requiredCount && !claimed.includes(t.requiredCount));
    },
    claimableWeeklyTiers: (state) => {
      if (!state.weeklyConfig || !state.weeklyProgress) return [];
      const completed = state.weeklyProgress.completedCount || 0;
      const claimed = state.weeklyProgress.claimedTiers || [];
      const tiers = state.weeklyConfig.tiers || [];
      return tiers.filter(t => completed >= t.requiredCount && !claimed.includes(t.requiredCount));
    },
    totalBoostersCount: (state) => {
      if (!state.user || !state.user.boosters) return 0;
      return state.user.boosters.reduce((total, b) => total + (b.quantity || 0), 0);
    }
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
        
        // --- ADDED: Wait for backend to finish quest generation ---
        // Registration triggers quest creation on backend, which might take a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.fetchUserQuests();
        await this.fetchWeeklyQuests();
        // -----------------------------------------------------------
        
        return { jwt: response.jwt, user: this.user };
      } catch (err) {
        console.error('Registration error:', err);
        this.error = 'Network error';
        return { error: { message: 'Network error' } };
      }
    },

    async updateUserData() {
      if (!this.isLoggedIn) return;
      this.initializationStatus = 'loading';
      console.log('[UserStore] Starting full user data update...');

      try {
        // We run all fetches in parallel for better performance
        // and wrap them in allSettled so one failure doesn't block everything
        const results = await Promise.allSettled([
          this.fetchMe(),
          this.fetchUserWallet(),
          this.fetchUserAssets(),
          this.fetchUserAvatar(),
          this.fetchCollections(),
          this.fetchCardFrames(),
          this.fetchCardBacks(),
          this.fetchBoardBackgrounds()
        ]);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const tasks = ['Basic Profile', 'Wallet', 'Assets (Frames/Backs)', 'Avatar'];
            console.error(`[UserStore] ${tasks[index]} fetch failed:`, result.reason);
          }
        });

        this.initializationStatus = 'ready';
        this.syncLocalUserWallets();
        console.log('[UserStore] User data update completed.');
      } catch (e) {
        console.error('[UserStore] Critical error during updateUserData:', e);
      }
    },

    async fetchMe() {
      try {
        const res = await strapiService.request('GET', '/users/me?populate[role]=*');
        if (res && !res.error) {
          this.user.id = res.id;
          this.user.documentId = res.documentId;
          this.user.username = res.username;
          this.user.role = res.role?.name || res.role;
          return res;
        }
        throw new Error(res?.error?.message || 'Failed to fetch basic profile');
      } catch (e) {
        console.error('[UserStore] fetchMe failed:', e);
        throw e;
      }
    },

    async fetchUserWallet() {
      try {
        // Use the dedicated /wallets/me endpoint which is safer and handles creation if needed
        const res = await strapiService.request('GET', '/wallets/me');
        
        const walletData = res?.data || res;
        if (walletData) {
          this.user.coins = walletData.coins ?? 0;
          this.user.gems = walletData.gems ?? 0;
          this.user.dust = walletData.dust ?? 0;
          this.user.boosters = walletData.boosters ?? [];
          return walletData;
        }
        
        // Fallback: maybe it's nested in /users/me
        const meRes = await strapiService.request('GET', '/users/me?populate[wallet]=*');
        if (meRes && meRes.wallet) {
          this.user.coins = meRes.wallet.coins ?? 0;
          this.user.gems = meRes.wallet.gems ?? 0;
          this.user.dust = meRes.wallet.dust ?? 0;
          this.user.boosters = meRes.wallet.boosters ?? [];
          return meRes.wallet;
        }
        
        console.warn('[UserStore] No wallet found for user');
        return null;
      } catch (e) {
        console.error('[UserStore] fetchUserWallet failed:', e);
        throw e;
      }
    },

    async fetchUserAssets() {
      try {
        // Fetching frames and backs specifically
        const res = await strapiService.request('GET', '/users/me?populate[unlockedCardFrames]=*&populate[unlockedCardBacks]=*&populate[defaultCardBack]=*&populate[defaultCardFrame]=*');
        
        if (res && !res.error) {
          this.user.unlockedCardFrames = res.unlockedCardFrames || [];
          this.user.unlockedCardBacks = res.unlockedCardBacks || [];
          this.user.defaultCardFrame = res.defaultCardFrame || null;
          this.user.defaultCardBack = res.defaultCardBack || null;
          
          this.defaultFrameId = res.defaultCardFrame?.documentId || res.defaultCardFrame?.id || null;
          this.defaultBackId = res.defaultCardBack?.documentId || res.defaultCardBack?.id || null;
          
          return res;
        }
        throw new Error(res?.error?.message || 'Failed to fetch user assets');
      } catch (e) {
        console.error('[UserStore] fetchUserAssets failed:', e);
        throw e;
      }
    },

    async fetchUserAvatar() {
      try {
        // Fetching avatar specifically
        const res = await strapiService.request('GET', '/users/me?populate[avatar_card][populate][image]=*');
        
        if (res && !res.error) {
          this.user.avatar_card = res.avatar_card || null;
          this.user.avatar = res.avatar_card?.image?.url 
            ? getStrapiMediaUrl(res.avatar_card.image.url)
            : `https://api.dicebear.com/9.x/bottts/svg?seed=${res.username || 'player'}&backgroundColor=transparent`;
          return res;
        }
        throw new Error(res?.error?.message || 'Failed to fetch user avatar');
      } catch (e) {
        console.error('[UserStore] fetchUserAvatar failed:', e);
        throw e;
      }
    },

    setAuth(jwt, user) {
      this.jwt = jwt;
      this.user = {
        id: user.id,
        documentId: user.documentId,
        username: user.username,
        role: user.role,
        coins: user.wallet?.coins || 0,
        gems: user.wallet?.gems || 0,
        dust: user.wallet?.dust || 0,
        boosters: user.wallet?.boosters || [],
        avatar_card: user.avatar_card || null,
        avatar: user.avatar_card?.image?.url 
          ? getStrapiMediaUrl(user.avatar_card.image.url)
          : `https://api.dicebear.com/9.x/bottts/svg?seed=${user.username}&backgroundColor=transparent`,
        unlockedCardFrames: user.unlockedCardFrames || [],
        unlockedCardBacks: user.unlockedCardBacks || []
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
      this.fetchCollections();
      this.fetchUserDecks();
      this.fetchUserQuests();
          this.fetchWeeklyQuests();
      this.fetchUserStoryProgresses();
      this.fetchCardFrames();
      this.fetchCardBacks();
      this.fetchBoardBackgrounds();
      
      const effectStore = useEffectStore();
      effectStore.fetchEffects();
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
        boosters: [],
        role: null,
        unlockedCardFrames: []
      };
      this.isLoggedIn = false;
      this.isOfflineStoryMode = false;
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
        let items = [];
        let page = 1;
        let pageCount = 1;

        do {
          const result = await strapiService.find('user-cards', {
            populate: ['card'],
            pagination: { page, pageSize: 100 }
          });
          
          const rawItems = this.toArray(result);
          items = [...items, ...rawItems];
          
          const meta = result?.meta?.pagination;
          pageCount = meta?.pageCount || 1;
          page++;
        } while (page <= pageCount);

        this.collection = items.map(item => {
          const card = item.card?.data || item.card; 
          return {
            id: item.id,
            userCardDocumentId: item.documentId,
            cardId: card?.id || null,
            cardDocumentId: card?.documentId || null,
            quantity: item.quantity,
            isPremium: !!item.isPremium,
            selectedVariantIndex: item.selectedVariantIndex || 0
          };
        });
        this.collectionLoaded = true;


        this.strapiConnected = true;
        this.hasEverConnected = true;

        const effectStore = useEffectStore();
        effectStore.fetchEffects();
      } catch (e) {
        console.error('Collection sync failed, falling back to mock', e);
        this.collection = strapiMock.getOfflineCollection();
        if (e.status === 401) {
          console.warn('Session expired (401). Logging out.');
          this.logout();
        }
      }
    },
    
    async fetchCollections(force = false) {
      if (!this.strapiConnected) return;
      if (this.collectionsLoaded && !force) return;
      try {
        const result = await strapiService.find('collections', {
          populate: ['boosterImage'],
          sort: ['code:asc']
        });
        const items = this.toArray(result);
        this.collections = items.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          boosterImage: item.boosterImage?.url ? getStrapiMediaUrl(item.boosterImage.url) : null,
          boosterCostMultiplier: item.boosterCostMultiplier ?? 1.0,
          premiumBoosterCostMultiplier: item.premiumBoosterCostMultiplier ?? 1.0,
          isActive: item.isActive ?? true,
          startDate: item.startDate || null
        }));
        this.collectionsLoaded = true;
      } catch (e) {
        console.error('Failed to fetch collections', e);
      }
    },

    async fetchCardFrames(force = false) {
      if (!this.strapiConnected) return;
      if (this.cardFramesLoaded && !force) return;
      try {
        const result = await strapiService.find('card-frames', {
          populate: ['image', 'imageUncommon', 'imageRare', 'imageEpic', 'imageLegendary'],
          sort: ['id:asc']
        });
        const items = this.toArray(result);
        this.cardFrames = items.map(item => ({
          id: item.id,
          documentId: item.documentId,
          name: item.name,
          description: item.description,
          image: item.image?.url ? getStrapiMediaUrl(item.image.url) : null,
          imageUncommon: item.imageUncommon?.url ? getStrapiMediaUrl(item.imageUncommon.url) : null,
          imageRare: item.imageRare?.url ? getStrapiMediaUrl(item.imageRare.url) : null,
          imageEpic: item.imageEpic?.url ? getStrapiMediaUrl(item.imageEpic.url) : null,
          imageLegendary: item.imageLegendary?.url ? getStrapiMediaUrl(item.imageLegendary.url) : null,
          illustrationX: item.illustrationX ?? DEFAULT_FRAME_COORDS.illustrationX,
          illustrationY: item.illustrationY ?? DEFAULT_FRAME_COORDS.illustrationY,
          illustrationWidth: item.illustrationWidth ?? DEFAULT_FRAME_COORDS.illustrationWidth,
          illustrationHeight: item.illustrationHeight ?? DEFAULT_FRAME_COORDS.illustrationHeight,
          topX: item.topX ?? DEFAULT_FRAME_COORDS.topX,
          topY: item.topY ?? DEFAULT_FRAME_COORDS.topY,
          bottomX: item.bottomX ?? DEFAULT_FRAME_COORDS.bottomX,
          bottomY: item.bottomY ?? DEFAULT_FRAME_COORDS.bottomY,
          leftX: item.leftX ?? DEFAULT_FRAME_COORDS.leftX,
          leftY: item.leftY ?? DEFAULT_FRAME_COORDS.leftY,
          rightX: item.rightX ?? DEFAULT_FRAME_COORDS.rightX,
          rightY: item.rightY ?? DEFAULT_FRAME_COORDS.rightY,
          elementX: item.elementX ?? DEFAULT_FRAME_COORDS.elementX,
          elementY: item.elementY ?? DEFAULT_FRAME_COORDS.elementY,
          nameX: item.nameX ?? DEFAULT_FRAME_COORDS.nameX,
          nameY: item.nameY ?? DEFAULT_FRAME_COORDS.nameY,
          skillsX: item.skillsX ?? DEFAULT_FRAME_COORDS.skillsX,
          skillsY: item.skillsY ?? DEFAULT_FRAME_COORDS.skillsY,
          priceCoins: item.priceCoins ?? 0,
          priceGems: item.priceGems ?? 250
        }));
        this.cardFramesLoaded = true;
      } catch (e) {
        console.error('Failed to fetch card frames', e);
      }
    },

    async fetchCardBacks(force = false) {
      if (!this.strapiConnected) return;
      if (this.cardBacksLoaded && !force) return;
      try {
        const result = await strapiService.find('card-backs', {
          populate: ['image'],
          sort: ['id:asc']
        });
        const items = this.toArray(result);
        this.cardBacks = items.map(item => ({
          id: item.id,
          documentId: item.documentId,
          name: item.name,
          description: item.description,
          image: item.image?.url ? getStrapiMediaUrl(item.image.url) : null,
          priceCoins: item.priceCoins ?? 0,
          priceGems: item.priceGems ?? 250,
          slug: item.slug
        }));
        this.cardBacksLoaded = true;
      } catch (e) {
        console.error('Failed to fetch card backs', e);
      }
    },

    async buyCardBack(backId, currency = 'gems') {
      if (!this.isLoggedIn) return { error: 'Not logged in' };
      try {
        const res = await strapiService.request('POST', '/card-backs/buy', {
          body: { backId, currency }
        });
        
        if (!res.error && res.success) {
          if (res.wallet) {
            this.user.coins = res.wallet.coins;
            this.user.gems = res.wallet.gems;
            this.syncLocalUserWallets();
          }
          await this.updateUserData(); // refresh unlocked backs
          return { success: true };
        }
        return { error: res.error?.message || 'Achat échoué' };
      } catch (e) {
        console.error('buyCardBack failed', e);
        return { error: e.message || 'Network error' };
      }
    },

    async fetchBoardBackgrounds(force = false) {
      if (!this.strapiConnected) return;
      if (this.boardBackgroundsLoaded && !force) return;
      try {
        const result = await strapiService.find('board-backgrounds', {
          populate: ['image'],
          sort: ['name:asc']
        });
        const items = this.toArray(result);
        this.boardBackgrounds = items.map(item => ({
          id: item.id,
          documentId: item.documentId,
          name: item.name,
          description: item.description,
          image: item.image?.url ? getStrapiMediaUrl(item.image.url) : null
        }));
        this.boardBackgroundsLoaded = true;
      } catch (e) {
        console.error('Failed to fetch board backgrounds', e);
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
          populate: ['cards', 'cardFrame', 'cardBack']
        });
        const items = this.toArray(result);
        this.userDecks = items.map(item => ({
          id: item.id,
          documentId: item.documentId,
          name: item.name,
          cover: item.cover,
          cardBack: item.cardBack?.documentId || item.cardBack?.id || null,
          cardFrame: item.cardFrame?.documentId || item.cardFrame?.id || null,
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
      if (!this.strapiConnected) return;
      if (!this.isLoggedIn) return;
      try {
        const result = await strapiService.request('GET', '/player-quests');
        if (result && result.data) {
          this.quests = result.data.map(item => ({
            id: item.id,
            ...item,
            // Parse dates
            startsAt: item.startsAt ? new Date(item.startsAt) : null,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
            // Safety mapping for component expectations
            title: item.quest_template?.title || item.title,
            description: item.quest_template?.description || item.description,
            target: item.quest_template?.target || item.target || 1,
            rewardCoins: item.quest_template?.rewardCoins || item.rewardCoins || 0,
            rewardGems: item.quest_template?.rewardGems || item.rewardGems || 0,
            type: item.quest_template?.type || item.type || 'daily'
          }));
        }
      } catch (e) {
        console.error('Failed to fetch user quests', e);
      }
    },

    async fetchWeeklyQuests() {
      if (!this.strapiConnected) return;
      if (!this.isLoggedIn) return;
      try {
        const configResult = await strapiService.request('GET', '/weekly-quest/config');
        if (configResult && configResult.data) {
          this.weeklyConfig = configResult.data;
        }

        const progressResult = await strapiService.request('GET', '/weekly-quest/progress');
        if (progressResult && progressResult.data) {
          this.weeklyProgress = progressResult.data;
        }
      } catch (e) {
        console.error('Failed to fetch weekly quests', e);
      }
    },

    async claimWeeklyTier(requiredCount) {
      if (!this.strapiConnected) return null;
      try {
        const result = await strapiService.request('POST', '/weekly-quest/claim', {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requiredCount })
        });

        if (result && result.success) {
          this.weeklyProgress = result.progress;
          if (result.reward) {
             if (result.reward.coins) this.user.coins += result.reward.coins;
             if (result.reward.gems) this.user.gems += result.reward.gems;
             this.syncLocalUserWallets();
             if (result.reward.card) {
               // Reload collection to reflect the new card
               this.fetchUserCollection(true);
             }
          }
          return result.reward;
        }
        return null;
      } catch (e) {
        console.error('Failed to claim weekly tier', e);
        return null;
      }
    },


    async claimQuestReward(questId) {
      if (!this.isLoggedIn) return { error: 'Not logged in' };
      try {
        const res = await strapiService.claimQuestReward(questId);
        if (res.success) {
          // Update local wallet
          if (res.reward) {
            this.user.coins += (res.reward.coins || 0);
            this.user.gems += (res.reward.gems || 0);
            this.syncLocalUserWallets();
          }
          // Refresh quests to update claimed status
          await this.fetchUserQuests();
          this.fetchWeeklyQuests();
          return { success: true, reward: res.reward };
        }
        return { error: res.error?.message || 'Failed to claim reward' };
      } catch (e) {
        console.error('Claim reward failed', e);
        return { error: 'Network error' };
      }
    },


    async saveStepProgress(storyId, stepId, currentSituationId, historyEntry = null) {
      if (!this.strapiConnected) return null;
      if (!this.isLoggedIn) return null;

      try {
        const token = localStorage.getItem('tt_jwt');
        const response = await fetch(getStrapiUrl('/player-story-progress/save-step-progress'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ storyId, stepId, currentSituationId, historyEntry })
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error?.message || 'Failed to save progress');
        }

        const data = await response.json();
        await this.fetchUserStoryProgresses(true);
        return data;
      } catch (e) {
        console.error('saveStepProgress failed', e);
        return null;
      }
    },

    async claimSituationReward(storyId, stepId, situationId) {
      if (!this.strapiConnected) return null;
      if (!this.isLoggedIn) return null;

      try {
        const token = localStorage.getItem('tt_jwt');
        const response = await fetch(getStrapiUrl('/player-story-progress/claim-step-reward'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ storyId, stepId, situationId })
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error?.message || 'Failed to claim reward');
        }

        const data = await response.json();

        if (data.coins) {
           this.user.coins += data.coins;
           this.syncLocalUserWallets();
        }

        await this.fetchUserStoryProgresses(true);
        return data;
      } catch (e) {
        console.error('claimSituationReward failed', e);
        return null;
      }
    },

    async fetchUserStoryProgresses(force = false) {
      if (!this.strapiConnected) return;
      if (!this.isLoggedIn) return;
      if (this.storyProgressesLoaded && !force) return;

      try {
        const result = await strapiService.find('player-story-progresses', {
          populate: ['story', 'currentStep']
        });
        this.storyProgresses = this.toArray(result);
        this.storyProgressesLoaded = true;
      } catch (e) {
        console.error('Story progress sync failed', e);
        this.storyProgresses = [];
      }
    },

    /**
     * Updates the local cache with booster opening results
     * @param {Object} data - The data returned by /booster/open
     */
    async handleBoosterResults(data) {
      if (!data || !data.wallet) return;

      // 1. Update Wallet & Boosters
      this.user.coins = data.wallet.coins;
      this.user.gems = data.wallet.gems;
      this.user.dust = data.wallet.dust;
      this.user.boosters = data.wallet.boosters;
      this.syncLocalUserWallets();

      // 2. Update Collection Cache (Optimistic UI)
      if (data.cards && Array.isArray(data.cards)) {
        data.cards.forEach(newCard => {
          const cardId = newCard.id;
          const isPremium = !!newCard.isDrawnPremium;
          
          const existing = this.collection.find(c => c.cardId === cardId && c.isPremium === isPremium);
          if (existing) {
            existing.quantity += 1;
          } else {
            this.collection.push({
              id: null, // Temporary, will be filled by fetchUserCollection
              cardId: cardId,
              cardDocumentId: newCard.documentId,
              quantity: 1,
              isPremium: isPremium
            });
          }
        });
      }

      // 3. Background Sync to get real IDs and ensure consistency
      if (this.strapiConnected) {
        console.log('[UserStore] Booster opened, background collection sync starting...');
        this.fetchUserCollection(true);
        // Also refresh quests as booster opening is now tracked server-side
        this.fetchUserQuests();
        this.fetchWeeklyQuests();
      }
    },

    async updateCardVariant(userCardDocumentId, variantIndex) {
      if (!this.strapiConnected || !this.isLoggedIn) return false;
      try {
        const res = await strapiService.request('PUT', `/user-cards/${userCardDocumentId}/variant`, {
          body: { variantIndex }
        });
        if (!res.error) {
          // Update local collection cache
          const item = this.collection.find(c => c.userCardDocumentId === userCardDocumentId || c.id === userCardDocumentId);
          if (item) {
            item.selectedVariantIndex = variantIndex;
          }
          return true;
        }
        return false;
      } catch (e) {
        console.error('Failed to update card variant', e);
        return false;
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
      let payload = null;
      try {
        const cardDocumentIds = deck.cards
          .map(id => getCardById(id)?.documentId)
          .filter(docId => !!docId);

        if (cardDocumentIds.length < deck.cards.length && !this.isAdmin) {
          console.warn('[UserStore] Some cards are missing documentId. Deck might be incomplete on server.');
        }

        if (isNew && !this.isAdmin) {
          const maxDecks = this.gameConfig?.maxDecksPerUser ?? 5;
          if (this.userDecks.length >= maxDecks) {
            throw new Error(`Limite de decks atteinte (${maxDecks}).`);
          }
        }

        payload = {
          data: {
            name: deck.name,
            cover: deck.cover || 1, // Default to 1 if null
            cards: cardDocumentIds,
            cardBack: (deck.cardBack && deck.cardBack !== 'default' && deck.cardBack !== 'animated') ? deck.cardBack : null,
            cardFrame: deck.cardFrame || null,
            user: overrideUser || this.user.documentId || this.user.id // Prefer documentId for Strapi 5 relations
          }
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
            cardBack: savedItem.cardBack?.documentId || savedItem.cardBack?.id || deck.cardBack || null,
            cardFrame: savedItem.cardFrame?.documentId || savedItem.cardFrame?.id || deck.cardFrame || null,
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
        console.error('Deck save failed. Payload:', payload);
        if (e.data) {
          console.error('Strapi Error Details:', e.data.error?.details || e.data.error);
        }
        console.error('Error details:', e);
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
          if (result.cardsDestroyed > 0 || result.totalCardsDisenchanted > 0) {
            this.collection.forEach(item => {
              // The backend reduces quantity to playableLimit (default 2)
              if (item.quantity > 2) item.quantity = 2;
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
        boosters: this.user.boosters,
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
          this.fetchWeeklyQuests();
          this.fetchUserStoryProgresses();
        }
      } else {
        // Fallback to offline data
        this.fetchUserCollection();
        this.fetchUserDecks();
      }
    },

    setGameConfig(config) {
      this.gameConfig = config;
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
    },
    async resetStoryProgress(storyId) {
      if (!this.strapiConnected || !this.isLoggedIn) return null;
      try {
        const token = localStorage.getItem('tt_jwt');
        const response = await fetch(getStrapiUrl('/player-story-progress/reset'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ storyId })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || 'Failed to reset progress');
        }

        const data = await response.json();
        await this.fetchUserStoryProgresses(true);
        return data;
      } catch (e) {
        console.error('resetStoryProgress failed', e);
        return null;
      }
    },
    toggleOfflineStoryMode(value) {
      this.isOfflineStoryMode = value;
    },
    async buyFrame(frameId, currency = 'gems') {
      if (!this.isLoggedIn) return { error: 'Not logged in' };
      try {
        const res = await strapiService.request('POST', '/card-frames/buy', {
          body: { frameId, currency }
        });
        
        if (!res.error && res.success) {
          if (res.wallet) {
            this.user.coins = res.wallet.coins;
            this.user.gems = res.wallet.gems;
            this.syncLocalUserWallets();
          }
          await this.updateUserData(); // refresh unlocked frames
          return { success: true };
        }
        return { error: res.error?.message || 'Achat échoué' };
      } catch (e) {
        console.error('buyFrame failed', e);
        return { error: e.message || 'Network error' };
      }
    }
  }
});
