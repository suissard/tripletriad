/**
 * Socket.IO Relay Server — attached to Strapi's HTTP server.
 *
 * Pure relay: the server does NOT execute any game logic.
 * It simply forwards messages between the two players of a room (identified by UUID).
 */
import { Server as SocketIOServer } from "socket.io";

// Track rooms: Map<uuid, { hostSocketId, guestSocketId }>
const rooms = new Map<string, { host: string; guest: string | null }>();

export function initSocketIO(strapi: any) {
  const httpServer = strapi.server.httpServer;

  if (!httpServer) {
    strapi.log.warn(
      "⚠️  Socket.IO: httpServer not available. Skipping initialization."
    );
    return;
  }

  const frontUrl = process.env.FRONT_URL || "http://localhost:5180";

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [frontUrl, "http://localhost:5173", "http://localhost:5180"],
      methods: ["GET", "POST"],
    },
    // Use websocket transport only for lower latency (skip long-polling upgrade)
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    strapi.log.info(`🔌 Socket.IO: Client connected (${socket.id})`);

    /**
     * Host creates a room with a UUID.
     * Payload: { uuid: string }
     */
    socket.on("create-room", (payload: { uuid: string }) => {
      const { uuid } = payload;

      if (!uuid) {
        socket.emit("error-msg", { message: "UUID is required" });
        return;
      }

      if (rooms.has(uuid)) {
        socket.emit("error-msg", {
          message: "Room already exists",
        });
        return;
      }

      rooms.set(uuid, { host: socket.id, guest: null });
      socket.join(uuid);
      socket.emit("room-created", { uuid });

      strapi.log.info(`🏠 Room created: ${uuid} by ${socket.id}`);
    });

    /**
     * Guest joins an existing room.
     * Payload: { uuid: string }
     */
    socket.on("join-room", (payload: { uuid: string }) => {
      const { uuid } = payload;

      if (!uuid) {
        socket.emit("error-msg", { message: "UUID is required" });
        return;
      }

      const room = rooms.get(uuid);

      if (!room) {
        socket.emit("error-msg", { message: "Room not found" });
        return;
      }

      if (room.guest !== null) {
        socket.emit("error-msg", { message: "Room is full" });
        return;
      }

      room.guest = socket.id;
      socket.join(uuid);

      // Notify host that the guest has joined
      io.to(room.host).emit("guest-joined", { uuid });
      // Notify guest that connection is established
      socket.emit("room-joined", { uuid });

      strapi.log.info(`🎮 Guest ${socket.id} joined room: ${uuid}`);
    });

    /**
     * Relay a message to the other player in the room.
     * Payload: { uuid: string, data: any }
     */
    socket.on("relay", (payload: { uuid: string; data: any }) => {
      const { uuid, data } = payload;

      if (!uuid || !data) return;

      // Forward to the other player in the room (not back to sender)
      socket.to(uuid).emit("relay", data);
    });

    /**
     * Player leaves the room gracefully.
     * Payload: { uuid: string }
     */
    socket.on("leave-room", (payload: { uuid: string }) => {
      const { uuid } = payload;
      handleLeave(socket, uuid, io, strapi);
    });

    /**
     * Handle disconnection.
     */

    socket.on("join-chat-room", (payload) => {
      const { room } = payload;
      if (room) {
        socket.join(room);
        strapi.log.info(`💬 Socket ${socket.id} joined chat room: ${room}`);
      }
    });

    socket.on("leave-chat-room", (payload) => {
      const { room } = payload;
      if (room) {
        socket.leave(room);
        strapi.log.info(`👋 Socket ${socket.id} left chat room: ${room}`);
      }
    });

    socket.on("disconnect", () => {
      strapi.log.info(`❌ Socket.IO: Client disconnected (${socket.id})`);

      // Find and clean up any room this socket was in
      for (const [uuid, room] of rooms.entries()) {
        if (room.host === socket.id || room.guest === socket.id) {
          handleLeave(socket, uuid, io, strapi);
          break; // A socket should only be in one room at a time
        }
      }
    });
  });

  strapi.log.info("✅ Socket.IO relay server attached to Strapi HTTP server.");

  // Store io instance on strapi for potential future use
  (strapi as any).io = io;
}

function handleLeave(
  socket: any,
  uuid: string,
  io: SocketIOServer,
  strapi: any
) {
  if (!uuid) return;

  const room = rooms.get(uuid);
  if (!room) return;

  // Notify the other player
  socket.to(uuid).emit("opponent-disconnected", { uuid });

  // Leave the socket.io room
  socket.leave(uuid);

  // Clean up: if host leaves, destroy room. If guest leaves, reset guest slot.
  if (room.host === socket.id) {
    // Host left → destroy the room entirely
    rooms.delete(uuid);
    strapi.log.info(`🗑️  Room destroyed: ${uuid} (host left)`);
  } else if (room.guest === socket.id) {
    room.guest = null;
    strapi.log.info(`👋 Guest left room: ${uuid}`);
  }
}
