import { defineStore } from 'pinia';
import strapiService from '../api/strapi.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    jwt: null,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.jwt,
  },
  actions: {
    async login(identifier, password) {
      this.error = null;
      try {
        const response = await strapiService.login(identifier, password);
        if (response.error) {
          this.error = response.error.message || 'Login failed';
          return false;
        }

        this.jwt = response.jwt;
        strapiService.setToken(this.jwt);

        // Fetch User with their role to ensure they are Admin
        const meRes = await strapiService.request('GET', '/users/me?populate=role');
        if (meRes.error) {
           this.error = "Erreur de récupération du rôle.";
           this.logout();
           return false;
        }

        const roleName = meRes.role ? meRes.role.name : '';
        if (roleName !== 'Admin' && roleName !== 'Super Admin') {
            this.error = "Accès refusé. Vous devez avoir le rôle Admin pour accéder au back-office.";
            this.logout();
            return false;
        }

        this.user = response.user;
        localStorage.setItem('bo_jwt', this.jwt);
        localStorage.setItem('bo_user', JSON.stringify(this.user));
        return true;
      } catch (err) {
        this.error = 'Network error';
        return false;
      }
    },
    logout() {
      this.user = null;
      this.jwt = null;
      strapiService.signOut();
      localStorage.removeItem('bo_jwt');
      localStorage.removeItem('bo_user');
    },
    restoreSession() {
      const jwt = localStorage.getItem('bo_jwt');
      const user = localStorage.getItem('bo_user');
      if (jwt && user) {
        this.jwt = jwt;
        this.user = JSON.parse(user);
        strapiService.setToken(jwt);
      }
    }
  }
});
