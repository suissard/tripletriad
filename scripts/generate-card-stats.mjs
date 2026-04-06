import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setDefaultResultOrder } from 'node:dns';
import { generateTripleTriadStats, RARITY_RANGES } from './utils/stats.mjs';

// Force l'IPv4 en priorité pour éviter les erreurs de résolution locale (Node 18+)
setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '..', '.env');
const USAGE = `
Triple Triad Stats Generator & Strapi Sync
Usage:
  node scripts/generate-card-stats.mjs --rarity [Rarity]    - Generate stats for a given rarity
  node scripts/generate-card-stats.mjs --file [path]        - Update stats in a specific card JSON file
  node scripts/generate-card-stats.mjs --dir [path]         - Update all card JSON files in a directory
  node scripts/generate-card-stats.mjs --auto               - Update all cards in shared/data/cards with missing stats
  
Options:
  --sync    Push changes to Strapi (requires .env with ADMIN_EMAIL, ADMIN_PASSWORD)
  --push    Only push current local stats to Strapi (no regeneration)
`;

// --- Strapi Auth Logic ---

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
  }
  return env;
}

const env = loadEnv();
const STRAPI_URL = `http://127.0.0.1:${env.STRAPI_PORT || env.PORT || 1340}`;
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

async function getAdminToken() {
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec login Strapi (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.data.token;
}

async function fetchAllCards(token) {
  let allCards = [];
  let page = 1;
  const pageSize = 100;
  
  while (true) {
    const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::card.card?page=${page}&pageSize=${pageSize}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Échec récupération cartes Strapi: ${err}`);
    }
    
    const data = await res.json();
    const results = data.results || [];
    allCards = allCards.concat(results);
    
    if (page >= data.pagination?.pageCount || results.length === 0) break;
    page++;
  }
  
  const cardMap = {};
  allCards.forEach(c => {
    cardMap[c.name] = c;
  });
  return cardMap;
}

async function waitForStrapi(maxRetries = 5, delay = 5000) {
  console.log(`\n🔍 Vérification de la disponibilité de Strapi...`);
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const res = await fetch(`${STRAPI_URL}/admin/health`);
      if (res.ok) {
        console.log(`✅ Strapi est en ligne et répond.`);
        return true;
      }
    } catch (err) {
      // Continue to retry
    }
    console.log(`⏳ [${i}/${maxRetries}] Strapi ne répond pas encore, attente de ${delay/1000}s...`);
    await new Promise(r => setTimeout(r, delay));
  }
  return false;
}

async function updateStrapiStats(token, cardData, existingCard, retryCount = 3) {
  const payload = {
      topValue: cardData.topValue?.toString(),
      rightValue: cardData.rightValue?.toString(),
      bottomValue: cardData.bottomValue?.toString(),
      leftValue: cardData.leftValue?.toString(),
  };
  
  const url = `${STRAPI_URL}/content-manager/collection-types/api::card.card/${existingCard.documentId || existingCard.id}`;

  try {
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Mise à jour Strapi échouée pour ${cardData.name}: ${err}`);
    }
  } catch (err) {
    const errorMsg = err.message || 'Unknown error';
    const errorCause = err.cause ? ` (Cause: ${err.cause.message || err.cause})` : '';
    
    if (retryCount > 0) {
      console.log(`  ⚠️  Retry ${cardData.name} (${retryCount} left)... ${errorMsg}${errorCause}`);
      await new Promise(r => setTimeout(r, 2000));
      return updateStrapiStats(token, cardData, existingCard, retryCount - 1);
    }
    throw new Error(`${errorMsg}${errorCause}`);
  }
}

// --- Main CLI Logic ---

let strapiToken = null;
let strapiCards = null;

