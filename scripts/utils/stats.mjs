/**
 * Triple Triad Stats Generation Logic
 * Based on rarity ranges.
 */

export const RARITY_RANGES = {
  "Common": [0, 9],
  "Uncommon": [10, 19],
  "Rare": [20, 28],
  "Epic": [29, 35],
  "Legendary": [36, 40]
};

/**
 * Format a numeric value to Triple Triad string representation (1-9, A for 10)
 * @param {number} value 
 * @returns {string}
 */
export function formatStat(value) {
  if (value >= 10) return "A";
  return value.toString();
}

/**
 * Génère des statistiques Triple Triad aléatoires selon la rareté.
 * @param {string} rarity - "Common", "Uncommon", "Rare", "Epic", "Legendary"
 * @return {object} - { top, right, bottom, left } (values as strings)
 */
export function generateTripleTriadStats(rarity) {
  // Récupère la plage de score ou utilise Common par défaut
  const range = RARITY_RANGES[rarity] || RARITY_RANGES["Common"];
  
  // 1. Choisir un score total aléatoire dans la tranche
  let totalScore = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

  let numericStats = { top: 0, right: 0, bottom: 0, left: 0 };
  let keys = ["top", "right", "bottom", "left"];
  let remainingScore = totalScore;

  // 2. Distribuer le score sur les 4 directions
  for (let i = 0; i < 3; i++) {
    // Le minimum doit permettre aux directions restantes d'atteindre le score (max 10 par côté)
    let minPossible = Math.max(0, remainingScore - (3 - i) * 10);
    // Le maximum ne peut pas dépasser 10 ou le score restant
    let maxPossible = Math.min(10, remainingScore);
    
    let value = Math.floor(Math.random() * (maxPossible - minPossible + 1)) + minPossible;
    
    numericStats[keys[i]] = value;
    remainingScore -= value;
  }
  
  // La dernière direction reçoit le reste
  numericStats[keys[3]] = remainingScore;

  // Format to strings (A for 10)
  return {
    top: formatStat(numericStats.top),
    right: formatStat(numericStats.right),
    bottom: formatStat(numericStats.bottom),
    left: formatStat(numericStats.left)
  };
}
