import { defineStore } from 'pinia';

export const useLayoutStore = defineStore('layout', {
  state: () => ({
    currentLayout: 'PlayerLayout', // Par défaut
  }),
  actions: {
    setLayout(layoutName) {
      this.currentLayout = layoutName;
    }
  }
});
