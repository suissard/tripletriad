import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { setDefaultResultOrder } from 'node:dns';

// Force l'IPv4 en priorité pour éviter les erreurs de résolution locale
setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '..', '.env');
const CONFIG_PATH = path.join(__dirname, '..', 'shared', 'data', 'weekly-quest-config.json');

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
const STRAPI_URL = env.VITE_STRAPI_URL || 'http://127.0.0.1:1340';
console.log('Using STRAPI_URL:', STRAPI_URL);
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

async function exportConfig(token) {
  console.log('📥 Exportation de WeeklyQuest Config depuis Strapi...');
  const res = await fetch(`${STRAPI_URL}/content-manager/single-types/api::weekly-quest-config.weekly-quest-config`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec récupération config: ${err}`);
  }

  const data = await res.json();
  
  // On ne garde que les données utiles (tiers)
  const config = {
    tiers: data.data.tiers.map(t => ({
        requiredCount: t.requiredCount,
        coins: t.coins,
        gems: t.gems,
        cardRarity: t.cardRarity
    }))
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`✅ Config sauvegardée dans ${CONFIG_PATH}`);
}

async function importConfig(token) {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.warn(`⚠️ Fichier ${CONFIG_PATH} non trouvé. Rien à importer.`);
    return;
  }

  console.log('📤 Importation de WeeklyQuest Config vers Strapi...');
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

  const res = await fetch(`${STRAPI_URL}/content-manager/single-types/api::weekly-quest-config.weekly-quest-config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(config)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec importation config: ${err}`);
  }

  console.log('✅ WeeklyQuest Config mise à jour avec succès !');
}

const action = process.argv[2];

async function main() {
  try {
    const token = await getAdminToken();

    if (action === 'export') {
      await exportConfig(token);
    } else if (action === 'import') {
      await importConfig(token);
    } else {
      console.log('Usage: node scripts/sync-weekly-config.mjs [export|import]');
    }
  } catch (err) {
    console.error('💥 Erreur:', err.message);
    process.exit(1);
  }
}

main();