async function main() {
  const args = process.argv.slice(2);
  const isSync = args.includes('--sync');
  const isPush = args.includes('--push');
  
  if (isSync || isPush) {
    try {
      strapiToken = await getAdminToken();
      console.log('🔓 Authentifié sur Strapi.');
      strapiCards = await fetchAllCards(strapiToken);
      console.log(`🔍 ${Object.keys(strapiCards).length} cartes trouvées sur Strapi.`);
    } catch (err) {
      console.error(`❌ Erreur Strapi: ${err.message}`);
      return;
    }
  }

  if (args.includes('--rarity')) {
    const rarity = args[args.indexOf('--rarity') + 1];
    if (!rarity) {
      console.log('Error: Specify a rarity (Common, Uncommon, Rare, Epic, Legendary)');
      return;
    }
    const stats = generateTripleTriadStats(rarity);
    console.log(`Stats for ${rarity}:`, stats);
    console.log(`Total: ${stats.top + stats.right + stats.bottom + stats.left}`);
    return;
  } 

  let files = [];
  if (args.includes('--file')) {
    const filePath = args[args.indexOf('--file') + 1];
    if (filePath && fs.existsSync(filePath)) files.push(filePath);
  } else if (args.includes('--dir')) {
    const dirPath = args[args.indexOf('--dir') + 1];
    if (dirPath && fs.statSync(dirPath).isDirectory()) {
      files = getAllJsonFiles(dirPath);
    }
  } else if (args.includes('--auto')) {
    const cardsDir = path.join(__dirname, '..', 'shared', 'data', 'cards');
    files = getAllJsonFiles(cardsDir);
  }

  if (files.length === 0) {
    console.log(USAGE);
    return;
  }

  // --- Phase 1 : Local Updates ---
  console.log(`\n📂 Phase 1 : Mise à jour locale de ${files.length} fichiers...`);
  let modifiedCount = 0;
  const cardDataMap = new Map();

  for (const filePath of files) {
    const result = await updateCardFileLocally(filePath, isPush);
    if (result) {
      cardDataMap.set(filePath, result.cardData);
      if (result.modified) modifiedCount++;
    }
  }

  console.log(`✅ Phase 1 terminée. ${modifiedCount} fichiers modifiés.`);

  // --- Phase 2 : Strapi Sync ---
  if (isSync || isPush) {
    if (modifiedCount > 0) {
      console.log(`\n⏳ Attente de 5s (sécurité) pour que Strapi détecte les changements...`);
      await new Promise(r => setTimeout(r, 5000));
      
      const isOnline = await waitForStrapi();
      if (!isOnline) {
        console.error(`\n❌ Abandon : Strapi n'est pas redevenu opérationnel après plusieurs tentatives.`);
        return;
      }
    }

    console.log(`\n☁️ Phase 2 : Synchronisation Strapi...`);
    for (const [filePath, cardData] of cardDataMap) {
      await syncCardToStrapi(cardData);
    }
    console.log(`\n✨ Synchronisation Strapi terminée.`);
  }
}

function getAllJsonFiles(dirPath) {
  let results = [];
  const list = fs.readdirSync(dirPath);
  for (const file of list) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsonFiles(filePath));
    } else if (file.endsWith('.json')) {
      results.push(filePath);
    }
  }
  return results;
}

async function updateCardFileLocally(filePath, isPush) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cardData = JSON.parse(content);
    
    if (!cardData.rarity) {
      console.log(`⚠️ Skip ${path.basename(filePath)}: No rarity defined.`);
      return null;
    }

    let modified = false;
    if (!isPush) {
      const stats = generateTripleTriadStats(cardData.rarity);
      cardData.topValue = stats.top;
      cardData.rightValue = stats.right;
      cardData.bottomValue = stats.bottom;
      cardData.leftValue = stats.left;
      modified = true;
    } else {
      // Pour le mode --push, on s'assure quand même que les 10 sont convertis en A localement
      ["topValue", "rightValue", "bottomValue", "leftValue"].forEach(key => {
        if (cardData[key] === "10" || cardData[key] === 10) {
          cardData[key] = "A";
          modified = true;
        }
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(cardData, null, 2));
      console.log(`✅ MAJ Locale : ${cardData.name.padEnd(30)}`);
    } else {
      console.log(`ℹ️ Inchangé   : ${cardData.name.padEnd(30)}`);
    }

    return { cardData, modified };
  } catch (err) {
    console.log(`❌ Erreur MAJ Locale ${filePath}: ${err.message}`);
    return null;
  }
}

async function syncCardToStrapi(cardData) {
  const existingCard = strapiCards[cardData.name];
  if (existingCard) {
    process.stdout.write(`☁️ Sync Strapi : ${cardData.name.padEnd(30)}`);
    try {
      await updateStrapiStats(strapiToken, cardData, existingCard);
      console.log(` | OK`);
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.log(` | ❌ Erreur: ${err.message}`);
    }
  } else {
    console.log(`☁️ Sync Strapi : ${cardData.name.padEnd(30)} | ⚠️ Non trouvé`);
  }
}

main();
