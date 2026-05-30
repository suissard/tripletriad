import type { Effect } from './Effect';
import { damageEffect } from './damage';
import { healEffect } from './heal';
import { statModifierEffect } from './statModifier';
import { rotateEffect } from './rotate';
import { freezeEffect } from './freeze';
import { wardEffect } from './ward';

const effects = [
  damageEffect,
  healEffect,
  statModifierEffect,
  rotateEffect,
  freezeEffect,
  wardEffect
];

export const effectsMap = new Map<string, Effect>();
effects.forEach(e => effectsMap.set(e.id, e));
