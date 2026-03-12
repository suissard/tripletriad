import { GameEngine, GameState, PlaceCardAction, Player } from './GameEngine';

// --- Types de messages réseau pour le Data Channel WebRTC ---

export type GameMessage = 
  // Message envoyé lorsqu'un joueur pose une carte
  | { type: 'ACTION'; action: PlaceCardAction; turnIndex: number }
  // Message envoyé pour synchroniser/vérifier l'état du plateau après un tour
  | { type: 'SYNC'; stateHash: string; turnIndex: number };

// --- Configuration du Turn Manager ---

export interface TurnManagerConfig {
  localPlayer: Player;
  initialState: GameState;
  
  // Callback pour envoyer un message sur le DataChannel
  sendNetworkMessage: (msg: GameMessage) => void;
  
  // Callback déclenché pour mettre à jour l'UI avec le nouvel état
  onStateUpdate: (newState: GameState) => void;
  
  // Callback déclenché si une triche ou une désynchronisation est détectée
  onDesync: (turnIndex: number, localHash: string, remoteHash: string) => void;
}

// --- Le Gestionnaire P2P ---

export class TurnManager {
  private state: GameState;
  private localPlayer: Player;
  private turnIndex = 0;

  // On stocke les hashs générés localement et reçus du réseau pour les comparer
  private localHashes: Map<number, string> = new Map();
  private expectedRemoteHashes: Map<number, string> = new Map();

  private sendNetworkMessage: (msg: GameMessage) => void;
  private onStateUpdate: (newState: GameState) => void;
  private onDesync: (turnIndex: number, localHash: string, remoteHash: string) => void;

  constructor(config: TurnManagerConfig) {
    this.state = config.initialState;
    this.localPlayer = config.localPlayer;
    this.sendNetworkMessage = config.sendNetworkMessage;
    this.onStateUpdate = config.onStateUpdate;
    this.onDesync = config.onDesync;

    // Initialise l'UI
    this.onStateUpdate(this.state);
  }

  /**
   * Appelé par le composant Front quand le joueur local pose une carte
   */
  public async playLocalAction(action: PlaceCardAction): Promise<void> {
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
  public async handleNetworkMessage(msg: GameMessage): Promise<void> {
    if (msg.type === 'ACTION') {
      await this.handleRemoteAction(msg.action, msg.turnIndex);
    } else if (msg.type === 'SYNC') {
      this.handleRemoteSync(msg.stateHash, msg.turnIndex);
    }
  }

  // --- Gestionnaires privés de réception ---

  private async handleRemoteAction(action: PlaceCardAction, incomingTurnIndex: number): Promise<void> {
    if (action.player === this.localPlayer) {
      console.warn("ALERTE: Tentative d'imposture réseau (A joué une carte à notre nom).");
      return;
    }
    if (incomingTurnIndex !== this.turnIndex) {
      console.warn(`Désynchro de Tour: Reçu action pour tour ${incomingTurnIndex}, attendu ${this.turnIndex}`);
      // Logique possible de reconnexion / buffer ici si on ne gère pas du tour par tour strict
    }

    // 1. Appliquer l'action reçue
    this.state = GameEngine.computeNextState(this.state, action);
    const resolvedTurnIndex = this.turnIndex;
    this.turnIndex++; // Incrémenter notre horloge interne
    this.onStateUpdate(this.state);

    // 2. Générer notre hash local pour l'état résultant et valider l'intégrité
    await this.generateAndSendHash(resolvedTurnIndex, this.state);
  }

  private handleRemoteSync(remoteHash: string, turnIndex: number): void {
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

  private async generateAndSendHash(turnIndex: number, targetState: GameState): Promise<void> {
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
  private async hashGameState(state: GameState): Promise<string> {
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
