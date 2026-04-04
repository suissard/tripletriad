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

/**
 * Transforme le prompt structuré en chaîne simple pour l'IA
 */
function buildVisualPrompt(cardData) {
  const p = cardData.prompt;
  
  // Si un prompt brut est fourni, on l'utilise directement
  if (p?.raw && p.raw.trim().length > 0) {
    return p.raw;
  }

  // Si le prompt est structuré, on construit la chaîne
  if (p && typeof p === 'object' && Object.keys(p).length > 1) {
    const parts = [];
    if (p.subject?.archetype) parts.push(p.subject.archetype);
    if (p.subject?.loadout?.armor_outfit) parts.push(`Wearing ${p.subject.loadout.armor_outfit}`);
    if (p.subject?.loadout?.arsenal) parts.push(`Equipped with ${p.subject.loadout.arsenal}`);
    if (p.scenography?.setting) parts.push(`In a ${p.scenography.setting}`);
    if (p.graphics?.style?.technique) parts.push(`Style: ${p.graphics.style.technique}`);
    
    if (parts.length > 0) return parts.join('. ');
  }
  
  // Fallback sur la description si rien d'autre n'est disponible
  return cardData.description || "";
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

// (La fonction d'association individuelle est supprimée car nous créons les cartes directement)

// ─── Traitement ───────────────────────────────────────────────────────────────

async function processCard(token, filePath, current, total) {
  const fileName = path.basename(filePath);
  const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  process.stdout.write(`⏳ [${current}/${total}] ${cardData.name.padEnd(25)} | `);

  let mediaId;
  let method = "";

  // 1. Vérifier si un visuel existe déjà localement
  const localVisualPath = findLocalVisual(cardData.image);

  if (localVisualPath) {
    process.stdout.write(`local... `);
    const media = await uploadToStrapi(token, localVisualPath, path.basename(localVisualPath));
    mediaId = media.id;
    method = "LOCAL";
  } else {
    // 2. Sinon, génération via n8n
    const visualPrompt = buildVisualPrompt(cardData);
    process.stdout.write(`n8n... `);
    const webhookRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: visualPrompt, model: "sourceful/riverflow-v2-fast" })
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

    // 3. Télécharger l'image temporairement
    process.stdout.write(`dl... `);
    const tmpPath = path.join(TMP_DIR, `${path.basename(fileName, '.json')}.png`);
    await downloadImage(imageUrl, tmpPath);

    // 4. Uploader dans Strapi
    process.stdout.write(`up... `);
    const media = await uploadToStrapi(token, tmpPath, `${path.basename(fileName, '.json')}.png`);
    mediaId = media.id;
    method = "N8N";
  }

  // 5. Création de la carte dans Strapi
  process.stdout.write(`strapi... `);
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

  console.log(`✅ OK (${method})`);
  return method;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const cardArg = args.includes('--card') ? args[args.indexOf('--card') + 1] : null;

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
    } else {
      files = missingFiles;
    }

    if (files.length === 0) {
      console.log(`✨ Toutes les cartes sont déjà présentes dans Strapi !`);
      process.exit(0);
    }

    console.log(`🚀 Démarrage de la génération pour ${files.length} nouvelle(s) carte(s)\n`);

    let successCount = 0;
    let n8nCount = 0;
    let localCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const filePath = path.join(BASE_CARDS_DIR, files[i]);
      try {
        const method = await processCard(token, filePath, i + 1, files.length);
        successCount++;
        if (method === "N8N") n8nCount++;
        if (method === "LOCAL") localCount++;
      } catch (err) {
        console.log(`❌ Erreur: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n===================================`);
    console.log(`🎉 BILAN DE LA GÉNÉRATION`);
    console.log(`===================================`);
    console.log(`Cartes existantes déjà en base : ${allFiles.length - missingFiles.length}`);
    console.log(`Nouvelles images via n8n      : ${n8nCount}`);
    console.log(`Visuels locaux réutilisés      : ${localCount}`);
    console.log(`Échecs de traitement          : ${errorCount}`);
    console.log(`===================================\n`);

  } catch (err) {
    console.error('💥 Erreur fatale:', err.message);
    process.exit(1);
  }
}

main();
