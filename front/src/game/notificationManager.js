import { gameEvents } from './events.js';
import { useNotificationStore } from '../stores/notificationStore.js';

/**
 * Initializes listeners for game events and routes them to the notification system.
 * Should be called once during app startup (e.g., in App.vue setup or main.js).
 */
export function initNotificationManager() {
  const notificationStore = useNotificationStore();

  gameEvents.on('CARD_PLACED', (payload) => {
    // Only notify if it's not a purely local/ui action, or maybe we do want it for everything
    // Let's formulate a good message
    const player = payload.action?.player === 'PLAYER_1' ? 'Joueur 1' : 'Joueur 2';
    notificationStore.addNotification('CARD_PLACED', `${player} a posé une carte.`, 'info');
  });

  gameEvents.on('CARD_CAPTURED', (payload) => {
    const { count, capturer } = payload;
    const player = capturer === 'PLAYER_1' ? 'Joueur 1' : 'Joueur 2';
    const cardText = count > 1 ? 'cartes' : 'carte';
    notificationStore.addNotification('CARD_CAPTURED', `${player} a capturé ${count} ${cardText} !`, 'warning');
  });

  gameEvents.on('TURN_START', (payload) => {
    const player = payload.player === 'PLAYER_1' ? 'Joueur 1' : 'Joueur 2';
    notificationStore.addNotification('TURN_START', `Début du tour de ${player}`, 'info');
  });

  gameEvents.on('GAME_OVER', (payload) => {
    let message = 'Partie terminée ! Égalité.';
    if (payload.winner) {
      const winner = payload.winner === 'PLAYER_1' ? 'Joueur 1' : 'Joueur 2';
      message = `Partie terminée ! ${winner} remporte la victoire.`;
    }
    notificationStore.addNotification('GAME_OVER', message, 'success');
  });
}
