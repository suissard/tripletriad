import { state, webrtc } from './state.js';
import strapiService from '../api/strapi.js';
import { useUserStore } from '../stores/userStore.js';

/**
 * Dispatch un log structuré vers l'API de match
 * @param {string} actionType - 'placement', 'competence', 'click', 'turn_start', 'game_over'
 * @param {object} emitter - { type: 'player'|'card'|'system', id: string }
 * @param {object} target - { card?: object, player?: string, case?: number, bouton?: string }
 */
export async function sendGameLog(actionType, emitter, target) {
    // 1. Quest Tracking (Independent and prioritised)
    try {
        const isLocalPlayer = emitter.type === 'player' || emitter.id === 'player' || emitter.id === state.pId;

        if (actionType === 'game_over') {
            // Systematic Arbitration for Quest Security
            console.log("[QuestTracking] Triggering secure arbitration at game over...");
            const userStore = useUserStore();
            try {
                await strapiService.request('POST', '/match/arbitrate', {
                    body: {
                        matchId: state.matchId,
                        logs: state.actionLog
                    }
                });
                // Refresh Quests after secure arbitration to update UI
                await userStore.fetchUserQuests();
                await userStore.fetchWeeklyQuests();
            } catch (arbErr) {
                console.error("[QuestTracking] Arbitration failed:", arbErr);
                
                // Fallback (only for UX/Offline, won't be as secure as arbitration)
                const winner = target?.winner;
                await strapiService.trackEvent('play_game');
                if (winner === 'PLAYER_1' || winner === 'player' || (state.pId === winner)) {
                    await strapiService.trackEvent('win_game');
                }
            }
        }
        // Mid-game events (placement, competence) are now handled securely by arbitration at the end.
        // We remove them from here to prevent double counting and cheating.
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
