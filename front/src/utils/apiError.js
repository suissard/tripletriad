/**
 * Extrait un message lisible (en français) d'une erreur levée par strapiService.request().
 *
 * request() lève une Error dont `.message` / `.data.error.message` contiennent le message
 * renvoyé par Strapi (en anglais). Les anciens appels lisaient `err.response?.data` (forme axios),
 * qui n'existe pas : le joueur voyait toujours le message générique.
 */

const TRANSLATIONS = [
  [/^You cannot send a friend request to yourself/i, () => 'Vous ne pouvez pas vous ajouter vous-même.'],
  [/^User not found/i, () => 'Joueur introuvable.'],
  [/^You are already friends/i, () => 'Vous êtes déjà amis.'],
  [/^A friend request already exists/i, () => 'Une demande d\'ami existe déjà entre vous.'],
  [/^Cannot send a new request yet\. Please wait (\d+) hours/i, (m) => `Nouvelle demande possible dans ${m[1]} h.`],
  [/^Cannot send friend request/i, () => 'Impossible d\'envoyer la demande.'],
  [/^Identifier is required/i, () => 'Indiquez un pseudo, un e-mail ou un identifiant.'],
  [/^Friend request not found/i, () => 'Demande d\'ami introuvable.'],
  [/^Friendship not found/i, () => 'Relation introuvable.'],
  [/^You cannot block yourself/i, () => 'Vous ne pouvez pas vous bloquer vous-même.'],
  [/^Not enough (\w+)/i, (m) => `Pas assez de ${({ coins: 'pièces', gems: 'gemmes', dust: 'poussière' })[m[1]] || m[1]}.`],
  [/^You already own this/i, () => 'Vous possédez déjà cet objet.'],
  [/already available for free/i, () => 'Cet objet est déjà disponible gratuitement.'],
  [/^Wallet not found/i, () => 'Portefeuille introuvable.'],
  [/^You must be logged in/i, () => 'Vous devez être connecté.'],
];

export function getApiErrorMessage(err, fallback) {
  const raw = err?.data?.error?.message || err?.message || '';
  for (const [pattern, translate] of TRANSLATIONS) {
    const match = raw.match(pattern);
    if (match) return translate(match);
  }
  // Message serveur inconnu ou erreur réseau : le fallback (en français) est plus clair
  return fallback;
}
