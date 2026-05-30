# Architecture d'un Système de Compétences 100% Modulaire

Pour répondre à votre besoin de modularité totale, le système doit être conçu comme un **moteur de règles combinatoire**. 
Plutôt que d'avoir des compétences rigides et codées en bloc (ex : `bomb` qui fait des dégâts à la mort), nous découplons complètement :
1. **L'Effet** (quoi ?)
2. **Le Déclencheur / Trigger** (quand ?)
3. **Le Ciblage / Origine & Zone** (où et qui ?)
4. **Le Cycle de Vie / Charges** (combien de fois ?)

---

## 1. Modélisation de la Donnée (Schéma Strapi 5 Unique)

Au lieu d'un schéma encombré ou de composants rigides, chaque compétence est un composant unique `game.skill` configurable de manière atomique :

```json
{
  "attributes": {
    "effect_type": {
      "type": "enumeration",
      "enum": ["DAMAGE", "HEAL", "STAT_MODIFIER", "ROTATE", "FREEZE", "WARD", "TELEPORT"]
    },
    "value": { "type": "integer" },
    
    "trigger": {
      "type": "enumeration",
      "enum": ["onEnterPlay", "onEndOfTurn", "onDeath", "onCaptured", "onStartOfTurn"]
    },
    
    "origin_type": {
      "type": "enumeration",
      "enum": ["SELF", "MANUAL", "FIXED"]
    },
    "target_pattern": {
      "type": "enumeration",
      "enum": ["SELF", "ADJACENT", "CROSS", "DIAGONALS", "ROW", "COLUMN", "ALL"]
    },
    "target_filter": {
      "type": "enumeration",
      "enum": ["NONE", "ALLIES", "ENEMIES", "EMPTY"]
    },
    "range": { "type": "integer", "default": 1 },
    
    "max_charges": { "type": "integer", "default": 0, "description": "0 = infini" }
  }
}
```

---

## 2. Organisation du Code (shared/skills/)

Pour assurer la modularité, le code est structuré selon le **Design Pattern Strategy**. Chaque aspect du skill a sa responsabilité propre.

```
shared/skills/
├── index.ts                 # Point d'entrée et API du registre
├── SkillEngine.ts           # Orchestrateur central (écoute les hooks, décrémente les charges)
├── targeting.ts             # Résolution géométrique des cellules cibles
├── types.ts                 # Définitions TypeScript
└── effects/                 # Répertoire des comportements (effets) unitaires
    ├── Effect.ts            # Interface commune des effets
    ├── damage.ts            # Effet : Dégâts et destruction
    ├── heal.ts              # Effet : Soin de PV
    ├── statModifier.ts      # Effet : Bonus/Malus sur les côtés (growing/decrease)
    └── rotate.ts            # Effet : Rotation des valeurs
```

---

## 3. Implémentation Technique

### A. L'Interface des Effets (`effects/Effect.ts`)
Chaque effet doit implémenter une interface simple et standardisée :

```typescript
import { SkillContext } from '../types';

export interface Effect {
  id: string; // Ex: 'DAMAGE', 'HEAL'
  
  /**
   * Exécute l'effet uniquement sur les cibles calculées en amont.
   */
  execute(
    ctx: SkillContext,
    targets: Array<{ x: number; y: number; cell: any }>,
    value: number
  ): void;
}
```

### B. Exemple d'Effet : Les Dégâts (`effects/damage.ts`)
L'effet ne s'occupe plus de savoir *quand* ou *qui* il touche. On lui donne des cibles, il applique les dégâts :

```typescript
import { Effect } from './Effect';
import { SkillContext } from '../types';

export const damageEffect: Effect = {
  id: 'DAMAGE',
  
  execute(ctx, targets, value) {
    const { board, alerts, captures, dyingCards } = ctx;
    
    for (const { x, y, cell } of targets) {
      if (!cell || !cell.data) continue;
      
      // Vérifier le bouclier (Ward)
      const hasWard = cell.data.skills?.some((s: any) => s.effect_type === 'WARD');
      if (hasWard) {
        alerts.push('WARD!');
        cell.data.skills = cell.data.skills.filter((s: any) => s.effect_type !== 'WARD');
        continue;
      }
      
      const currentHp = cell.data.hp !== undefined ? cell.data.hp : (cell.data.defaultHp || 3);
      const nextHp = currentHp - value;
      
      if (nextHp <= 0) {
        // Enregistrer pour la mort et vider la cellule
        dyingCards.push({ x, y, cell });
        board[y][x] = null;
        captures.push({ ...cell.data, dead: true, event: 'damage_death' });
      } else {
        cell.data.hp = nextHp;
        captures.push({ ...cell.data, event: 'damage_taken' });
      }
    }
  }
};
```

