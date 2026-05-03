import { getTargetCells } from './helpers';

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
    
    // Récupérer les cibles (peut être soi-même ou d'autres cartes selon la config Strapi)
    const targets = getTargetCells(ctx);

    targets.forEach(({ cell }) => {
      if (!cell) return;

      const sides = ['top', 'right', 'bottom', 'left'] as const;

      sides.forEach(side => {
        // Récupérer la valeur actuelle
        let valStr = cell.values?.[side] ?? cell.data?.[side + 'Value'];
        if (valStr === undefined) return;

        let val = (valStr === 'A' || valStr === 'a') ? 100 : parseInt(valStr as string) || 0;

        // Calculer la nouvelle valeur
        val = Math.max(0, Math.min(100, val - decrement));
        
        const newValStr = val >= 100 ? 'A' : val.toString();

        if (cell.values) cell.values[side] = newValStr;
        if (cell.data) cell.data[side + 'Value'] = newValStr;
      });
    });
  }
};

export default handler;
