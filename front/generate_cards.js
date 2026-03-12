const fs = require('fs');

const elements = ["None", "Fire", "Ice", "Thunder", "Earth", "Poison", "Wind", "Water", "Holy"];
const names = [
    "Goblin", "Fang", "Skeleton", "Flan", "Dire Rat", "Bat", "Slime", "Bomb", "Mandragora", // Level 1-2
    "Cactuar", "Tonberry", "Ochu", "Malboro", "Behemoth", "Iron Giant", "Chimera", "Coeurl", "Mummy", // Level 3-4
    "Ifrit", "Shiva", "Ramuh", "Titan", "Diabolos", "Leviathan", "Carbuncle", "Siren", "Cerberus", // Level 5-6
    "Odin", "Bahamut", "Alexander", "Gilgamesh", "Ultima Weapon", "Omega Weapon", "Kefka", "Sephiroth", "Kuja", // Level 7-8
    "Squall", "Cloud", "Zidane", "Tidus", "Lightning", "Noctis", "Clive", "Yuna", "Aerith" // Level 9-10
];

const cards = [];

function getStatValue(level) {
    // Base power scales with the level of the card.
    // Level 1: values around 1 to 4
    // Level 10: values around 7 to 10 ('A')
    const min = Math.max(1, Math.floor(level / 2));
    let max = Math.min(10, level + 2);

    // High-level cards can push boundaries higher
    if (level >= 8) { max = 10; }

    const val = Math.floor(Math.random() * (max - min + 1)) + min;
    return val === 10 ? 'A' : val.toString();
}

for (let i = 0; i < 45; i++) {
    const tier = Math.floor(i / 9); // 0 to 4
    let level;
    if (tier === 0) level = Math.floor(Math.random() * 2) + 1; // 1-2
    else if (tier === 1) level = Math.floor(Math.random() * 2) + 3; // 3-4
    else if (tier === 2) level = Math.floor(Math.random() * 2) + 5; // 5-6
    else if (tier === 3) level = Math.floor(Math.random() * 2) + 7; // 7-8
    else level = Math.floor(Math.random() * 2) + 9; // 9-10

    const top = getStatValue(level);
    const right = getStatValue(level);
    const bottom = getStatValue(level);
    const left = getStatValue(level);

    // ~30% chance to have an elemental affinity
    const hasElement = Math.random() < 0.3;
    const element = hasElement ? elements[Math.floor(Math.random() * (elements.length - 1)) + 1] : "None";

    cards.push({
        id: i + 1,
        name: names[i] || `Card ${i + 1}`,
        description: `Une carte de niveau ${level} redoutable.`,
        level: level,
        element: element,
        topValue: top,
        rightValue: right,
        bottomValue: bottom,
        leftValue: left,
        img: `https://api.dicebear.com/9.x/bottts/png?seed=${names[i] || i}&backgroundColor=transparent`
    });
}

const dir = '/home/suissard/Bureau/Lien vers PROGRAMMATION/tripletriad/front/src/data';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const path = `${dir}/cards.json`;
fs.writeFileSync(path, JSON.stringify(cards, null, 2));
console.log('Cards successfully generated at ' + path);
