export const DECK_SIZE = 30;

function parseRaritySide(v) {
    if (v === 'A' || v === 'a' || v === 100 || v === '100' || v === 10 || v === '10') return 10;
    const parsed = parseInt(v, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(10, parsed));
}

export function getRarity(data) {
    const sum =
        parseRaritySide(data.top ?? data.topValue) +
        parseRaritySide(data.right ?? data.rightValue) +
        parseRaritySide(data.bottom ?? data.bottomValue) +
        parseRaritySide(data.left ?? data.leftValue);
    if (sum < 20) return { color: '#a0a0a0', hex: 0xa0a0a0, name: 'Commun' };        // Gris clair
    if (sum < 26) return { color: '#4caf50', hex: 0x4caf50, name: 'Peu Commun' };    // Vert vibrant
    if (sum < 32) return { color: '#2196f3', hex: 0x2196f3, name: 'Rare' };          // Bleu azur
    if (sum < 36) return { color: '#9c27b0', hex: 0x9c27b0, name: 'Épique' };        // Violet profond
    return { color: '#ffc107', hex: 0xffc107, name: 'Légendaire' };                  // Or
}

export const displayVal = (v) =>
    (v === 100 || v === '100' || v === 10 || v === '10' || v === 'A' || v === 'a') ? 'A' : v;
