/**
 * Source de vérité unique pour les constantes liées aux compétences (skills).
 * Ces valeurs sont utilisées par le front, le back (Strapi) et le moteur de jeu.
 */

/**
 * Triggers : Définissent QUAND une compétence active s'exécute.
 * Un skill peut être associé à n'importe quel trigger via Strapi.
 */
export const SKILL_TRIGGERS = {
  /** Se déclenche dès que la carte est piochée (main du joueur). */
  ON_DRAWN: 'onDrawn',
  /** Se déclenche juste avant que la carte ne soit posée sur le plateau. */
  ON_BEFORE_PLACEMENT: 'onBeforePlacement',
  /** Se déclenche immédiatement après la pose de la carte et les captures initiales. */
  ON_ENTER_PLAY: 'onEnterPlay',
  /** Se déclenche à la toute fin du tour du joueur actuel. */
  ON_END_OF_TURN: 'onEndOfTurn',
  /** Se déclenche au début du tour du joueur (avant qu'il ne joue). */
  ON_START_OF_TURN: 'onStartOfTurn',
  /** Se déclenche quand la carte effectue une capture réussie d'une carte adverse. */
  ON_CAPTURE: 'onCapture',
  /** Se déclenche quand la carte elle-même est capturée par l'adversaire. */
  ON_CAPTURED: 'onCaptured',
  /** Se déclenche quand la carte est retirée du plateau (mort/destruction). */
  ON_DEATH: 'onDeath',
  /** Utilisé pour les compétences passives (aura, freeze, combo...) qui n'ont pas de timing d'exécution propre. */
  PASSIVE: 'passive'
} as const;

export type SkillTrigger = typeof SKILL_TRIGGERS[keyof typeof SKILL_TRIGGERS];

/**
 * Patterns : Définissent la FORME de la zone d'effet (AoE) autour de l'origine.
 */
export const SKILL_PATTERNS = {
  /** Cible uniquement la case d'origine du skill. */
  SELF: 'self',
  /** Cible les 4 cases adjacentes (Haut, Bas, Gauche, Droite). */
  ADJACENT: 'adjacent',
  /** Cible les 4 cases en diagonale. */
  DIAGONALS: 'diagonals',
  /** Cible les cases adjacentes ET diagonales (étoile à 8 branches). */
  CROSS: 'cross',
  /** Cible toutes les cases dans un losange (distance de Manhattan). Pas de trous. */
  DIAMOND: 'diamond',
  /** Alias de DIAMOND. */
  CROSS_DIAMOND: 'cross_diamond',
  /** Cible toutes les cases dans un carré (distance de Chebyshev). Pas de trous. */
  SQUARE: 'square',
  /** Alias de SQUARE. Couvre une zone rectangulaire pleine. */
  AREA: 'area',
  /** Alias de SQUARE. */
  CROSS_FULL: 'cross_full',
  /** Cible toute la ligne horizontale de l'origine. */
  ROW: 'row',
  /** Cible toute la colonne verticale de l'origine. */
  COLUMN: 'column',
  /** Cible TOUTES les cases du plateau. */
  ALL: 'all',
  /** Cible une ligne droite vers le haut (jusqu'à portée). */
  TOP: 'top',
  /** Cible une ligne droite vers le bas (jusqu'à portée). */
  BOTTOM: 'bottom',
  /** Cible une ligne droite vers la gauche (jusqu'à portée). */
  LEFT: 'left',
  /** Cible une ligne droite vers la droite (jusqu'à portée). */
  RIGHT: 'right'
} as const;

export type SkillPattern = typeof SKILL_PATTERNS[keyof typeof SKILL_PATTERNS];

/**
 * Filtres : Restreignent les cibles valides au sein de la zone définie par le pattern.
 */
export const SKILL_FILTERS = {
  /** Aucune restriction (toutes les cases dans la zone sont ciblées). */
  NONE: 'none',
  /** Uniquement les cartes appartenant au joueur qui a posé la carte. */
  ALLIES: 'allies',
  /** Uniquement les cartes appartenant à l'adversaire. */
  ENEMIES: 'enemies',
  /** Uniquement les cases vides. */
  EMPTY: 'empty',
  /** Uniquement la carte qui possède le skill. */
  SELF: 'self'
} as const;

export type SkillFilter = typeof SKILL_FILTERS[keyof typeof SKILL_FILTERS];

/**
 * Origin Types : Définissent le POINT CENTRAL à partir duquel le pattern est appliqué.
 */
export const ORIGIN_TYPES = {
  /** L'origine est la case où se trouve la carte possédant le skill. */
  SELF: 'self',
  /** L'origine est décalée par rapport à la carte (via origin_direction et origin_reach). */
  FIXED: 'fixed',
  /** Le joueur doit choisir manuellement une case cible sur le plateau. */
  MANUAL: 'manual',
  /** Le joueur choisit manuellement, mais avec des contraintes de distance/forme. */
  MANUAL_CONSTRAINED: 'manual_constrained'
} as const;

export type OriginType = typeof ORIGIN_TYPES[keyof typeof ORIGIN_TYPES];

/**
 * Effect Types : Utilisés principalement pour l'UI (couleurs des icônes, animations).
 */
export const EFFECT_TYPES = {
  /** Bonus, soin, protection (Vert). */
  POSITIVE: 'positive',
  /** Dégâts, malus, destruction (Rouge). */
  NEGATIVE: 'negative',
  /** Effet utilitaire, déplacement, rotation (Bleu/Gris). */
  NEUTRAL: 'neutral'
} as const;

export type EffectType = typeof EFFECT_TYPES[keyof typeof EFFECT_TYPES];

/**
 * Card Directions : Directions cardinales et diagonales standard.
 */
export const CARD_DIRECTIONS = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
  TOP_LEFT: 'top_left',
  TOP_RIGHT: 'top_right',
  BOTTOM_LEFT: 'bottom_left',
  BOTTOM_RIGHT: 'bottom_right'
} as const;

export type CardDirection = typeof CARD_DIRECTIONS[keyof typeof CARD_DIRECTIONS];
