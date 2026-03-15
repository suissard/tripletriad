const fs = require('fs');

const path = 'back/strapi/src/shared/GameEngine.ts';
let content = fs.readFileSync(path, 'utf8');

const functionToAdd = `
  /**
   * Génère un nombre pseudo-aléatoire déterministe entre 0 et 1 à partir de 3 identifiants.
   * L'ordre est important : player1Id, player2Id, matchId.
   */
  public static generateDeterministicRandom(player1Id: string, player2Id: string, matchId: string): number {
    const seedString = \`\${player1Id}-\${player2Id}-\${matchId}\`;

    // Simple hachage (ex: FNV-1a) pour convertir la string en un entier
    let h = 0x811c9dc5;
    for (let i = 0; i < seedString.length; i++) {
      h ^= seedString.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }

    // Convertir en un nombre positif sur 32 bits
    const unsignedHash = h >>> 0;

    // Ramener entre 0 et 1 (exclus)
    return unsignedHash / 4294967296; // 2^32
  }

  /**
   * Détermine le joueur qui commence la partie (PLAYER_1 si < 0.5, PLAYER_2 sinon)
   */
  public static determineStartingPlayer(player1Id: string, player2Id: string, matchId: string): Player {
    const rand = GameEngine.generateDeterministicRandom(player1Id, player2Id, matchId);
    return rand < 0.5 ? 'PLAYER_1' : 'PLAYER_2';
  }
`;

// Insert the new functions before the first method of GameEngine class
if (content.includes('public static createInitialState')) {
  content = content.replace('public static createInitialState', functionToAdd + '\n  public static createInitialState');
  fs.writeFileSync(path, content, 'utf8');
  console.log('GameEngine updated successfully.');
} else {
  console.log('Could not find createInitialState in GameEngine.');
}
