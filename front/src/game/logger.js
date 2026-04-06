import { state, webrtc } from './state.js';
import strapiService from '../api/strapi.js';

/**
 * Dispatch un log structuré vers l'API de match
 * @param {string} actionType - 'placement', 'competence', 'click', 'turn_start', 'game_over'
 * @param {object} emitter - { type: 'player'|'card'|'system', id: string }
 * @param {object} target - { card?: object, player?: string, case?: number, bouton?: string }
 */
export async function sendGameLog(actionType, emitter, target) {
    // Si on n'a pas d'UUID de match, on ne peut pas logguer
    const matchId = state.matchId || (webrtc && webrtc.uuid);
    if (!matchId) return;

    const logPayload = {
        timestamp: new Date().toISOString(),
        emitter,
        target,
        action: actionType
    };

    try {
        await fetch(`${strapiService.BASE_URL}/webrtc/matches/${matchId}/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(strapiService.token ? { 'Authorization': `Bearer ${strapiService.token}` } : {})
            },
            body: JSON.stringify({ action: logPayload })
        });
        console.log(`[GameLogger] Log envoyé:`, logPayload);

        // Quest Tracking Integration
        if (actionType === 'game_over') {
            const winner = target?.winner;
            // Track that a game was played
            await strapiService.trackEvent('play_game');
            
            // If local player won
            if (winner === 'PLAYER_1' || winner === 'player' || (state.pId === winner)) {
                await strapiService.trackEvent('win_game');
            }
        } else if (actionType === 'placement' && emitter.type === 'player') {
             await strapiService.trackEvent('play_card', { 
                 relatedCardId: target.card?.id,
                 relatedElement: target.card?.element
             });
             if (target.card?.element && target.card?.element !== 'None') {
                 await strapiService.trackEvent('play_card_element', { 
                     relatedElement: target.card?.element 
                 });
             }
        } else if (actionType === 'competence' && emitter.type === 'player') {
            // This usually tracks captures
            if (target.count > 0) {
                await strapiService.trackEvent('capture_card', { value: target.count });
            }
        }

    } catch (e) {
        console.error(`[GameLogger] Échec de l'envoi du log:`, e);
    }
}
