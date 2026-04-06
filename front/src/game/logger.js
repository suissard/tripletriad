import { state, webrtc } from './state.js';
import strapiService from '../api/strapi.js';

/**
 * Dispatch un log structuré vers l'API de match
 * @param {string} actionType - 'placement', 'competence', 'click', 'turn_start', 'game_over'
 * @param {object} emitter - { type: 'player'|'card'|'system', id: string }
 * @param {object} target - { card?: object, player?: string, case?: number, bouton?: string }
 */
export async function sendGameLog(actionType, emitter, target) {
    // 1. Quest Tracking (Independent and prioritised)
    try {
        if (actionType === 'game_over') {
            const winner = target?.winner;
            await strapiService.trackEvent('play_game');
            
            if (winner === 'PLAYER_1' || winner === 'player' || (state.pId === winner)) {
                await strapiService.trackEvent('win_game');
            }
        } else if (actionType === 'placement' && emitter.type === 'player') {
            const card = target.card;
            await strapiService.trackEvent('play_card', { 
                relatedCardId: card?.id,
                relatedElement: card?.element
            });

            const elements = card?.elements || (card?.element && card.element !== 'None' ? [card.element] : []);
            for (const el of elements) {
                if (el && el !== 'None') {
                    await strapiService.trackEvent('play_card_element', { relatedElement: el });
                }
            }

            if (card?.faction && card.faction !== 'neutre') {
                await strapiService.trackEvent('play_card_faction', { relatedElement: card.faction });
            }
        } else if (actionType === 'competence' && emitter.type === 'player' && target.count > 0) {
            await strapiService.trackEvent('capture_card', { value: target.count });
        }
    } catch (questErr) {
        console.error(`[QuestTracking] Error:`, questErr);
    }

    // 2. Match Log (Requires matchId)
    const matchId = state.matchId || (webrtc && webrtc.uuid);
    if (!matchId) {
        console.warn(`[GameLogger] Match log skipped: No matchId found for action ${actionType}`);
        return;
    }

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
        console.log(`[GameLogger] Match log saved:`, actionType);
    } catch (e) {
        console.error(`[GameLogger] Match log error:`, e);
    }
}
