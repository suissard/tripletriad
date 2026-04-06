#!/usr/bin/env node

/**
 * Script de génération de visuels via webhook n8n (Amélioré)
 * 
 * 1. Parcourt les collections dans shared/data/cards/
 * 2. Pour chaque carte .json :
 *    - Vérifie si elle existe déjà dans Strapi (port 1340)
 *    - Cherche un visuel local (dossier courant ou ./visual/)
 *    - Si absent localement -> Appelle n8n pour générer l'image via son prompt
 * 3. Uploade l'image dans Strapi
 * 4. Crée la carte dans Strapi avec son image associée
 * 
 * Usage:
 *   node scripts/generate-visuals.mjs --test             # Test sur une carte
 *   node scripts/generate-visuals.mjs --collection base  # Traite une collection spécifique
 *   node scripts/generate-visuals.mjs --card 016         # Traite une carte spécifique
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { setDefaultResultOrder } from 'node:dns';

// Force l'IPv4 en priorité pour éviter les erreurs de résolution locale (Node 18+)
setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBHOOK_URL = 'https://n8n.clavier.dev/webhook/createvisual';
const CARDS_ROOT_DIR = path.join(__dirname, '..', 'shared', 'data', 'cards');
const ENV_PATH = path.join(__dirname, '..', '.env');
const TMP_DIR = path.join(__dirname, '..', 'tmp', 'visuals');

// ─── Configuration & Env ───────────────────────────────────────────────────────

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
console.log(`🔌 URL de Strapi: ${STRAPI_URL} (Email: ${env.ADMIN_EMAIL})`);
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

/**
 * Authentification Admin Strapi
 */
async function getAdminToken() {
  console.log('🔐 Authentification Strapi...');
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

/**
 * Télécharge une image depuis une URL
 */
async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Échec téléchargement image: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

/**
 * Upload dans la médiathèque Strapi
 */
async function uploadToStrapi(token, filePath, fileName) {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  formData.append('files', blob, fileName);

  const res = await fetch(`${STRAPI_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec upload Strapi: ${err}`);
  }

  const data = await res.json();
  return data[0]; 
}

/**
 * Récupère tous les noms de cartes existantes dans Strapi
 */
async function getAllCards(token) {
  let existingNames = new Set();
  let page = 1;
  let hasMore = true;
  
  process.stdout.write('📡 Vérification des cartes existantes dans Strapi... ');
  
  while (hasMore) {
    const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::card.card?page=${page}&pageSize=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      console.warn('\n⚠️ Impossible de récupérer la liste des cartes');
      break;
    }
    
    const data = await res.json();
    if (data.results) {
      data.results.forEach(c => existingNames.add(c.name));
    }
    
    if (data.pagination && page < data.pagination.pageCount) {
      page++;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`(Trouvées : ${existingNames.size})`);
  return existingNames;
}

/**
 * Cherche si le visuel existe déjà localement
 */
function findLocalVisual(dirPath, fileName, cardImagePath) {
  const baseName = path.basename(fileName, '.json') + '.png';
  
  const possiblePaths = [
      path.join(dirPath, baseName),
      path.join(dirPath, 'visual', baseName),
  ];

  if (cardImagePath) {
      possiblePaths.push(path.join(__dirname, '..', cardImagePath));
  }

  for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          return p;
      }
  }
  return null;
}

// ─── Traitement ───────────────────────────────────────────────────────────────

