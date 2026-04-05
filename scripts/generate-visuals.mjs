#!/usr/bin/env node

/**
 * Script de génération de visuels via webhook n8n
 * 
 * 1. Lit les cartes dans shared/data/base-cards/
 * 2. Génère un prompt textuel à partir du champ "prompt" structuré
 * 3. Appelle le webhook n8n pour générer l'image
 * 4. Télécharge l'image
 * 5. L'uploade dans Strapi
 * 6. Associe l'image à la carte dans Strapi
 * 
 * Usage:
 *   node scripts/generate-visuals.mjs --test             # Test sur la première carte
 *   node scripts/generate-visuals.mjs --card 016         # Traite une carte spécifique
 *   node scripts/generate-visuals.mjs --range 001-010    # Traite une plage de cartes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBHOOK_URL = 'https://n8n.clavier.dev/webhook/createvisual';
const BASE_CARDS_DIR = path.join(__dirname, '..', 'shared', 'data', 'base-cards');
const ENV_PATH = path.join(__dirname, '..', '.env');
const TMP_DIR = path.join(__dirname, '..', 'tmp', 'visuals');

// Dossiers où chercher les visuels existants mentionnés dans le JSON
const POSSIBLE_VISUAL_DIRS = [
  path.join(__dirname, '..'), // Root (si le chemin est relatif au root, ex: base/001.png)
  path.join(__dirname, '..', 'front', 'public'),
  path.join(__dirname, '..', 'back', 'strapi', 'public'),
  path.join(__dirname, '..', 'shared', 'assets'),
];

// ─── Configuration & Env ───────────────────────────────────────────────────────

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
  }
  return env;
}

const env = loadEnv();
const STRAPI_URL = `http://localhost:${env.STRAPI_PORT || env.PORT || 1337}`;
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
    throw new Error(`Échec login Strapi: ${err}`);
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
  return data[0]; // Retourne le premier fichier uploadé
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
function findLocalVisual(imagePath) {
  if (!imagePath) return null;
  
  for (const dir of POSSIBLE_VISUAL_DIRS) {
    const fullPath = path.join(dir, imagePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
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
      image: mediaId
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
  const rangeArg = args.includes('--range') ? args[args.indexOf('--range') + 1] : null;

  try {
    const token = await getAdminToken();
    const existingCards = await getAllCards(token);

    const allFiles = fs.readdirSync(BASE_CARDS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();

    let missingFiles = [];
    for (const file of allFiles) {
      const cardData = JSON.parse(fs.readFileSync(path.join(BASE_CARDS_DIR, file), 'utf-8'));
      if (!existingCards.has(cardData.name)) {
        missingFiles.push(file);
      }
    }

    let files = [];
    if (isTest) {
      files = missingFiles.length > 0 ? [missingFiles[0]] : [];
    } else if (cardArg) {
      files = missingFiles.filter(f => f.startsWith(cardArg));
    } else if (rangeArg) {
      const [start, end] = rangeArg.split('-').map(Number);
      files = missingFiles.filter(f => {
        const num = parseInt(f.split('-')[0]);
        return num >= start && num <= end;
      });
    } else {
      files = missingFiles;
    }

    if (files.length === 0) {
      console.log(`✨ Toutes les cartes sont déjà présentes dans Strapi !`);
      process.exit(0);
    }

    console.log(`🚀 Démarrage de l'analyse pour ${files.length} nouvelle(s) carte(s)\n`);

    let localCards = [];
    let n8nCards = [];

    for (let i = 0; i < files.length; i++) {
        const filePath = path.join(BASE_CARDS_DIR, files[i]);
        const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const localVisualPath = findLocalVisual(cardData.image);

        if (localVisualPath) {
            localCards.push({ filePath, localVisualPath, cardData, fileName: files[i] });
        } else {
            n8nCards.push({ filePath, cardData, fileName: files[i] });
        }
    }

    console.log(`🔍 Analyse terminée:`);
    console.log(`   - ${localCards.length} images locales trouvées.`);
    console.log(`   - ${n8nCards.length} images à générer via IA.\n`);

    let localCount = 0;
    let n8nCount = 0;
    let errorCount = 0;

    if (localCards.length > 0) {
        console.log(`💾 Importation des images locales...`);
        for (let i = 0; i < localCards.length; i++) {
            try {
                await processLocalCard(token, localCards[i].cardData, localCards[i].localVisualPath, i + 1, localCards.length);
                localCount++;
            } catch (err) {
                console.log(`❌ Erreur sur la carte locale : ${err.message}`);
                errorCount++;
            }
        }
    }

    if (n8nCards.length > 0) {
        const answer = await askQuestion(`\n⚠️ Voulez-vous générer les ${n8nCards.length} images manquantes via n8n ? (y/N) : `);
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'o' || answer.toLowerCase() === 'oui') {
            console.log(`\n🤖 Génération des images via n8n...`);
            for (let i = 0; i < n8nCards.length; i++) {
                try {
                    await processN8nCard(token, n8nCards[i].cardData, n8nCards[i].fileName, i + 1, n8nCards.length);
                    n8nCount++;
                } catch (err) {
                    console.log(`❌ Erreur sur la carte n8n : ${err.message}`);
                    errorCount++;
                }
            }
        } else {
            console.log(`⏭️ Génération n8n annulée par l'utilisateur.`);
        }
    }

    console.log(`\n===================================`);
    console.log(`🎉 BILAN DE LA GÉNÉRATION`);
    console.log(`===================================`);
    console.log(`Cartes existantes ignorées : ${allFiles.length - missingFiles.length}`);
    console.log(`Nouvelles images via n8n   : ${n8nCount}`);
    console.log(`Visuels locaux importés    : ${localCount}`);
    console.log(`Échecs de traitement       : ${errorCount}`);
    console.log(`===================================\n`);

  } catch (err) {
    console.error('💥 Erreur fatale:', err.message);
    process.exit(1);
  }
}

main();
