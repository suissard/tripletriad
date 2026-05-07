import { SkillHandler, SkillContext, TargetType } from './types';

/**
 * Skill: Teleportation
 * Effet : Permet à la carte de se déplacer vers une case vide ciblée lors du placement.
 * 
 * Exemple Strapi :
 * {
 *   "type": "teleportation",
 *   "trigger": "onEnterPlay"
 * }
 */
const handler: SkillHandler = {
  id: 'teleportation',
  name: 'Téléportation',
  description: 'Se téléporte sur une case vide ciblée au placement.',
  effectType: 'neutral',

  targetingSteps: [
    { type: TargetType.CELL, emptyOnly: true }
  ],

  onEnterPlay(ctx: SkillContext) {
    const { board, x, y, targets } = ctx;
    
    // Si aucune cible n'est fournie, on ne peut pas se téléporter
    if (!targets || targets.length === 0) return;

    // La première cible fournie est la destination
    const target = targets[0];
    const tx = target.x;
    const ty = target.y;

    // Vérification de sécurité : destination dans la grille et vide
    if (
      ty >= 0 && ty < board.length && 
      tx >= 0 && tx < board[0].length && 
      board[ty][tx] === null
    ) {
      // On récupère la carte à sa position actuelle
      const card = board[y][x];
      if (!card) return;

      // On la déplace vers la nouvelle position
      board[ty][tx] = card;
      board[y][x] = null;

      // Note: Le GameEngine continuera son exécution. 
      // Si le GameEngine a été conçu pour traiter les captures APRÈS onEnterPlay,
      // il risque de traiter les captures depuis l'ancienne position (x, y).
      // Cependant, board[y][x] étant désormais null, les captures classiques seront ignorées.
      
      // On ajoute une alerte si le contexte le permet
      if ((ctx as any).alerts) {
        (ctx as any).alerts.push('TELEPORT!');
      }
    }
  }
};

export default handler;
