/**
 * Constantes de jeu partagées entre le front et le back.
 * Ce fichier est la source de vérité pour l'univers de Terra Nullius.
 */

/**
 * FACTIONS : Définit les groupes politiques et technologiques du jeu.
 * Chaque faction possède une identité visuelle (couleur) et une spécialité (élément).
 */
export const FACTIONS = [
  { id: 'ferrailleurs', name: 'Les Ferrailleurs', color: '#A0A0A0', element: 'furtif' },
  { id: 'exode', name: "L'Exode Pélagique", color: '#40E0D0', element: 'eau' },
  { id: 'choeur', name: 'Le Chœur Synthétique', color: '#FFBF00', element: 'hacking' },
  { id: 'omni', name: "L'Omni-Réseau", color: '#005FFF', element: 'reseau' },
  { id: 'martien', name: "L'Hégémonie Martienne", color: '#D90429', element: 'radiation' },
  { id: 'spore', name: 'Le Fléau Spore', color: '#39FF14', element: 'spore' },
  { id: 'heritier', name: 'Les Héritiers des Cendres', color: '#FFD700', element: 'longue_portee' },
  { id: 'dissonance', name: "L'Incursion Dissonante", color: '#8A2BE2', element: 'faille_dimensionnelle' },
  { id: 'behemoth', name: "L'Éveil Chthonien", color: '#FF4500', element: 'obsidienne' }
] as const;

/**
 * ELEMENTS : Liste brute des identifiants d'éléments de gameplay.
 */
export const ELEMENTS = FACTIONS.map(f => f.element);

/**
 * ELEMENT_LABELS : Noms affichables (traduits) des éléments pour l'UI.
 */
export const ELEMENT_LABELS: Record<string, string> = {
  'eau': 'Eau',
  'radiation': 'Radiation',
  'reseau': 'Réseau',
  'spore': 'Spore',
  'furtif': 'Furtif',
  'longue_portee': 'Longue Portée',
  'faille_dimensionnelle': 'Faille Dimensionnelle',
  'hacking': 'Hacking',
  'obsidienne': 'Obsidienne'
};
