import { defineStore } from 'pinia';
import strapiService from '../api/strapi.js';

export const usePlayerStore = defineStore('player', {
  state: () => ({
    profiles: {}, // Cache profiles by identifier
    loading: false,
    error: null
  }),
  
  actions: {
    async fetchProfile(identifier) {
      this.loading = true;
      this.error = null;
      try {
        const response = await strapiService.request('GET', `/player-profile/${identifier}`);
        if (response && response.data) {
          this.profiles[identifier] = response.data;
          return response.data;
        }
        throw new Error('Profil non trouvé');
      } catch (err) {
        console.error('Error fetching player profile:', err);
        this.error = err.message;
        return null;
      } finally {
        this.loading = false;
      }
    },

    async sendFriendRequest(identifier) {
      try {
        const response = await strapiService.request('POST', '/friendships/request', {
          body: { identifier }
        });
        return response;
      } catch (err) {
        console.error('Error sending friend request:', err);
        return { error: err.message };
      }
    },

    async removeFriendship(documentId) {
      try {
        const response = await strapiService.request('DELETE', `/friendships/${documentId}`);
        return response;
      } catch (err) {
        console.error('Error removing friendship:', err);
        return { error: err.message };
      }
    }
  }
});