async function createCardInStrapi(token, cardData, mediaId) {
  const payload = {
      name: cardData.name,
      description: cardData.description,
      level: cardData.level || 1,
      element: cardData.element,
      topValue: cardData.topValue?.toString() || "0",
      rightValue: cardData.rightValue?.toString() || "0",
      bottomValue: cardData.bottomValue?.toString() || "0",
      leftValue: cardData.leftValue?.toString() || "0",
      image: mediaId,
      collectionName: cardData.collectionName
  };
  
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::card.card`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
      const err = await res.text();
      throw new Error(`Création échouée: ${err}`);
  }
}

async function processLocalCard(token, cardData, localVisualPath, current, total) {
  process.stdout.write(`⏳ [${current}/${total}] ${cardData.name.padEnd(25)} | local... `);
  const media = await uploadToStrapi(token, localVisualPath, path.basename(localVisualPath));
  process.stdout.write(`strapi... `);
  await createCardInStrapi(token, cardData, media.id);
  console.log(`✅ OK (LOCAL)`);
}

async function processN8nCard(token, cardData, fileName, current, total) {
  process.stdout.write(`⏳ [${current}/${total}] ${cardData.name.padEnd(25)} | n8n... `);
  const webhookRes = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      prompt: JSON.stringify(cardData.prompt), 
      model: "sourceful/riverflow-v2-fast",
      name: path.basename(fileName, '.json')
    })
  });

  if (!webhookRes.ok) {
      const errText = await webhookRes.text();
      throw new Error(`Erreur n8n (${webhookRes.status}): ${errText}`);
  }
  const responseText = await webhookRes.text();

  let webhookData;
  try {
      webhookData = JSON.parse(responseText);
      if (Array.isArray(webhookData)) webhookData = webhookData[0];
  } catch (e) {
      console.log(`\n   📡 Réponse brute n8n: "${responseText}"`);
      throw new Error(`Erreur parsing JSON n8n: ${e.message}`);
  }

  const imageUrl = webhookData.webContentLink || webhookData.imageurl || webhookData.url || webhookData.output || webhookData.image; 
  if (!imageUrl) throw new Error('Pas d\'URL d\'image');

  process.stdout.write(`dl... `);
  const tmpPath = path.join(TMP_DIR, `${path.basename(fileName, '.json')}.png`);
  await downloadImage(imageUrl, tmpPath);

  process.stdout.write(`up... `);
  const media = await uploadToStrapi(token, tmpPath, `${path.basename(fileName, '.json')}.png`);

  process.stdout.write(`strapi... `);
  await createCardInStrapi(token, cardData, media.id);

  console.log(`✅ OK (N8N)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const cardArg = args.includes('--card') ? args[args.indexOf('--card') + 1] : null;
  const collectionArg = args.includes('--collection') ? args[args.indexOf('--collection') + 1] : null;

  try {
    const token = await getAdminToken();
    const existingCards = await getAllCards(token);

    const allCollections = fs.readdirSync(CARDS_ROOT_DIR)
        .filter(d => fs.statSync(path.join(CARDS_ROOT_DIR, d)).isDirectory());

    let selectedCollection = collectionArg;

    if (!isTest && !cardArg && !collectionArg) {
        console.log('\n📁 Collections disponibles :');
        allCollections.forEach((c, i) => console.log(`   ${i + 1}. ${c}`));
        console.log(`   ${allCollections.length + 1}. [Toutes les collections]`);
        
        const choice = await askQuestion(`\nChoix (1-${allCollections.length + 1}) : `);
        const index = parseInt(choice) - 1;
        
        if (index >= 0 && index < allCollections.length) {
            selectedCollection = allCollections[index];
        } else if (index === allCollections.length) {
            selectedCollection = null; // All
        } else {
            console.log('❌ Choix invalide, arrêt.');
            process.exit(1);
        }
    }

    let allMissingFiles = [];

    for (const col of allCollections) {
        if (selectedCollection && col !== selectedCollection) continue;
        
        const colPath = path.join(CARDS_ROOT_DIR, col);
        const files = fs.readdirSync(colPath).filter(f => f.endsWith('.json')).sort();
        
        for (const file of files) {
            const cardData = JSON.parse(fs.readFileSync(path.join(colPath, file), 'utf-8'));
            if (!existingCards.has(cardData.name)) {
                allMissingFiles.push({ col, colPath, file, cardData });
            }
        }
    }

    let targets = [];
    if (isTest) {
        targets = allMissingFiles.length > 0 ? [allMissingFiles[0]] : [];
    } else if (cardArg) {
        targets = allMissingFiles.filter(t => t.file.startsWith(cardArg));
    } else {
        targets = allMissingFiles;
    }

    if (targets.length === 0) {
      console.log(`✨ Toutes les cartes sélectionnées sont déjà présentes dans Strapi !`);
      process.exit(0);
    }

    console.log(`🚀 Analyse de ${targets.length} nouvelle(s) carte(s)\n`);

    let localQueue = [];
    let n8nQueue = [];

    for (const t of targets) {
        const localVisualPath = findLocalVisual(t.colPath, t.file, t.cardData.image);
        if (localVisualPath) {
            localQueue.push({ ...t, localVisualPath });
        } else {
            n8nQueue.push(t);
        }
    }

    console.log(`🔍 Bilan analyse:`);
    console.log(`   - ${localQueue.length} visuels locaux trouvés.`);
    console.log(`   - ${n8nQueue.length} visuels à générer via IA.\n`);

    let localCount = 0;
    let n8nCount = 0;
    let errorCount = 0;

    if (localQueue.length > 0) {
        console.log(`💾 Importation des visuels locaux...`);
        for (let i = 0; i < localQueue.length; i++) {
            try {
                await processLocalCard(token, localQueue[i].cardData, localQueue[i].localVisualPath, i + 1, localQueue.length);
                localCount++;
            } catch (err) {
                console.log(`❌ Erreur [LOCAL]: ${err.message}`);
                errorCount++;
            }
        }
    }

    if (n8nQueue.length > 0) {
        const answer = await askQuestion(`\n🤖 Voulez-vous générer les ${n8nQueue.length} visuels manquants via n8n ? (y/N) : `);
        if (['y', 'yes', 'o', 'oui'].includes(answer.toLowerCase())) {
            console.log(`\n🤖 Génération en cours...`);
            for (let i = 0; i < n8nQueue.length; i++) {
                try {
                    await processN8nCard(token, n8nQueue[i].cardData, n8nQueue[i].file, i + 1, n8nQueue.length);
                    n8nCount++;
                } catch (err) {
                    console.log(`❌ Erreur [N8N]: ${err.message}`);
                    errorCount++;
                }
            }
        } else {
            console.log(`⏭️ Génération n8n annulée.`);
        }
    }

    console.log(`\n===================================`);
    console.log(`🎉 BILAN FINAL`);
    console.log(`===================================`);
    console.log(`Visuels locaux importés    : ${localCount}`);
    console.log(`Visuels générés via n8n    : ${n8nCount}`);
    console.log(`Échecs de traitement       : ${errorCount}`);
    console.log(`===================================\n`);

  } catch (err) {
    console.error('💥 Erreur fatale:', err.message);
    process.exit(1);
  }
}

main();
