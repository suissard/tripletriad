import { defineStore } from 'pinia';

// Local storage key for preferences
const PREF_KEY = 'tt_notification_prefs';

export const useNotificationStore = defineStore('notification', {
  state: () => {
    // Attempt to load preferences from localStorage
    const savedPrefs = localStorage.getItem(PREF_KEY);
    const defaultPrefs = {
      CARD_PLACED: true,
      CARD_CAPTURED: true,
      TURN_START: true,
      GAME_OVER: true,
      // Default duration in ms
      duration: 3000
    };

    return {
      notifications: [],
      nextId: 1,
      preferences: savedPrefs ? { ...defaultPrefs, ...JSON.parse(savedPrefs) } : defaultPrefs
    };
  },

  actions: {
    addNotification(event, message, type = 'info') {
      // Check if this event type is enabled
      if (this.preferences[event] === false) {
        return; // Ignore this notification
      }

      const id = this.nextId++;
      this.notifications.push({
        id,
        event,
        message,
        type
      });

      // Auto-remove after configured duration
      setTimeout(() => {
        this.removeNotification(id);
      }, this.preferences.duration);
    },

    removeNotification(id) {
      this.notifications = this.notifications.filter(n => n.id !== id);
    },

    togglePreference(event) {
      if (this.preferences[event] !== undefined) {
        this.preferences[event] = !this.preferences[event];
        this.savePreferences();
      }
    },

    setDuration(ms) {
      this.preferences.duration = ms;
      this.savePreferences();
    },

    savePreferences() {
      localStorage.setItem(PREF_KEY, JSON.stringify(this.preferences));
    }
  }
});
