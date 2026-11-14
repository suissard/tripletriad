import { factories } from "@strapi/strapi";
import { z } from "zod";
import {
  GameEngine,
  GameState,
  PlaceCardAction,
} from "../../../shared/GameEngine";
import { logPlayerEvent } from "../../player-event-log/services/event-logger";

const arbitrateSchema = z.object({
  matchId: z.string().min(1).max(128),
  logs: z.array(z.any()).max(200),
});

const createMatchSchema = z.object({
  uuid: z.string().min(1).max(128),
  offer: z.any().optional(),
  opponentId: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  startingPlayer: z.enum(["PLAYER_1", "PLAYER_2"]).optional(),
});

const arbitrationRequestsCount = new Map<string, number>();

function isParticipant(match: any, user: any): boolean {
  const users = match?.users || [];
  return users.some(
    (u: any) =>
      String(u.id) === String(user.id) ||
      (user.documentId && String(u.documentId) === String(user.documentId)),
  );
}

export default factories.createCoreController(
  "api::match.match",
  ({ strapi }) => ({
    /**
     * Arbitre le match en rejouant de manière autoritaire les actions de placement sur grille 3x3
     */
    async arbitrate(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) {
          return ctx.unauthorized("Authentification requise pour arbitrer un match.");
        }

        const parsed = arbitrateSchema.safeParse(ctx.request.body || {});
        if (!parsed.success) {
          return ctx.badRequest(
            "Le body doit contenir 'matchId' et 'logs' (tableau d'actions).",
            parsed.error.flatten(),
          );
        }

        const { matchId, logs } = parsed.data;

        // 1. Vérifie la limite d'arbitrage par match (max 3 requêtes)
        const count = (arbitrationRequestsCount.get(matchId) || 0) + 1;
        arbitrationRequestsCount.set(matchId, count);
        if (arbitrationRequestsCount.size > 10000) {
          arbitrationRequestsCount.clear();
        }

        if (count > 3) {
          return ctx.send(
            {
              status: "ABORTED",
              message: `Match ${matchId} annulé : Trop de requêtes d'arbitrage détectées.`,
              state: null,
            },
            403,
          );
        }

        // 2. Récupération du match et vérification de participation
        const matches = await strapi.documents("api::match.match").findMany({
          filters: { uuid: matchId },
          populate: ["users"],
        });

        if (matches.length === 0) {
          return ctx.notFound(`Match ${matchId} non trouvé.`);
        }

        const match = matches[0] as any;
        if (!isParticipant(match, user)) {
          return ctx.forbidden("Vous ne participez pas à ce match.");
        }

        const startingPlayer = (match.startingPlayer as "PLAYER_1" | "PLAYER_2") || "PLAYER_1";
        let currentState: GameState = GameEngine.createInitialState(startingPlayer);
        const isAIMatch = (match.users?.length || 0) === 1;

        // Extraction des actions de placement uniquement
        const rawPlacements = logs.filter(
          (log: any) =>
            log &&
            (log.type === "PLACE_CARD" ||
              (log.action === "placement" && log.target && log.target.card)),
        );

        // Chargement autoritaire des cartes depuis la base pour éviter toute falsification de stats/skills
        const cardIds = Array.from(
          new Set(
            rawPlacements
              .map((l: any) => l.card?.id || l.target?.card?.id)
              .filter((id: any) => typeof id === "number" || /^\d+$/.test(String(id)))
              .map(Number),
          ),
        );

        const dbCards = cardIds.length
          ? await strapi.documents("api::card.card").findMany({
              filters: { id: { $in: cardIds } },
              populate: ["faction", "skills", "skills.patterns"],
              limit: cardIds.length,
            })
          : [];

        const dbCardById = new Map<number, any>();
        for (const c of dbCards as any[]) {
          dbCardById.set(Number(c.id), c);
        }

        const placeCardActions: (PlaceCardAction & { dbCard?: any })[] = rawPlacements.map(
          (log: any) => {
            let playerId = log.player || log.emitter?.id;
            if (isAIMatch) {
              playerId =
                playerId === "player" || playerId === "PLAYER_1"
                  ? "PLAYER_1"
                  : "PLAYER_2";
            }

            const clientCard = log.card || log.target?.card || {};
            const authoritativeCard = dbCardById.get(Number(clientCard.id)) || clientCard;

            const isPlacementLog = log.action === "placement";
            const slotIndex = Number(log.target?.case);
            const x = isPlacementLog && !Number.isNaN(slotIndex) ? slotIndex % 3 : Number(log.x);
            const y =
              isPlacementLog && !Number.isNaN(slotIndex)
                ? Math.floor(slotIndex / 3)
                : Number(log.y);

            return {
              type: "PLACE_CARD",
              player: playerId as "PLAYER_1" | "PLAYER_2",
              x,
              y,
              card: {
                id: authoritativeCard.id,
                name: authoritativeCard.name,
                top: authoritativeCard.topValue ?? authoritativeCard.top,
                right: authoritativeCard.rightValue ?? authoritativeCard.right,
                bottom: authoritativeCard.bottomValue ?? authoritativeCard.bottom,
                left: authoritativeCard.leftValue ?? authoritativeCard.left,
                element: authoritativeCard.element,
                faction: authoritativeCard.faction?.code || authoritativeCard.faction,
                skills: authoritativeCard.skills || [],
              },
              targets: log.targets,
              dbCard: authoritativeCard,
            };
          },
        );

        const totalCapturesByPlayer: Record<string, number> = {
          PLAYER_1: 0,
          PLAYER_2: 0,
        };

        for (let i = 0; i < placeCardActions.length; i++) {
          const action = placeCardActions[i];
          const previousBoard = currentState.board.map((row) =>
            row.map((cell) => (cell ? { ...cell } : null)),
          );

          try {
            currentState = GameEngine.computeNextState(currentState, action);

            currentState.board.forEach((row, y) => {
              row.forEach((cell, x) => {
                const prevCell = previousBoard[y][x];
                if (
                  cell &&
                  prevCell &&
                  cell.owner !== prevCell.owner &&
                  cell.owner === action.player
                ) {
                  totalCapturesByPlayer[action.player]++;
                }
              });
            });
          } catch (error: any) {
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

        // 3. Quêtes basées exclusivement sur l'état rejoué par le serveur
        try {
          const isActuallyFinished = Boolean(currentState.isFinished);
          const actualWinner = currentState.winner;

          if (isActuallyFinished) {
            const processedUsers: any[] = Array.isArray(match.processedUsers)
              ? match.processedUsers
              : [];

            const alreadyProcessed = processedUsers.some(
              (pid) => String(pid) === String(user.id) || String(pid) === String(user.documentId),
            );

            if (!alreadyProcessed) {
              const users = match.users || [];
              const userIndex = users.findIndex(
                (u: any) =>
                  String(u.id) === String(user.id) ||
                  String(u.documentId) === String(user.documentId),
              );

              if (userIndex !== -1) {
                const userRole = userIndex === 0 ? "PLAYER_1" : "PLAYER_2";

                await logPlayerEvent(strapi, {
                  userId: user.id,
                  eventType: "play_game",
                });

                if (actualWinner === userRole) {
                  await logPlayerEvent(strapi, {
                    userId: user.id,
                    eventType: "win_game",
                  });
                }

                const myTotalCaptures = totalCapturesByPlayer[userRole] || 0;
                if (myTotalCaptures > 0) {
                  await logPlayerEvent(strapi, {
                    userId: user.id,
                    eventType: "capture_card",
                    value: myTotalCaptures,
                  });
                }

                const myPlayedActions = placeCardActions.filter((a) => a.player === userRole);
                for (const action of myPlayedActions) {
                  const card = action.dbCard || action.card;
                  await logPlayerEvent(strapi, {
                    userId: user.id,
                    eventType: "play_card",
                    relatedCardId: card.id,
                  });

                  const factionName =
                    typeof card.faction === "object" ? card.faction?.name || card.faction?.code : card.faction;
                  if (factionName) {
                    await logPlayerEvent(strapi, {
                      userId: user.id,
                      eventType: "play_card_faction",
                      relatedElement: factionName,
                    });
                  }

                  if (card.element) {
                    await logPlayerEvent(strapi, {
                      userId: user.id,
                      eventType: "play_card_element",
                      relatedElement: card.element,
                    });
                  }
                }

                await strapi.documents("api::match.match").update({
                  documentId: match.documentId,
                  data: {
                    processedUsers: [...processedUsers, user.id],
                  } as any,
                });
              }
            }
          }
        } catch (questErr) {
          console.error("Error in secure quest tracking during arbitration:", questErr);
        }

        return ctx.send({
          status: "SUCCESS",
          message: "Arbitrage terminé avec succès.",
          state: currentState,
        });
      } catch (err) {
        console.error("[Arbitrate] Error:", err);
        return ctx.internalServerError("An error occurred during arbitration.");
      }
    },

    async createMatch(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const parsed = createMatchSchema.safeParse(ctx.request.body || {});
      if (!parsed.success) {
        return ctx.badRequest("Invalid match creation payload", parsed.error.flatten());
      }

      const { uuid, offer, opponentId, startingPlayer } = parsed.data;

      try {
        const existing = await strapi.documents("api::match.match").findMany({
          filters: { uuid },
          limit: 1,
        });
        if (existing.length > 0) {
          return ctx.badRequest("A match with this UUID already exists.");
        }

        const participantIds = [user.id];
        if (opponentId && String(opponentId) !== String(user.id)) {
          participantIds.push(Number(opponentId) || opponentId);
        }

        const defaultStartingPlayer = Math.random() < 0.5 ? "PLAYER_1" : "PLAYER_2";

        const match = await strapi.documents("api::match.match").create({
          data: {
            uuid,
            offer,
            users: participantIds,
            logs: [],
            startingPlayer: startingPlayer || defaultStartingPlayer,
          } as any,
        });
        return { data: match };
      } catch (e) {
        console.error("[Match Controller] Error:", e);
        return ctx.internalServerError("An error occurred while creating the match.");
      }
    },

    async findByUuid(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const { uuid } = ctx.params;
      if (!uuid) return ctx.badRequest("UUID is required");

      try {
        const matches = await strapi.documents("api::match.match").findMany({
          filters: { uuid },
          populate: ["users"],
          limit: 1,
        });

        if (matches.length === 0) return ctx.notFound("Match not found");
        if (!isParticipant(matches[0], user)) {
          return ctx.forbidden("Accès refusé à ce match.");
        }

        return { data: matches[0] };
      } catch (e) {
        console.error("[Match Controller] Error:", e);
        return ctx.internalServerError("An error occurred while fetching the match.");
      }
    },

    async updateByUuid(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const { uuid } = ctx.params;
      const { answer, offer } = ctx.request.body || {};
      if (!uuid) return ctx.badRequest("UUID is required");

      try {
        const matches = await strapi.documents("api::match.match").findMany({
          filters: { uuid },
          populate: ["users"],
          limit: 1,
        });

        if (matches.length === 0) return ctx.notFound("Match not found");
        const match = matches[0] as any;
        const alreadyParticipant = isParticipant(match, user);

        // Uniquement les participants (ou un 2e joueur répondant à une offre WebRTC)
        if (!alreadyParticipant && !(answer && (match.users?.length || 0) < 2)) {
          return ctx.forbidden("Vous n'êtes pas autorisé à modifier ce match.");
        }

        const updateData: Record<string, any> = {};
        if (answer !== undefined) updateData.answer = answer;
        if (offer !== undefined && alreadyParticipant) updateData.offer = offer;
        if (!alreadyParticipant && answer) {
          updateData.users = [...(match.users || []).map((u: any) => u.id), user.id];
        }

        const updated = await strapi.documents("api::match.match").update({
          documentId: match.documentId,
          data: updateData,
        });

        return { data: updated };
      } catch (e) {
        console.error("[Match Controller] Error:", e);
        return ctx.internalServerError("An error occurred while updating the match.");
      }
    },

    async addLog(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();

      const { uuid } = ctx.params;
      const { action } = ctx.request.body || {};
      if (!uuid || !action || typeof action !== "object") {
        return ctx.badRequest("UUID and valid action object are required");
      }

      try {
        const matches = await strapi.documents("api::match.match").findMany({
          filters: { uuid },
          populate: ["users"],
          limit: 1,
        });

        if (matches.length === 0) return ctx.notFound("Match not found");

        const match = matches[0] as any;
        if (!isParticipant(match, user)) {
          return ctx.forbidden("Vous ne participez pas à ce match.");
        }

        const currentLogs = Array.isArray(match.logs) ? match.logs : [];
        if (currentLogs.length >= 200) {
          return ctx.badRequest("Match log limit reached.");
        }

        const updated = await strapi.documents("api::match.match").update({
          documentId: match.documentId,
          data: {
            logs: [...currentLogs, action],
          },
        });

        return { data: updated };
      } catch (e) {
        console.error("[Match Controller] Error:", e);
        return ctx.internalServerError("An error occurred while adding match log.");
      }
    },
  }),
);
