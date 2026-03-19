// Registre central de toutes les règles optionnelles du jeu
export const rulesRegistry = [
    {
        id: 'same',
        name: 'Identique (Same)',
        description: 'Capture si 2 côtés adjacents correspondent exactement aux cartes voisines.',
        defaultState: true,
        execute: (centerCard, neighbors, board) => {
            let sameMatches = [];
            neighbors.forEach(n => {
                const adj = board[n.i];
                if (adj && centerCard.userData.data[n.dir] === adj.userData.data[n.opp]) {
                    sameMatches.push({ i: n.i, adj });
                }
            });

            let captures = new Set();
            if (sameMatches.length >= 2) {
                sameMatches.forEach(m => captures.add(m.adj));
            }

            return {
                triggered: captures.size > 0,
                captures: Array.from(captures),
                alertMessage: "SAME!"
            };
        }
    },
    {
        id: 'plus',
        name: 'Plus',
        description: 'Capture si la somme de 2 côtés adjacents est égale pour deux voisines.',
        defaultState: true,
        execute: (centerCard, neighbors, board) => {
            let plusSums = {};
            neighbors.forEach(n => {
                const adj = board[n.i];
                if (adj) {
                    const sum = centerCard.userData.data[n.dir] + adj.userData.data[n.opp];
                    if (!plusSums[sum]) plusSums[sum] = [];
                    plusSums[sum].push({ i: n.i, adj });
                }
            });

            let captures = new Set();
            Object.values(plusSums).forEach(matches => {
                if (matches.length >= 2) {
                    matches.forEach(m => captures.add(m.adj));
                }
            });

            return {
                triggered: captures.size > 0,
                captures: Array.from(captures),
                alertMessage: "PLUS!"
            };
        }
    },
    {
        id: 'combo',
        name: 'Combo',
        description: 'Les cartes capturées par Same ou Plus attaquent à leur tour leurs voisines.',
        defaultState: true,
        // The combo rule is structural and handled in engine.js natively after initial captures
        execute: () => ({ triggered: false, captures: [], alertMessage: "" })
    }
];
