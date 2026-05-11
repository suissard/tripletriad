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

/**
 * Contexte de base passé aux hooks de compétence.
 */
export interface SkillContext {
  board: (Card | null)[][]; // Raccourci vers GameState.board
  state: GameState;
  x: number; // Position X de la carte déclenchant la compétence
  y: number; // Position Y de la carte déclenchant la compétence
  card: Card; // La carte déclenchant la compétence
  skill: {
    type: string;
    value?: number;
    counter?: number;
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
  // Propriétés optionnelles selon les événements
  attacker?: Card;
  defender?: Card;
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
