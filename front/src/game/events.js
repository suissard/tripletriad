/**
 * Unified Game Event System (PubSub)
 * Used to decouple network/logic events from UI mutations.
 */
class GameEventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * S'abonner à un événement système du jeu
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Se désabonner d'un événement
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback));
    }

    /**
     * Diffuser un événement
     */
    emit(event, payload) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(payload);
            } catch (err) {
                console.error(`[GameEventEmitter] Erreur lors de l'évènement ${event}:`, err);
            }
        });
    }
}

export const gameEvents = new GameEventEmitter();
