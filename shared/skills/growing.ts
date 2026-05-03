import { getTargetCells } from './helpers';

/**
 * Skill: Growing (Croissance)
 * Augmente les valeurs des cartes cibles à chaque fin de tour.
 * Par défaut (si patterns: self), augmente les valeurs de la carte elle-même.
 */
const handler: SkillHandler = {
  id: 'growing',
  name: 'Croissance',
  description: 'Les valeurs des cartes cibles augmentent à chaque fin de tour.',

  onEndOfTurn(ctx: SkillContext) {
    const { skill } = ctx;
    const increment = skill.value || 0;
    
    // Récupérer les cibles (peut être soi-même ou d'autres cartes selon la config Strapi)
    const targets = getTargetCells(ctx);

    targets.forEach(({ cell }) => {
      if (!cell) return;

      const sides = ['top', 'right', 'bottom', 'left'] as const;

      sides.forEach(side => {
        // Récupérer la valeur actuelle (supporte le format values.top ou data.topValue)
        let valStr = cell.values?.[side] ?? cell.data?.[side + 'Value'];
        if (valStr === undefined) return;

        let val = (valStr === 'A' || valStr === 'a') ? 100 : parseInt(valStr as string) || 0;

        // Calculer la nouvelle valeur
        val = Math.max(0, Math.min(100, val + increment));
        
        // Convertir en format Triple Triad (A = 10, mais ici on gère jusqu'à 100 pour TN)
        // Note: displayVal gère l'affichage 'A' pour 100 dans le front
        const newValStr = val >= 100 ? 'A' : val.toString();

        if (cell.values) cell.values[side] = newValStr;
        if (cell.data) cell.data[side + 'Value'] = newValStr;
      });
    });
  }
};

export default handler;
