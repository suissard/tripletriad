/**
 * Socket.IO Relay Server — attached to Strapi's HTTP server.
 * Authenticated via Strapi JWT and validating room/chat membership.
 */
import { Server as SocketIOServer, Socket } from "socket.io";

interface RoomState {
  host: string;
  hostUserId: number;
  guest: string | null;
  guestUserId: number | null;
  createdAt: number;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

const rooms = new Map<string, RoomState>();
const MAX_ROOMS = 5000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const DISCONNECT_GRACE_MS = 15000; // 15s reconnect grace period

function isValidUuid(uuid: unknown): uuid is string {
  return typeof uuid === "string" && uuid.length >= 4 && uuid.length <= 128;
}

export function initSocketIO(strapi: any) {
  const httpServer = strapi.server.httpServer;

  if (!httpServer) {
    strapi.log.warn("⚠️  Socket.IO: httpServer not available. Skipping initialization.");
    return;
  }

  const frontPort = process.env.FRONTEND_PORT || "5180";
  const frontUrl = process.env.FRONT_URL || `http://localhost:${frontPort}`;
  const isProd = process.env.NODE_ENV === "production";
  const corsOrigins = isProd
    ? [frontUrl]
    : [frontUrl, "http://localhost:5173", "http://localhost:5180"];

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Periodic stale room cleanup
  setInterval(() => {
    const now = Date.now();
    for (const [uuid, room] of rooms.entries()) {
      if (now - room.createdAt > ROOM_TTL_MS) {
        if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
        rooms.delete(uuid);
      }
    }
  }, 15 * 60 * 1000).unref?.();

  // Authenticate every socket connection via Strapi JWT
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth as any)?.token ||
        (typeof socket.handshake.headers?.authorization === "string"
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
          : null);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const jwtService = strapi.plugin("users-permissions").service("jwt");
      const payload = await jwtService.verify(token);
      if (!payload || !payload.id) {
        return next(new Error("Invalid token"));
      }

      const user = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { id: payload.id },
        select: ["id", "documentId", "username", "blocked"],
      });

      if (!user || user.blocked) {
        return next(new Error("User unavailable"));
      }

      socket.data.user = user;
      return next();
    } catch {
      return next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    strapi.log.info(`🔌 Socket.IO: User ${user?.id} connected (${socket.id})`);

    // Simple per-socket rate limiting (max 60 events per 5s window)
    let eventCount = 0;
    let windowStart = Date.now();
    socket.use((_packet, next) => {
      const now = Date.now();
      if (now - windowStart > 5000) {
        eventCount = 0;
        windowStart = now;
      }
      eventCount++;
      if (eventCount > 60) {
        return next(new Error("Rate limit exceeded"));
      }
      return next();
    });

    socket.on("create-room", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const { uuid } = payload as { uuid?: unknown };

      if (!isValidUuid(uuid)) {
        socket.emit("error-msg", { message: "Valid UUID is required" });
        return;
      }

      if (rooms.size >= MAX_ROOMS && !rooms.has(uuid)) {
        socket.emit("error-msg", { message: "Server room capacity reached" });
        return;
      }

      const existing = rooms.get(uuid);
      if (existing) {
        // Allow host reconnect if same user
        if (existing.hostUserId === user.id) {
          if (existing.cleanupTimer) {
            clearTimeout(existing.cleanupTimer);
            existing.cleanupTimer = undefined;
          }
          existing.host = socket.id;
          socket.join(uuid);
          socket.emit("room-created", { uuid });
          return;
        }
        socket.emit("error-msg", { message: "Room already exists" });
        return;
      }

      // Leave any previous game room this socket hosted/joined
      leaveAllGameRooms(socket, io, strapi);

      rooms.set(uuid, {
        host: socket.id,
        hostUserId: user.id,
        guest: null,
        guestUserId: null,
        createdAt: Date.now(),
      });
      socket.join(uuid);
      socket.emit("room-created", { uuid });
      strapi.log.info(`🏠 Room created: ${uuid} by user ${user.id}`);
    });

    socket.on("join-room", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const { uuid } = payload as { uuid?: unknown };

      if (!isValidUuid(uuid)) {
        socket.emit("error-msg", { message: "Valid UUID is required" });
        return;
      }

      const room = rooms.get(uuid);
      if (!room) {
        socket.emit("error-msg", { message: "Room not found" });
        return;
      }

      // Reconnecting guest
      if (room.guestUserId === user.id) {
        if (room.cleanupTimer) {
          clearTimeout(room.cleanupTimer);
          room.cleanupTimer = undefined;
        }
        room.guest = socket.id;
        socket.join(uuid);
        socket.emit("room-joined", { uuid });
        return;
      }

      if (room.guest !== null) {
        socket.emit("error-msg", { message: "Room is full" });
        return;
      }

      leaveAllGameRooms(socket, io, strapi);

      room.guest = socket.id;
      room.guestUserId = user.id;
      socket.join(uuid);

      io.to(room.host).emit("guest-joined", { uuid });
      socket.emit("room-joined", { uuid });
      strapi.log.info(`🎮 Guest user ${user.id} joined room: ${uuid}`);
    });

    socket.on("relay", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const { uuid, data } = payload as { uuid?: unknown; data?: unknown };

      if (!isValidUuid(uuid) || !data) return;

      const room = rooms.get(uuid);
      if (!room || (room.host !== socket.id && room.guest !== socket.id)) {
        return;
      }

      socket.to(uuid).emit("relay", data);
    });

    socket.on("leave-room", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const { uuid } = payload as { uuid?: unknown };
      if (!isValidUuid(uuid)) return;
      handleLeave(socket, uuid, io, strapi, true);
    });

    socket.on("join-chat-room", async (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const { room } = payload as { room?: unknown };
      if (typeof room !== "string" || !room) return;

      const authorized = await isAuthorizedForChatRoom(strapi, user, room);
      if (!authorized) {
        socket.emit("error-msg", { message: "Unauthorized chat room" });
        return;
      }

      socket.join(room);
      strapi.log.info(`💬 User ${user.id} joined chat room: ${room}`);
    });

    socket.on("leave-chat-room", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const { room } = payload as { room?: unknown };
      if (typeof room === "string" && room) {
        socket.leave(room);
      }
    });

    socket.on("disconnect", () => {
      strapi.log.info(`❌ Socket.IO: User ${user?.id} disconnected (${socket.id})`);
      for (const [uuid, room] of rooms.entries()) {
        if (room.host === socket.id || room.guest === socket.id) {
          handleLeave(socket, uuid, io, strapi, false);
        }
      }
    });
  });

  strapi.log.info("✅ Socket.IO relay server attached to Strapi HTTP server.");
  (strapi as any).io = io;
}

