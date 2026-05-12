# Guide des Compétences (Skills) - Triple Triad (Version Exhaustive)

Ce document est le guide de référence ultime pour configurer les compétences des cartes.

---

## 🏗️ Anatomie d'une Compétence (`game.skill`)

### 1. Paramètres de Cycle de Vie
- **Type** : L'identifiant technique (ex: `growing`, `bomb`, `heal`).
- **Value** : Intensité de l'effet (quantité de soin, dégâts, ou bonus de stat).
- **Counter** : Nombre limite de déclenchements. La compétence s'autodétruit quand le compteur atteint 0. *(0 ou vide = Infini)*.
- **Duration** : Durée en nombre de tours. La compétence s'autodétruit après X tours passés sur le plateau.
- **Effect Type** : Impact visuel et thématique (ex: `positive` [Vert], `negative` [Rouge], `neutral` [Bleu/Gris]).

### 2. Les Déclencheurs (`trigger`)
Le `trigger` définit le moment de l'activation.

| Trigger | Moment de l'activation | Exemples d'usage |
| :--- | :--- | :--- |
| `onDrawn` | Quand la carte est piochée dans la main du joueur. | Effets de pioche, bonus immédiat en main. |
| `onBeforePlacement` | Juste avant que la carte ne soit posée sur le plateau. | Modifier les stats de la carte avant qu'elle n'attaque. |
| `onEnterPlay` | Dès que la carte est posée sur une case. | Soin, Dégâts immédiats (Cri de guerre), Téléportation. |
| `onEndOfTurn` | À la fin du tour du joueur possédant la carte. | Croissance, Poison passif, Décroissance. |
| `onStartOfTurn` | Au début du tour du joueur. | Régénération de HP, Bouclier temporaire. |
| `onCapture` | Quand CETTE carte capture une carte ennemie. | Gagner des HP à chaque capture, Re-jouer (Combo). |
| `onCaptured` | Quand CETTE carte est capturée par l'ennemi. | Contre-attaque (Poison), Piège. |
| `onDeath` | Quand les HP de la carte tombent à 0 ou moins. | Explosion (Bomb), Invocation de jeton. |
| `passive` | L'effet est permanent tant que la carte est là. | Aura de bonus, Sniper, Bouclier (Ward). |

---

### 3. Ciblage et Zones d'Effet

#### L'Origine (`origin_type`)
- `self` : L'effet part de la case où se trouve la carte.
- `fixed` : L'effet part d'un point décalé (ex: 2 cases au dessus).
    - Utilise `origin_direction` (top, bottom, etc.) et `origin_reach` (distance).
- `manual` : Le joueur peut cliquer sur **n'importe quelle case** du plateau lors du placement.
- `manual_constrained` : Le joueur choisit une case, mais dans un **rayon limité** défini par `origin_reach`.

#### Le Motif (`patterns`)
Définit la forme de la zone autour de l'origine. C'est un composant répétable.
- `self` : Uniquement la case d'origine.
- `adjacent` : Les 4 cases cardinales (Haut, Bas, Gauche, Droite).
- `diagonals` : Les 4 cases en diagonale.
- `cross` : Les cases adjacentes ET diagonales (étoile à 8 branches).
- `diamond` / `cross_diamond` : Cible toutes les cases dans un losange (distance de Manhattan). Pas de trous.
- `square` / `area` / `cross_full` : Cible toutes les cases dans un carré (distance de Chebyshev). Couvre une zone rectangulaire pleine.
- `row` : Toute la ligne horizontale.
- `column` : Toute la colonne verticale.
- `top`, `bottom`, `left`, `right` : Une ligne droite dans une direction spécifique (jusqu'à portée).
- `all` : L'intégralité du plateau de jeu.

#### Les Modificateurs de Zone
- **Range** : Étend la portée de chaque pattern (ex: `top` avec `range: 2` touchera les 2 cases au dessus).
- **Filter** :
    - `none` : Toutes les cases.
    - `allies` : Uniquement les cartes du joueur.
    - `enemies` : Uniquement les cartes de l'adversaire.
    - `empty` : Uniquement les cases vides du plateau.
    - `self` : Uniquement la carte déclencheuse.

---

## ✅ Exemples de Combinaisons Puissantes

### "Le Laser Orbital"
- **Type** : `death` | **Value** : `5` | **Trigger** : `onEnterPlay`
- **Origin** : `self` | **Patterns** : `column` | **Filter** : `none`
- *Effet : Détruit presque tout sur sa colonne au moment où il est posé.*

### "La Mine de Proximité"
- **Type** : `bomb` | **Value** : `2` | **Trigger** : `onDeath`
- **Patterns** : `adjacent` | **Counter** : `1`
- *Effet : Explose une seule fois quand elle est détruite.*

### "Le Guérisseur à Distance" (Manual Constrained)
- **Type** : `heal` | **Value** : `2` | **Trigger** : `onEnterPlay`
- **Origin** : `manual_constrained` | **Origin Reach** : `2` (peut viser à 2 cases max)
- **Patterns** : `self` | **Filter** : `allies`

---

## ❌ Contre-Exemples et Erreurs Fatales

1. **Le "Faux Passif"** : Utiliser `trigger: passive` pour une `bomb`. 
   - *Résultat* : La bombe n'explosera jamais car elle attend un événement de mort (`onDeath`).
2. **L'Origine Manuelle Invisible** : Utiliser `origin_type: manual` pour un trigger `onEndOfTurn`.
   - *Résultat* : À la fin du tour, il n'y a pas d'interface pour que le joueur choisisse une cible. L'effet échouera ou visera au hasard.
3. **Le Sniper Sans Portée** : Mettre le type `sniper` mais oublier de mettre le trigger en `passive`.
   - *Résultat* : La carte ne pourra pas attaquer à distance car le moteur ne verra pas la compétence active lors du calcul des attaques.
4. **La Croissance Infinie Oubliée** : Mettre `growing` sur `all` sans filtre.
   - *Résultat* : Vous allez booster aussi les cartes de votre adversaire à chaque tour ! Toujours filtrer sur `allies` ou `self`.

---

## 💡 Astuces Avancées
- **Cumul de Patterns** : Vous pouvez mettre `adjacent` ET `self` dans les patterns pour qu'un sort de soin soigne la carte elle-même ET ses voisins.
- **Counter Temporaire** : Utilisez `counter: 1` sur une `aura` pour qu'elle ne booste les alliés que pendant le tour où elle est posée (elle sera désactivée après).
- **Combos de Skills** : Une carte peut avoir plusieurs skills. Exemple : `growing` (pour soi) + `aura` (pour les autres).
