import { GameEngine } from './GameEngine.js';
import { gameEvents } from './events.js';

// --- Le Gestionnaire P2P ---

export class TurnManager {
  constructor(config) {
    this.state = config.initialState;
    this.localPlayer = config.localPlayer;
    this.turnIndex = 0;

    // On stocke les hashs générés localement et reçus du réseau pour les comparer
    this.localHashes = new Map();
    this.expectedRemoteHashes = new Map();

    this.sendNetworkMessage = config.sendNetworkMessage;
    this.onStateUpdate = config.onStateUpdate;
    this.onDesync = config.onDesync;
    this.onRemoteAction = config.onRemoteAction;

    // Initialise l'UI
    this.onStateUpdate(this.state);
  }

  /**
   * Appelé par le composant Front quand le joueur local pose une carte
   */
  async playLocalAction(action) {
    if (this.state.currentPlayer !== this.localPlayer) {
      throw new Error("Ce n'est pas votre tour de jouer.");
    }
    if (action.player !== this.localPlayer) {
      throw new Error("Vous ne pouvez pas jouer pour l'adversaire.");
    }

    const currentTurn = this.turnIndex;

    // 1. Appliquer l'action en local ("optimistic update")
    this.state = GameEngine.computeNextState(this.state, action);
    this.turnIndex++;
    this.onStateUpdate(this.state);
    
    // Emettre l'événement pour l'UI, déduction mana, animations
    gameEvents.emit('CARD_PLACED', { action, captures: this.state.lastCaptures || [] });

    // Emettre l'événement de capture si applicable
    if (this.state.lastCaptures && this.state.lastCaptures.length > 0) {
      gameEvents.emit('CARD_CAPTURED', {
        count: this.state.lastCaptures.length,
        capturer: action.player
      });
    }

    // Emettre l'événement de fin de partie ou de début de tour
    if (this.state.isFinished) {
      gameEvents.emit('GAME_OVER', { winner: this.state.winner });
    } else {
      gameEvents.emit('TURN_START', { player: this.state.currentPlayer });
    }

    // 2. Transmettre l'action à l'adversaire via WebRTC
    this.sendNetworkMessage({
      type: 'ACTION',
      action,
      turnIndex: currentTurn, // Le tour pendant lequel l'action a été faite
    });

    // 3. Calculer l'empreinte de ce nouvel état et l'envoyer pour vérification croisée
    await this.generateAndSendHash(currentTurn, this.state);
  }

  /**
   * Appelé par le gestionnaire WebRTC (ex: depuis onmessage du DataChannel)
   */
  async handleNetworkMessage(msg) {
    if (msg.type === 'ACTION') {
      await this.handleRemoteAction(msg.action, msg.turnIndex);
    } else if (msg.type === 'SYNC') {
      this.handleRemoteSync(msg.stateHash, msg.turnIndex);
    }
  }

  // --- Gestionnaires privés de réception ---

  async handleRemoteAction(action, incomingTurnIndex) {
    if (action.player === this.localPlayer) {
      console.warn("ALERTE: Tentative d'imposture réseau (A joué une carte à notre nom).");
      return;
    }
    if (incomingTurnIndex !== this.turnIndex) {
      console.warn(`Désynchro de Tour: Reçu action pour tour ${incomingTurnIndex}, attendu ${this.turnIndex}`);
    }

    // 1. Appliquer l'action reçue
    this.state = GameEngine.computeNextState(this.state, action);
    const resolvedTurnIndex = this.turnIndex;
    this.turnIndex++; // Incrémenter notre horloge interne
    this.onStateUpdate(this.state);
    
    // 2. Déclencher le callback visuel/UI
    if (this.onRemoteAction) {
        this.onRemoteAction(action);
    }
    gameEvents.emit('CARD_PLACED', { action, captures: this.state.lastCaptures || [] });

    // Emettre l'événement de capture si applicable
    if (this.state.lastCaptures && this.state.lastCaptures.length > 0) {
      gameEvents.emit('CARD_CAPTURED', {
        count: this.state.lastCaptures.length,
        capturer: action.player
      });
    }

    // Emettre l'événement de fin de partie ou de début de tour
    if (this.state.isFinished) {
      gameEvents.emit('GAME_OVER', { winner: this.state.winner });
    } else {
      gameEvents.emit('TURN_START', { player: this.state.currentPlayer });
    }

    // 3. Générer notre hash local pour l'état résultant et valider l'intégrité
    await this.generateAndSendHash(resolvedTurnIndex, this.state);
  }

  handleRemoteSync(remoteHash, turnIndex) {
    const localHash = this.localHashes.get(turnIndex);
    
    if (localHash) {
      // Nous avons déjà calculé notre empreinte, on compare immédiatement
      if (localHash !== remoteHash) {
        this.onDesync(turnIndex, localHash, remoteHash);
      }
      this.localHashes.delete(turnIndex); // Nettoyage
    } else {
      // Le réseau a été plus rapide que notre calcul local (ou action non encore parvenue)
      // On stocke le hash distant en attente de vérification
      this.expectedRemoteHashes.set(turnIndex, remoteHash);
    }
  }

  // --- Logique Crypto / Hashing ---

  async generateAndSendHash(turnIndex, targetState) {
    const hash = await this.hashGameState(targetState);
    
    // Garder une copie locale pour comparer avec le retour de l'adversaire
    this.localHashes.set(turnIndex, hash);

    // Si on a déjà reçu l'empreinte de l'adversaire pour ce tour, on compare
    const expectedHash = this.expectedRemoteHashes.get(turnIndex);
    if (expectedHash) {
      if (expectedHash !== hash) {
        this.onDesync(turnIndex, hash, expectedHash);
      }
      this.expectedRemoteHashes.delete(turnIndex); // Nettoyage mémoire
    }

    // Quel que soit le contexte, on envoie notre vision du jeu
    this.sendNetworkMessage({
      type: 'SYNC',
      stateHash: hash,
      turnIndex
    });
  }

  /**
   * Génère un hash SHA-256 de la grille pour valider l'intégrité (API WebCrypto)
   */
  async hashGameState(state) {
    // Note: On ne hash souvent que le "board" et "isFinished" 
    // pour éviter les petites différences locales non impactantes
    const dataToHash = {
      board: state.board,
      isFinished: state.isFinished,
      winner: state.winner,
    };
    
    const dataString = JSON.stringify(dataToHash);
    const encoder = new TextEncoder();
    const dataArray = encoder.encode(dataString);
    
    // crypto.subtle est supporté dans la majorité des navigateurs et Node.js via le global this
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Conversion en chaîne Hexadécimale classique
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
