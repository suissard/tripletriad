# Guide de l'Architecture des Compétences Modulaires (Triple Triad)

Ce document explique le fonctionnement du **système de compétences modulaires** mis en place dans le projet *Terra Nullius*. Ce guide est conçu pour orienter les développeurs et servir d'instruction de référence ("system prompt context") pour les agents IA.

---

## 1. Vision et Concepts Clés

Le système de compétences repose sur un **moteur de règles combinatoire**. Au lieu de créer des compétences monolithiques et rigides (ex: `bomb` qui ne fait des dégâts qu'à la mort), nous découplons quatre concepts orthogonaux :

1. **L'Effet (`effect_type`)** : Ce que fait techniquement la compétence (infliger des dégâts, soigner, booster des statistiques, pivoter la carte, etc.).
2. **Le Déclencheur (`trigger`)** : Le moment du cycle de jeu où l'effet s'active (`onEnterPlay`, `onEndOfTurn`, `onDeath`, `onCaptured`...).
3. **Le Ciblage (`target_pattern`, `target_filter`, `range`)** : La zone géométrique d'action et les critères d'exclusion des cibles.
4. **Les Charges (`charges` ou `counter`)** : Le nombre maximal d'utilisations avant épuisement.

---

## 2. Structure des Fichiers dans `shared/skills/`

La logique est entièrement partagée entre le frontend et le moteur de jeu :

*   **`effects/Effect.ts`** : Interface commune que chaque stratégie d'effet doit implémenter.
*   **`effects/`** : Dossier contenant les stratégies autonomes (`damage.ts`, `heal.ts`, `statModifier.ts`, `rotate.ts`, `freeze.ts`, `ward.ts`).
*   **`targeting.ts` / `helpers.ts`** : Le moteur de ciblage géométrique calculant les coordonnées exactes sur la grille 3x3 selon le motif de zone.
*   **`SkillEngine.ts`** : L'orchestrateur central qui gère le cycle de vie, la consommation de charges et l'exécution séquentielle.
*   **`SkillRegistry.ts`** : Le registre global qui assure le dispatch et la rétro-compatibilité transparente.

---

## 3. Comment créer une nouvelle compétence ?

### Étape A : Par simple configuration (95% des cas)
Si l'effet technique existe déjà, **aucune ligne de code n'est nécessaire** ! Créez simplement la carte dans Strapi 5 (ou dans `shared/data/cards.json`) et configurez le composant `skill` :

*   **Soin collectif à la mort** :
    ```json
    {
      "effect_type": "HEAL",
      "value": 1,
      "trigger": "onDeath",
      "target_pattern": "adjacent",
      "target_filter": "allies"
    }
    ```
*   **Malus de zone au placement (3 charges max)** :
    ```json
    {
      "effect_type": "STAT_MODIFIER",
      "value": -1,
      "trigger": "onEnterPlay",
      "target_pattern": "cross",
      "target_filter": "enemies",
      "charges": 3
    }
    ```

---

### Étape B : En créant un nouvel Effet technique
Si vous devez ajouter un effet totalement inédit (ex: voler une compétence adverse) :

1.  **Créer le fichier d'effet** dans `shared/skills/effects/stealSkill.ts` :
    ```typescript
    import type { Effect } from './Effect';
    
    export const stealSkillEffect: Effect = {
      id: 'STEAL_SKILL',
      execute(ctx, targets, value) {
        targets.forEach(({ cell }) => {
          if (cell && cell.data) {
            // Logique de vol de compétence
          }
        });
      }
    };
    ```
2.  **Enregistrer l'effet** dans `shared/skills/effects/index.ts` :
    ```typescript
    import { stealSkillEffect } from './stealSkill';
    // ... l'ajouter au tableau effects
    ```
3.  **Ajouter la valeur à l'énumération** dans Strapi (`skill.json`).

---

## 4. La Couche de Rétro-Compatibilité ("Legacy Bridge")

Pour éviter de casser les cartes existantes et préserver l'historique, `SkillEngine` contient un traducteur automatique (`translateLegacySkill`). 

Si une carte possède un ancien type (ex: `"type": "bomb"`), le moteur le convertit dynamiquement en interne vers le nouveau format modulaire :

*   `"bomb"` $\rightarrow$ `effect_type: "DAMAGE"`, `trigger: "onDeath"`, `target_pattern: "adjacent"`, `target_filter: "enemies"`.
*   `"growing"` $\rightarrow$ `effect_type: "STAT_MODIFIER"`, `trigger: "onEndOfTurn"`, `target_pattern: "self"`.
*   `"heal"` $\rightarrow$ `effect_type: "HEAL"`, `trigger: "onEnterPlay"`, `target_pattern: "adjacent"`, `target_filter: "allies"`.

Ce pont garantit que les anciennes et les nouvelles cartes **cohabitent sans aucun conflit et sans plantage**.

---

## 5. Recommandations aux Agents IA

Lorsque vous travaillez sur le moteur de combat ou les cartes :
*   **Ne recréez pas** de logique de dégâts ou de ciblage dans les déclencheurs. Utilisez toujours le dispatch centralisé de `SkillRegistry.dispatch`.
*   **Faites confiance** à la géométrie de `getTargetCells` pour renvoyer les coordonnées.
*   Assurez-vous de décrémenter `charges` ou `counter` si la compétence a un nombre d'utilisations limité.
