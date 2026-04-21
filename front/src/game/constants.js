export const DECK_SIZE = 30;

export function getRarity(data) {
    const sum = data.top + data.right + data.bottom + data.left;
    if (sum < 20) return { color: '#a0a0a0', hex: 0xa0a0a0, name: 'Commun' };        // Gris clair
    if (sum < 26) return { color: '#4caf50', hex: 0x4caf50, name: 'Peu Commun' };    // Vert vibrant
    if (sum < 32) return { color: '#2196f3', hex: 0x2196f3, name: 'Rare' };          // Bleu azur
    if (sum < 36) return { color: '#9c27b0', hex: 0x9c27b0, name: 'Épique' };        // Violet profond
    return { color: '#ffc107', hex: 0xffc107, name: 'Légendaire' };                  // Or
}

export const displayVal = (v) => (v === 100 || v === '100') ? 'A' : v;
