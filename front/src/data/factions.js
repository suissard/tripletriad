import { FACTIONS, ELEMENTS, ELEMENT_LABELS } from '../../../shared/constants';

export const factions = FACTIONS;
export { ELEMENTS, ELEMENT_LABELS };

export const ELEMENT_OPTIONS = ELEMENTS.map(el => ({
    label: ELEMENT_LABELS[el] || el,
    value: el
}));
