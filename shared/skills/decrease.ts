import { SkillHandler, SkillContext } from './types';
import { getTargetCells } from './helpers.js';

/**
 * Skill: Decrease (Décroissance)
 * Diminue les valeurs des cartes cibles à chaque fin de tour.
 * Par défaut (si patterns: self), diminue les valeurs de la carte elle-même.
 */
const handler: SkillHandler = {
  id: 'decrease',
  name: 'Décroissance',
  description: 'Les valeurs des cartes cibles diminuent à chaque fin de tour.',

  onEndOfTurn(ctx: SkillContext) {
    const { skill } = ctx;
    const decrement = skill.value || 0;
    
    // Par défaut, Décroissance s'applique à soi-même si aucun pattern n'est défini
    const skillWithDefault = {
        ...skill,
        patterns: skill.patterns && skill.patterns.length > 0 ? skill.patterns : [{ value: 'self' }]
    };

    const targets = getTargetCells({ ...ctx, skill: skillWithDefault });

    targets.forEach(({ x, y, cell }) => {
      if (!cell || !cell.data) return;

      console.log(`[Skill:Decrease] Processing card "${cell.data.name}" at (${x},${y}). Decrement: -${decrement}`);

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
        val = Math.max(0, Math.min(100, val - decrement));
        
        const newValStr = val >= 100 ? 'A' : val.toString();

        // Mettre à jour les propriétés pour la consistance (UI + Engine)
        cell.data[side] = val;
        cell.data[side + 'Value'] = newValStr;
        if (cell.data.values) {
          cell.data.values[side] = (val >= 100) ? 100 : val;
        }
      });

      console.log(`[Skill:Decrease] Card "${cell.data.name}" values updated:`, 
        `${oldValues.top}/${oldValues.right}/${oldValues.bottom}/${oldValues.left} -> ` +
        `${cell.data.topValue}/${cell.data.rightValue}/${cell.data.bottomValue}/${cell.data.leftValue}`
      );
    });
  }
};

export default handler;
