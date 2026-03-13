import { factories } from '@strapi/strapi';
import { GameEngine, GameState, PlaceCardAction } from '../../../shared/GameEngine';

// Interface attendue dans le Body de la requête
interface ArbitrateRequestBody {
  matchId: string;
  logs: PlaceCardAction[];
}

// On simule une base de données locale ou un cache mémoire (ex: Redis en prod)
// pour compter le nombre de demandes d'arbitrage par match.
const arbitrationRequestsCount: Record<string, number> = {};

export default factories.createCoreController('api::match.match', ({ strapi }) => ({
  
  /**
   * Arbitre le match en rejouant les logs
   */
  async arbitrate(ctx) {
    try {
      const body = ctx.request.body as ArbitrateRequestBody;
      
      if (!body.matchId || !body.logs || !Array.isArray(body.logs)) {
        return ctx.badRequest("Le body doit contenir 'matchId' et 'logs' (tableau d'actions).");
      }

      const { matchId, logs } = body;

      // 1. Vérifie la limite d'arbitrage (ex: max 3 requêtes)
      if (!arbitrationRequestsCount[matchId]) {
        arbitrationRequestsCount[matchId] = 0;
      }
      
      arbitrationRequestsCount[matchId] += 1;

      if (arbitrationRequestsCount[matchId] > 3) {
        return ctx.send({
          status: 'ABORTED',
          message: `Match ${matchId} annulé : Trop de requêtes d'arbitrage détectées (suspect d'abus réseau/triche).`,
          state: null
        }, 403);
      }

      // 2. Rejeu des logs
      // Fetch match to get the starting player
      const matches = await strapi.documents('api::match.match').findMany({
        filters: { uuid: matchId }
      });

      if (matches.length === 0) {
        return ctx.notFound(`Match ${matchId} non trouvé.`);
      }

      const match = matches[0];
      const startingPlayer = (match.startingPlayer as any) || 'PLAYER_1';

      let currentState: GameState = GameEngine.createInitialState(startingPlayer);
      
      for (let i = 0; i < logs.length; i++) {
        const action = logs[i];
        
        try {
          currentState = GameEngine.computeNextState(currentState, action);
        } catch (error) {
           return ctx.send({
             status: 'INVALID_LOGS',
             message: `L'action au tour ${i} est invalide : ${error.message}`,
             state: currentState
           }, 400); 
        }
      }

      return ctx.send({
        status: 'SUCCESS',
        message: 'Arbitrage terminé avec succès.',
        state: currentState
      });

    } catch (err) {
      ctx.body = err;
    }
  },

  // --- STUBS POUR RESTAURER LA COMPATIBILITÉ AVEC custom.ts ---
  // Note: Ces méthodes ont été perdues lors du précédent edit. 
  // Elles doivent être ré-implémentées avec la logique WebRTC réelle du projet.

  async createMatch(ctx) {
    const { uuid, offer, users } = ctx.request.body;
    if (!uuid || !offer) return ctx.badRequest('UUID and Offer are required');

    try {
      const startingPlayer = Math.random() < 0.5 ? 'PLAYER_1' : 'PLAYER_2';
      
      const match = await strapi.documents('api::match.match').create({
        data: {
          uuid,
          offer,
          users,
          logs: [],
          startingPlayer
        }
      });
      return { data: match };
    } catch (e) {
      return ctx.internalServerError(e.message);
    }
  },

  async findByUuid(ctx) {
    const { uuid } = ctx.params;
    if (!uuid) return ctx.badRequest('UUID is required');

    try {
      const matches = await strapi.documents('api::match.match').findMany({
        filters: { uuid }
      });
      
      if (matches.length === 0) return ctx.notFound('Match not found');
      return { data: matches[0] };
    } catch (e) {
      return ctx.internalServerError(e.message);
    }
  },

  async updateByUuid(ctx) {
    const { uuid } = ctx.params;
    const { answer, offer, logs } = ctx.request.body;
    if (!uuid) return ctx.badRequest('UUID is required');

    try {
      // Dans Strapi 5, on doit d'abord trouver le documentId via l'UUID
      const matches = await strapi.documents('api::match.match').findMany({
        filters: { uuid }
      });

      if (matches.length === 0) return ctx.notFound('Match not found');

      const updated = await strapi.documents('api::match.match').update({
        documentId: matches[0].documentId,
        data: {
          ...(answer && { answer }),
          ...(offer && { offer }),
          ...(logs && { logs })
        }
      });

      return { data: updated };
    } catch (e) {
      return ctx.internalServerError(e.message);
    }
  },

  async addLog(ctx) {
    const { uuid } = ctx.params;
    const { action } = ctx.request.body;
    if (!uuid || !action) return ctx.badRequest('UUID and action are required');

    try {
      const matches = await strapi.documents('api::match.match').findMany({
        filters: { uuid }
      });

      if (matches.length === 0) return ctx.notFound('Match not found');

      const match = matches[0];
      const currentLogs = Array.isArray(match.logs) ? match.logs : [];
      
      const updated = await strapi.documents('api::match.match').update({
        documentId: match.documentId,
        data: {
          logs: [...currentLogs, action]
        }
      });

      return { data: updated };
    } catch (e) {
      return ctx.internalServerError(e.message);
    }
  }

}));
