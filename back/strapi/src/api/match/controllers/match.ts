import { factories } from "@strapi/strapi";
import {
  GameEngine,
  GameState,
  PlaceCardAction,
} from "../../../shared/GameEngine";
import { logPlayerEvent } from "../../player-event-log/services/event-logger";

// Interface attendue dans le Body de la requête
interface ArbitrateRequestBody {
  matchId: string;
  logs: any[]; // Modifié pour accepter le nouveau format de log enrichi. On filtrera les PlaceCardAction à la volée.
  isFinished?: boolean;
  winner?: string;
}

// On simule une base de données locale ou un cache mémoire (ex: Redis en prod)
// pour compter le nombre de demandes d'arbitrage par match.
const arbitrationRequestsCount: Record<string, number> = {};

export default factories.createCoreController(
  "api::match.match",
  ({ strapi }) => ({
    /**
     * Arbitre le match en rejouant les logs
     */
    async arbitrate(ctx) {
      try {
        const body = ctx.request.body as ArbitrateRequestBody;

        if (!body.matchId || !body.logs || !Array.isArray(body.logs)) {
          return ctx.badRequest(
            "Le body doit contenir 'matchId' et 'logs' (tableau d'actions).",
          );
        }

        const { matchId, logs, isFinished: clientIsFinished, winner: clientWinner } = body;

        // 1. Vérifie la limite d'arbitrage (ex: max 3 requêtes)
        if (!arbitrationRequestsCount[matchId]) {
          arbitrationRequestsCount[matchId] = 0;
        }

        arbitrationRequestsCount[matchId] += 1;

        if (arbitrationRequestsCount[matchId] > 3) {
          return ctx.send(
            {
              status: "ABORTED",
              message: `Match ${matchId} annulé : Trop de requêtes d'arbitrage détectées (suspect d'abus réseau/triche).`,
              state: null,
            },
            403,
          );
        }

        // 2. Rejeu des logs
        // Fetch match to get the starting player and users for quest tracking
        const matches = await strapi.documents("api::match.match").findMany({
          filters: { uuid: matchId },
          populate: ["users"],
        });

        if (matches.length === 0) {
          return ctx.notFound(`Match ${matchId} non trouvé.`);
        }

        const match = matches[0];
        const startingPlayer = (match.startingPlayer as any) || "PLAYER_1";

        let currentState: GameState =
          GameEngine.createInitialState(startingPlayer);

        // Filtrer uniquement les actions de placement (celles qui concernent l'arbitrage du GameEngine)
        const placeCardActions = logs
          .filter(
            (log) =>
              log.type === "PLACE_CARD" ||
              (log.action === "placement" && log.target && log.target.card),
          )
          .map((log) =>
            log.action === "placement"
              ? {
                  type: "PLACE_CARD",
                  player: log.emitter.id,
                  x: log.target.case % 3,
                  y: Math.floor(log.target.case / 3),
                  card: log.target.card,
                }
              : log,
          );

        let totalCapturesByPlayer: Record<string, number> = { PLAYER_1: 0, PLAYER_2: 0 };

        for (let i = 0; i < placeCardActions.length; i++) {
          const action = placeCardActions[i];
          const previousBoard = currentState.board.map(row => row.map(cell => cell ? { ...cell } : null));

          try {
            currentState = GameEngine.computeNextState(currentState, action);
            
            // Count captures by comparing owners before/after
            currentState.board.forEach((row, y) => {
              row.forEach((cell, x) => {
                const prevCell = previousBoard[y][x];
                if (cell && prevCell && cell.owner !== prevCell.owner && cell.owner === action.player) {
                  totalCapturesByPlayer[action.player]++;
                }
              });
            });
          } catch (error) {
            return ctx.send(
              {
                status: "INVALID_LOGS",
                message: `L'action au tour ${i} est invalide : ${error.message}`,
                state: currentState,
              },
              400,
            );
          }
        }

        // 3. Secure Quest Tracking
        try {
          let user = ctx.state.user;
          
          if (!user && ctx.request.header && ctx.request.header.authorization) {
            const token = ctx.request.header.authorization.split(' ')[1];
            if (token) {
              try {
                const jwtService = strapi.plugin('users-permissions').service('jwt');
                const payload = await jwtService.verify(token);
                console.log("[Arbitrate Debug] JWT Payload extracted:", JSON.stringify(payload));
                if (payload && (payload.id || payload.documentId)) {
                  user = { id: payload.documentId || payload.id };
                }
              } catch (e) {
                console.warn("[Arbitrate] Invalid token provided", e.message);
              }
            }
          }

          console.log(`[Arbitrate Debug] Found user for quests?`, user ? user.id : 'No user');

          const isActuallyFinished = clientIsFinished || currentState.isFinished;
          const actualWinner = clientIsFinished ? clientWinner : currentState.winner;

          if (user && isActuallyFinished && matches[0]) {
            const matchRecord = matches[0] as any;
            const processedUsers = matchRecord.processedUsers || [];
            
            console.log(`[Arbitrate Debug] Match users relation:`, JSON.stringify(matchRecord.users));

            if (processedUsers.includes(user.id)) {
              console.log(`[Arbitrate] Quests already processed for user ${user.id} in match ${matchId}`);
            } else {
              const users = matchRecord.users || [];
              const userIndex = users.findIndex(u => String(u.id) === String(user.id) || String(u.documentId) === String(user.id));
              
              console.log(`[Arbitrate Debug] userIndex found:`, userIndex);
              
              if (userIndex !== -1) {
                const userRole = userIndex === 0 ? "PLAYER_1" : "PLAYER_2";
                
                // Base events
                await logPlayerEvent(strapi, { userId: user.id, eventType: "play_game" });
                
                if (isActuallyFinished && actualWinner === userRole) {
                  await logPlayerEvent(strapi, { userId: user.id, eventType: "win_game" });
                }

                // Extract actions directly from the complete match logs instead of the replay engine
                const dbLogs = matchRecord.logs || [];
                const isAIMatch = users.length === 1;
                const myEmitterId = isAIMatch ? 'player' : userRole;

                const myCompetenceLogs = dbLogs.filter((l: any) => l.action === 'competence' && l.emitter?.id === myEmitterId);
                const myTotalCaptures = myCompetenceLogs.reduce((sum: number, log: any) => sum + (log.target?.count || 0), 0);

                if (myTotalCaptures > 0) {
                  await logPlayerEvent(strapi, { 
                    userId: user.id, 
                    eventType: "capture_card", 
                    value: myTotalCaptures 
                  });
                }

                // Card specific events (Play Card, Faction, Element)
                const myPlayActions = dbLogs.filter((l: any) => l.action === 'placement' && l.emitter?.id === myEmitterId && l.target?.card);
                
                for (const action of myPlayActions) {
                  const card = action.target.card;
                  await logPlayerEvent(strapi, { 
                    userId: user.id, 
                    eventType: "play_card",
                    relatedCardId: card.id
                  });

                  if (card.faction) {
                    await logPlayerEvent(strapi, { 
                      userId: user.id, 
                      eventType: "play_card_faction", 
                      relatedElement: card.faction 
                    });
                  }

                  if (card.element) {
                    await logPlayerEvent(strapi, { 
                      userId: user.id, 
                      eventType: "play_card_element", 
                      relatedElement: card.element 
                    });
                  }
                }

                // Mark as processed only if the match is actually finished
                if (isActuallyFinished) {
                  await strapi.documents("api::match.match").update({
                    documentId: matchRecord.documentId,
                    data: {
                      processedUsers: [...processedUsers, user.id]
                    }
                  });
                }
              }
            }
          }
        } catch (questErr) {
          console.error("Error in secure quest tracking during arbitration:", questErr);
        }

        return ctx.send({
          status: "SUCCESS",
          message: "Arbitrage terminé avec succès et quêtes mises à jour.",
          state: currentState,
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

      // Pour l'IA, l'offre WebRTC n'est pas requise, mais l'UUID l'est.
      if (!uuid) return ctx.badRequest("UUID is required");

      try {
        const startingPlayer = Math.random() < 0.5 ? "PLAYER_1" : "PLAYER_2";

        const match = await strapi.documents("api::match.match").create({
          data: {
            uuid,
            offer,
            users,
            logs: [],
            startingPlayer,
          },
        });
        return { data: match };
      } catch (e) {
        return ctx.internalServerError(e.message);
      }
    },

    async findByUuid(ctx) {
      const { uuid } = ctx.params;
      if (!uuid) return ctx.badRequest("UUID is required");

      try {
        const matches = await strapi.documents("api::match.match").findMany({
          filters: { uuid },
        });

        if (matches.length === 0) return ctx.notFound("Match not found");
        return { data: matches[0] };
      } catch (e) {
        return ctx.internalServerError(e.message);
      }
    },

    async updateByUuid(ctx) {
      const { uuid } = ctx.params;
      const { answer, offer, logs } = ctx.request.body;
      if (!uuid) return ctx.badRequest("UUID is required");

      try {
        // Dans Strapi 5, on doit d'abord trouver le documentId via l'UUID
        const matches = await strapi.documents("api::match.match").findMany({
          filters: { uuid },
        });

        if (matches.length === 0) return ctx.notFound("Match not found");

        const updated = await strapi.documents("api::match.match").update({
          documentId: matches[0].documentId,
          data: {
            ...(answer && { answer }),
            ...(offer && { offer }),
            ...(logs && { logs }),
          },
        });

        return { data: updated };
      } catch (e) {
        return ctx.internalServerError(e.message);
      }
    },

    async addLog(ctx) {
      const { uuid } = ctx.params;
      const { action } = ctx.request.body;
      if (!uuid || !action)
        return ctx.badRequest("UUID and action are required");

      try {
        const matches = await strapi.documents("api::match.match").findMany({
          filters: { uuid },
        });

        if (matches.length === 0) return ctx.notFound("Match not found");

        const match = matches[0];
        const currentLogs = Array.isArray(match.logs) ? match.logs : [];

        const updated = await strapi.documents("api::match.match").update({
          documentId: match.documentId,
          data: {
            logs: [...currentLogs, action],
          },
        });

        return { data: updated };
      } catch (e) {
        return ctx.internalServerError(e.message);
      }
    },
  }),
);
