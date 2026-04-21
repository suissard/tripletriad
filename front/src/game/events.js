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
     * S'abonner à un événement pour une seule exécution
     */
    once(event, callback) {
        const wrapper = (payload) => {
            this.off(event, wrapper);
            callback(payload);
        };
        this.on(event, wrapper);
    }

    /**
     * Se désabonner d'un événement
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback));
    }

    /**
     * Supprimer tous les listeners d'un événement (ou tous si pas d'argument)
     */
    removeAll(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Diffuser un événement
     */
    emit(event, payload) {
        if (!this.listeners.has(event)) return;
        // Copy array to avoid issues if listeners modify the list during iteration
        const callbacks = [...this.listeners.get(event)];
        callbacks.forEach(callback => {
            try {
                callback(payload);
            } catch (err) {
                console.error(`[GameEventEmitter] Erreur lors de l'évènement ${event}:`, err);
            }
        });
    }
}

export const gameEvents = new GameEventEmitter();
