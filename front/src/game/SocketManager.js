/**
 * SocketManager — Socket.IO client for multiplayer relay.
 *
 * Drop-in replacement for WebRTCManager.
 * Connects to the Socket.IO relay server attached to Strapi.
 * Messages are relayed through the server (no P2P).
 */
import { io } from 'socket.io-client';
import { getStrapiUrl } from '../utils/url.js';

export class SocketManager {
  constructor() {
    /** @type {import('socket.io-client').Socket | null} */
    this.socket = null;
    this.uuid = null;
    this.isHost = false;

    // Callbacks (same interface as old WebRTCManager)
    this.onConnected = null;    // Called when opponent joins / room is joined
    this.onError = null;        // Called on errors or disconnections
    this.messageListeners = []; // Array of (msg) => void
  }

  /**
   * Connect to the Socket.IO server (Strapi).
   * Automatically called by createSession / joinSession if not connected.
   */
  connect() {
    if (this.socket?.connected) return;

    // getStrapiUrl('') returns e.g. "http://127.0.0.1:1340/api"
    // We need the base URL without /api for Socket.IO
    const strapiBase = getStrapiUrl('').replace(/\/api\/?$/, '');

    const token = localStorage.getItem('tt_jwt') || null;
    this.socket = io(strapiBase, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: token ? { token } : undefined,
    });

    // --- Socket.IO event handlers ---

    this.socket.on('connect', () => {
      console.log('[SocketManager] Connected to relay server:', this.socket.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketManager] Connection error:', err.message);
      if (this.onError) this.onError('Impossible de se connecter au serveur.');
    });

    // Room created confirmation (host)
    this.socket.on('room-created', ({ uuid }) => {
      console.log('[SocketManager] Room created:', uuid);
      // Host waits for guest — onConnected called when guest-joined fires
    });

    // Guest joined the room (host receives this)
    this.socket.on('guest-joined', ({ uuid }) => {
      console.log('[SocketManager] Guest joined room:', uuid);
      if (this.onConnected) this.onConnected();
    });

    // Room joined confirmation (guest)
    this.socket.on('room-joined', ({ uuid }) => {
      console.log('[SocketManager] Joined room:', uuid);
      if (this.onConnected) this.onConnected();
    });

    // Relay message from opponent
    this.socket.on('relay', (data) => {
      let parsed = data;
      if (typeof data === 'string') {
        try { parsed = JSON.parse(data); } catch (e) { /* keep as string */ }
      }
      this.messageListeners.forEach(fn => fn(parsed));
    });

    // Opponent disconnected
    this.socket.on('opponent-disconnected', () => {
      console.warn('[SocketManager] Opponent disconnected.');
      if (this.onError) this.onError('L\'adversaire s\'est déconnecté.');
    });

    // Server error
    this.socket.on('error-msg', ({ message }) => {
      console.error('[SocketManager] Server error:', message);
      if (this.onError) this.onError(message);
    });
  }

  /**
   * Generate a UUID for a new room.
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Create a new game session (host).
   * @returns {Promise<string>} The room UUID
   */
  async createSession() {
    this.isHost = true;
    this.uuid = this.generateUUID();

    this.connect();

    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.socket?.off('connect', doCreate);
        this.socket?.off('room-created', onCreated);
        this.socket?.off('error-msg', onErr);
      };
      const doCreate = () => {
        this.socket?.emit('create-room', { uuid: this.uuid });
      };
      const onCreated = ({ uuid }) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(uuid);
      };
      const onErr = ({ message }) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(message));
      };
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Timeout: impossible de créer la session.'));
      }, 10000);

      this.socket.once('room-created', onCreated);
      this.socket.once('error-msg', onErr);

      if (this.socket.connected) {
        doCreate();
      } else {
        this.socket.once('connect', doCreate);
      }
    });
  }

  /**
   * Join an existing game session (guest).
   * @param {string} uuid - The room UUID to join
   * @returns {Promise<boolean>}
   */
  async joinSession(uuid) {
    this.isHost = false;
    this.uuid = uuid;

    this.connect();

    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.socket?.off('connect', doJoin);
        this.socket?.off('room-joined', onJoined);
        this.socket?.off('error-msg', onErr);
      };
      const doJoin = () => {
        this.socket?.emit('join-room', { uuid: this.uuid });
      };
      const onJoined = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(true);
      };
      const onErr = ({ message }) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(message));
      };
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Timeout: impossible de rejoindre la session.'));
      }, 10000);

      this.socket.once('room-joined', onJoined);
      this.socket.once('error-msg', onErr);

      if (this.socket.connected) {
        doJoin();
      } else {
        this.socket.once('connect', doJoin);
      }
    });
  }

  /**
   * Send a message to the other player via the relay server.
   * @param {any} data - The message payload (will be JSON-serialized if object)
   */
  sendMessage(data) {
    if (!this.socket?.connected || !this.uuid) {
      console.warn('[SocketManager] Cannot send message: not connected or no room.');
      return;
    }

    this.socket.emit('relay', {
      uuid: this.uuid,
      data: typeof data === 'string' ? data : JSON.parse(JSON.stringify(data)),
    });
  }

  /**
   * Register a message listener.
   * @param {function} fn
   */
  addMessageListener(fn) {
    this.messageListeners.push(fn);
  }

  /**
   * Remove a message listener.
   * @param {function} fn
   */
  removeMessageListener(fn) {
    this.messageListeners = this.messageListeners.filter(f => f !== fn);
  }

  /**
   * Close the connection and clean up.
   */
  close() {
    if (this.socket && this.uuid) {
      this.socket.emit('leave-room', { uuid: this.uuid });
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageListeners = [];
    this.uuid = null;
    this.isHost = false;
  }
}
