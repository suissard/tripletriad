import { GameState, Card } from '../GameEngine';

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
    duration?: number;
    // Origine
    origin_type?: 'self' | 'fixed' | 'manual' | 'manual_constrained';
    origin_direction?: string;
    origin_reach?: number;
    // Zone
    patterns?: Array<{ value: string } | string>;
    range?: number;
    filter?: 'none' | 'allies' | 'enemies' | 'empty' | 'self';
    [key: string]: any;
  };
  targets?: any[]; // Cibles fournies lors du placement
  // Propriétés optionnelles selon les événements
  attacker?: Card;
  defender?: Card;
  dir?: { dx: number, dy: number, mySide: string, oppSide: string };
}

export interface SkillHandler {
  id: string;
  name: string;
  description: string;
  targetingSteps?: TargetingStep[];

  // Cycle de vie / Hooks optionnels
  onDrawn?: (ctx: SkillContext) => void;
  onEnterPlay?: (ctx: SkillContext) => void;
  onEndOfTurn?: (ctx: SkillContext) => void;
  getValueModifier?: (ctx: SkillContext) => number;
  blocksCombo?: (ctx: SkillContext) => boolean;
  onCapture?: (ctx: SkillContext) => void;
  onDeath?: (ctx: SkillContext) => void;
  // Autres hooks au besoin...
}