### C. Le Moteur de Résolution Géométrique (`targeting.ts`)
Un algorithme unique et centralisé résout la liste des cellules cibles en combinant `origin_type`, `target_pattern`, `target_filter` et `range` :

```typescript
import { SkillContext } from './types';

export function resolveTargets(ctx: SkillContext): Array<{ x: number; y: number; cell: any }> {
  const { board, skill, x, y, owner } = ctx;
  
  // 1. Déterminer l'origine
  let ox = x;
  let oy = y;
  if (skill.origin_type === 'FIXED' && ctx.targets?.length > 0) {
    ox = ctx.targets[0].x;
    oy = ctx.targets[0].y;
  }
  
  // 2. Calculer le motif (Pattern)
  const targets: Array<{ x: number; y: number; cell: any }> = [];
  const range = skill.range || 1;
  
  if (skill.target_pattern === 'ADJACENT') {
    const dirs = [{dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0}];
    for (const d of dirs) {
      const nx = ox + d.dx * range;
      const ny = oy + d.dy * range;
      if (ny >= 0 && ny < board.length && nx >= 0 && nx < board[0].length) {
        targets.push({ x: nx, y: ny, cell: board[ny][nx] });
      }
    }
  }
  // ... Autres motifs (Cross, Row, Column, All)
  
  // 3. Filtrer les cibles
  return targets.filter(t => {
    if (skill.target_filter === 'ENEMIES') return t.cell && t.cell.owner !== owner;
    if (skill.target_filter === 'ALLIES') return t.cell && t.cell.owner === owner;
    if (skill.target_filter === 'EMPTY') return t.cell === null;
    return true;
  });
}
```

### D. L'Orchestrateur Central (`SkillEngine.ts`)
C'est le chef d'orchestre. Il gère l'état (les charges/compteurs) et coordonne le ciblage avec l'effet :

```typescript
import { SkillContext } from './types';
import { resolveTargets } from './targeting';
import { effectsMap } from './effects'; // Contient les stratégies enregistrées

export class SkillEngine {
  /**
   * Déclenche un hook de jeu (ex: onEndOfTurn) pour une carte.
   */
  public static dispatch(triggerName: string, ctx: SkillContext): void {
    const skills = ctx.card?.skills || [];
    
    for (const skill of skills) {
      // 1. Vérifier si le trigger correspond
      if (skill.trigger !== triggerName) continue;
      
      // 2. Vérifier et consommer les charges (counter)
      if (skill.charges !== undefined && skill.charges <= 0) {
        continue; // Plus de charge restante
      }
      
      // 3. Récupérer la stratégie d'effet
      const effectExecutor = effectsMap.get(skill.effect_type);
      if (!effectExecutor) {
        console.warn(`Effet non supporté : ${skill.effect_type}`);
        continue;
      }
      
      // 4. Résoudre les cibles géométriques
      const targets = resolveTargets({ ...ctx, skill });
      
      // 5. Exécuter l'effet
      console.log(`[SkillEngine] Déclenchement de l'effet "${skill.effect_type}" via "${triggerName}"`);
      effectExecutor.execute(ctx, targets, skill.value);
      
      // 6. Consommer une charge si applicable
      if (skill.charges !== undefined && skill.charges > 0) {
        skill.charges--;
      }
    }
  }
}
```

---

## 4. Avantages Majeurs de cette Architecture

1. **Modularité Absolue** : Vous pouvez créer une compétence "Soin de zone à la mort" simplement en configurant : `effect_type = HEAL`, `trigger = onDeath`, `target_pattern = ADJACENT`. Aucun code de skill spécifique n'est à écrire !
2. **Maintenance Réduite** : Si vous corrigez un bug de dégâts ou de mort, vous le faites dans `effects/damage.ts`. Tous les skills infligeant des dégâts en bénéficient instantanément.
3. **Évolutivité de Gameplay** : Pour ajouter un nouvel effet (ex : *Voleur de stats*), vous créez simplement un fichier dans `effects/` et l'ajoutez à la `effectsMap`. L'ensemble du moteur de ciblage et de trigger reste intact.
4. **Zéro Bruit en BDD** : Les relations sont supprimées. Le payload JSON est plat, optimisé et direct.
