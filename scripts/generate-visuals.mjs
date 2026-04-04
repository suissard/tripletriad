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
  if (!p) return cardData.description;

  const parts = [];
  if (p.subject?.archetype) parts.push(p.subject.archetype);
  if (p.subject?.loadout?.armor_outfit) parts.push(`Wearing ${p.subject.loadout.armor_outfit}`);
  if (p.subject?.loadout?.arsenal) parts.push(`Equipped with ${p.subject.loadout.arsenal}`);
  if (p.scenography?.setting) parts.push(`In a ${p.scenography.setting}`);
  if (p.graphics?.style?.technique) parts.push(`Style: ${p.graphics.style.technique}`);
  
  return parts.join('. ');
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
 * Trouve une carte par son nom dans Strapi
 */
async function findCardId(token, cardName) {
  const url = `${STRAPI_URL}/content-manager/collection-types/api::card.card?_q=${encodeURIComponent(cardName)}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) return null;
  const data = await res.json();
  
  // Chercher une correspondance exacte sur le nom
  const card = data.results.find(c => c.name === cardName);
  return card ? card.id : null;
}

/**
 * Associe l'image à la carte
 */
async function associateImage(token, cardId, imageId) {
  const url = `${STRAPI_URL}/content-manager/collection-types/api::card.card/${cardId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image: imageId // ID du média uploadé
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec association image: ${err}`);
  }
}

// ─── Traitement ───────────────────────────────────────────────────────────────

async function processCard(token, filePath) {
  const fileName = path.basename(filePath);
  const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log(`\n🖼️  Traitement de la carte: ${cardData.name} (${fileName})`);

  // 1. Préparer le prompt
  const visualPrompt = buildVisualPrompt(cardData);
  console.log(`   📝 Prompt généré: ${visualPrompt ? String(visualPrompt).substring(0, 100) : "NO PROMPT"}...`);

  // 2. Appeler le webhook
  console.log(`   📡 Appel webhook n8n...`);
  const webhookRes = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: visualPrompt,
      model: "sourceful/riverflow-v2-fast"
    })
  });

  const responseText = await webhookRes.text();
  console.log(`   📡 Réponse brute: ${responseText}`);

  if (!webhookRes.ok) {
    throw new Error(`Échec webhook n8n (${webhookRes.status}): ${responseText}`);
  }

  let webhookData;
  try {
    webhookData = JSON.parse(responseText);
    // Si n8n renvoie un tableau (fréquent), prendre le premier élément
    if (Array.isArray(webhookData)) {
      webhookData = webhookData[0];
    }
  } catch (e) {
    throw new Error(`Échec parsing JSON: ${e.message} - Réponse: ${responseText}`);
  }

  const imageUrl = webhookData.webContentLink || webhookData.imageurl || webhookData.url || webhookData.output || webhookData.image; 
  
  if (!imageUrl) {
    console.log('   ⚠️  Données reçues du webhook:', webhookData);
    throw new Error('Pas d\'URL d\'image dans la réponse du webhook');
  }

  console.log(`   🔗 Image générée: ${imageUrl}`);

  // 3. Télécharger l'image temporairement
  const tmpPath = path.join(TMP_DIR, `${path.basename(fileName, '.json')}.png`);
  await downloadImage(imageUrl, tmpPath);
  console.log(`   💾 Image téléchargée localement`);

  // 4. Uploader dans Strapi
  console.log(`   📤 Upload vers Strapi...`);
  const media = await uploadToStrapi(token, tmpPath, `${path.basename(fileName, '.json')}.png`);
  console.log(`   ✅ Upload réussi (ID: ${media.id})`);

  // 5. Associer à la carte
  console.log(`   🔗 Association à la carte dans Strapi...`);
  let cardId = await findCardId(token, cardData.name);
  if (!cardId) {
    console.log(`   📝 Nouvelle carte, création dans Strapi...`);
    const payload = {
        name: cardData.name,
        description: cardData.description,
        level: cardData.level || 1,
        element: cardData.element,
        topValue: cardData.topValue?.toString() || "0",
        rightValue: cardData.rightValue?.toString() || "0",
        bottomValue: cardData.bottomValue?.toString() || "0",
        leftValue: cardData.leftValue?.toString() || "0",
        image: media.id
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
        throw new Error(`Échec de création de la carte: ${err}`);
    }
    const newCard = await res.json();
    cardId = newCard.id;
  } else {
    await associateImage(token, cardId, media.id);
  }
  console.log(`   ✨ Terminé pour ${cardData.name} !`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const cardArg = args.includes('--card') ? args[args.indexOf('--card') + 1] : null;

  try {
    const token = await getAdminToken();

    const allFiles = fs.readdirSync(BASE_CARDS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();

    let files = [];
    if (isTest) {
      files = [allFiles[0]];
    } else if (cardArg) {
      files = allFiles.filter(f => f.startsWith(cardArg));
    } else {
      files = allFiles;
    }

    console.log(`🚀 Démarrage pour ${files.length} carte(s)`);

    for (const file of files) {
      const filePath = path.join(BASE_CARDS_DIR, file);
      try {
        await processCard(token, filePath);
      } catch (err) {
        console.error(`❌ Erreur sur ${file}:`, err.message);
      }
    }

  } catch (err) {
    console.error('💥 Erreur fatale:', err.message);
    process.exit(1);
  }
}

main();
