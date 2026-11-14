import { GameState, Card } from '../GameEngine';
import { 
  type SkillTrigger, 
  type SkillFilter, 
  type OriginType, 
  type EffectType,
  type SkillPattern,
  type CardDirection
} from './constants';

export enum TargetType {
  CELL = 'CELL',
  CARD = 'CARD',
  SELF = 'SELF',
  BOARD = 'BOARD'
}

export interface TargetingStep {
  type: TargetType;
  enemyOnly?: boolean;
  emptyOnly?: boolean;
}

export interface BoardCell {
  data: Card & Record<string, any>;
  owner: string;
  [key: string]: any;
}

/**
 * Contexte de base passé aux hooks de compétence.
 */
export interface SkillContext {
  board: (BoardCell | any | null)[][]; // Raccourci vers GameState.board
  state: GameState;
  x: number; // Position X de la carte déclenchant la compétence
  y: number; // Position Y de la carte déclenchant la compétence
  card: Card & Record<string, any>; // La carte déclenchant la compétence
  owner?: string;
  cell?: BoardCell | any;
  skill: {
    type: string;
    effect_type?: string;
    value?: number;
    counter?: number;
    charges?: number;
    depleted?: boolean;
    // Origine
    origin_type?: OriginType;
    origin_direction?: CardDirection;
    origin_reach?: number;
    // Zone
    patterns?: Array<{ value: SkillPattern | string } | SkillPattern | string>;
    range?: number;
    filter?: SkillFilter;
    trigger?: SkillTrigger;
    [key: string]: any;
  };
  targets?: any[]; // Cibles fournies lors du placement
  alerts?: string[];
  captures?: any[];
  dyingCards?: any[];
  attackQueue?: any[];
  attackerX?: number;
  attackerY?: number;
  targetX?: number;
  targetY?: number;
  // Propriétés optionnelles selon les événements
  attacker?: Card & Record<string, any>;
  defender?: Card & Record<string, any>;
  dir?: { dx: number, dy: number, mySide: string, oppSide: string };
}

export type { SkillTrigger };

export interface SkillHandler {
  id: string;
  name: string;
  description: string;
  effectType?: EffectType;
  targetingSteps?: TargetingStep[];

  /**
   * Trigger par défaut de ce skill, utilisé si skill.trigger n'est pas défini dans Strapi.
   * Ex: 'growing' → 'onEndOfTurn', 'heal' → 'onEnterPlay'
   */
  defaultTrigger?: SkillTrigger;

  /**
   * Logique d'exécution principale du skill (indépendante du trigger).
   * Quand défini, le SkillRegistry route l'appel ici selon skill.trigger (ou defaultTrigger).
   * Si non défini, le dispatch se rabat sur les hooks nommés (rétro-compatibilité).
   */
  execute?: (ctx: SkillContext) => any;

  // Cycle de vie / Hooks optionnels (rétro-compatibilité & skills passifs)
  onDrawn?: (ctx: SkillContext) => void;
  onBeforePlacement?: (ctx: SkillContext) => void;
  onEnterPlay?: (ctx: SkillContext) => void;
  onEndOfTurn?: (ctx: SkillContext) => void;
  getValueModifier?: (ctx: SkillContext) => number;
  blocksCombo?: (ctx: SkillContext) => boolean;
  onCapture?: (ctx: SkillContext) => void;
  onCaptured?: (ctx: SkillContext) => void;
  onBeforeCaptured?: (ctx: SkillContext) => void;
  onDeath?: (ctx: SkillContext) => void;
  extendsAttackRange?: (ctx: SkillContext) => boolean;
  hasCombo?: (ctx: SkillContext) => boolean;
  // Autres hooks au besoin...
}
