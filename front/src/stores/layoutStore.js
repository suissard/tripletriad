import { defineStore } from 'pinia';

export const useLayoutStore = defineStore('layout', {
  state: () => ({
    currentLayout: 'PlayerLayout', // Par défaut
  }),
  actions: {
    setLayout(layoutName) {
      if (['PlayerLayout', 'AdminLayout', 'BlankLayout'].includes(layoutName)) {
        this.currentLayout = layoutName;
      } else {
        console.warn(`Tentative de définir un layout inconnu: ${layoutName}`);
        this.currentLayout = 'PlayerLayout'; // Fallback
      }
    }
  }
});
