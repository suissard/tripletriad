import type { SkillHandler, SkillContext } from './types';
import { getTargetCells } from './helpers.js';
import { 
  EFFECT_TYPES, 
  SKILL_TRIGGERS, 
  SKILL_PATTERNS 
} from './constants';

/**
 * Skill: Growing (Croissance)
 * Effet : Augmente les valeurs de combat (Haut, Bas, Gauche, Droite) des cartes cibles.
 * 
 * Trigger variable : par défaut onEndOfTurn, mais configurable dans Strapi
 * (onEnterPlay, onCapture, onStartOfTurn, etc.)
 */
const handler: SkillHandler = {
  id: 'growing',
  name: 'Croissance',
  description: 'Les valeurs des cartes cibles augmentent (trigger variable).',
  effectType: EFFECT_TYPES.POSITIVE,
  defaultTrigger: SKILL_TRIGGERS.ON_END_OF_TURN,

  execute(ctx: SkillContext) {
    const { skill } = ctx;
    const increment = skill.value || 0;
    
    // Par défaut, Croissance s'applique à soi-même si aucun pattern n'est défini
    const skillWithDefault = {
        ...skill,
        patterns: skill.patterns && skill.patterns.length > 0 ? skill.patterns : [{ value: SKILL_PATTERNS.SELF }]
    };

    const targets = getTargetCells({ ...ctx, skill: skillWithDefault });

    targets.forEach(({ x, y, cell }) => {
      if (!cell || !cell.data) return;

      console.log(`[Skill:Growing] Processing card "${cell.data.name}" at (${x},${y}). Increment: +${increment} (trigger: ${skill.trigger || 'default'})`);

      const sides = ['top', 'right', 'bottom', 'left'] as const;
      const oldValues = { top: cell.data.topValue, right: cell.data.rightValue, bottom: cell.data.bottomValue, left: cell.data.leftValue };

      sides.forEach(side => {
        // Récupérer la valeur actuelle
        let valStr = (cell.data.values && cell.data.values[side] !== undefined) 
          ? cell.data.values[side] 
          : cell.data[side + 'Value'];
          
        if (valStr === undefined) return;

        let val = (valStr === 'A' || valStr === 'a') ? 100 : parseInt(valStr as string) || 0;

        // Calculer la nouvelle valeur
        val = Math.max(0, Math.min(100, val + increment));
        
        // Convertir en format Triple Triad
        const newValStr = val >= 100 ? 'A' : val.toString();

        // Mettre à jour les propriétés pour la consistance (UI + Engine)
        cell.data[side] = val;
        cell.data[side + 'Value'] = newValStr;
        if (cell.data.values) {
          cell.data.values[side] = (val >= 100) ? 100 : val;
        }
      });

      console.log(`[Skill:Growing] Card "${cell.data.name}" values updated:`, 
        `${oldValues.top}/${oldValues.right}/${oldValues.bottom}/${oldValues.left} -> ` +
        `${cell.data.topValue}/${cell.data.rightValue}/${cell.data.bottomValue}/${cell.data.leftValue}`
      );
    });
  }
};

export default handler;