async function isAuthorizedForChatRoom(strapi: any, user: any, room: string): Promise<boolean> {
  if (room.startsWith("dm_")) {
    const parts = room.slice(3).split("_").filter(Boolean);
    return parts.some(
      (id) => String(id) === String(user.id) || (user.documentId && String(id) === String(user.documentId)),
    );
  }

  if (room.startsWith("guild_")) {
    const guildId = room.slice(6);
    if (!guildId) return false;
    try {
      const filters = /^\d+$/.test(guildId) ? { id: Number(guildId) } : { documentId: guildId };
      const guilds = await strapi.documents("api::guild.guild").findMany({
        filters,
        populate: { members: { fields: ["id", "documentId"] } },
        limit: 1,
      });
      const guild = guilds?.[0];
      if (!guild) return false;
      if (guild.name === "Global") return true;
      return (guild.members || []).some(
        (m: any) => String(m.id) === String(user.id) || String(m.documentId) === String(user.documentId),
      );
    } catch {
      return false;
    }
  }

  return false;
}

function leaveAllGameRooms(socket: Socket, io: SocketIOServer, strapi: any) {
  for (const [uuid, room] of rooms.entries()) {
    if (room.host === socket.id || room.guest === socket.id) {
      handleLeave(socket, uuid, io, strapi, true);
    }
  }
}

function handleLeave(
  socket: Socket,
  uuid: string,
  io: SocketIOServer,
  strapi: any,
  immediate: boolean,
) {
  const room = rooms.get(uuid);
  if (!room) return;
  if (room.host !== socket.id && room.guest !== socket.id) return;

  socket.leave(uuid);

  if (immediate) {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    io.to(uuid).emit("opponent-disconnected", { uuid });
    if (room.host === socket.id) {
      rooms.delete(uuid);
      strapi.log.info(`🗑️  Room destroyed: ${uuid} (host left)`);
    } else if (room.guest === socket.id) {
      room.guest = null;
      room.guestUserId = null;
      strapi.log.info(`👋 Guest left room: ${uuid}`);
    }
    return;
  }

  // Grace period on accidental network disconnect
  const wasHost = room.host === socket.id;
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => {
    const current = rooms.get(uuid);
    if (!current) return;
    if (wasHost && current.host === socket.id) {
      io.to(uuid).emit("opponent-disconnected", { uuid });
      rooms.delete(uuid);
      strapi.log.info(`🗑️  Room destroyed after grace timeout: ${uuid}`);
    } else if (!wasHost && current.guest === socket.id) {
      io.to(uuid).emit("opponent-disconnected", { uuid });
      current.guest = null;
      current.guestUserId = null;
      strapi.log.info(`👋 Guest timed out from room: ${uuid}`);
    }
  }, DISCONNECT_GRACE_MS);
}
