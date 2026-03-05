export const DECK_SIZE = 30;

export function getRarity(data) {
    const sum = data.top + data.right + data.bottom + data.left;
    if (sum < 20) return { color: '#4a4a4a', hex: 0x666666, name: 'Commun' };        // Gris
    if (sum < 26) return { color: '#1b5e20', hex: 0x2ecc71, name: 'Peu Commun' };    // Vert
    if (sum < 32) return { color: '#0d47a1', hex: 0x3498db, name: 'Rare' };          // Bleu
    if (sum < 36) return { color: '#4a148c', hex: 0x9b59b6, name: 'Épique' };        // Violet
    return { color: '#b8860b', hex: 0xf1c40f, name: 'Légendaire' };                  // Or
}

export const displayVal = (v) => v === 10 ? 'A' : v;
