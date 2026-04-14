import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setDefaultResultOrder } from 'node:dns';

// Force l'IPv4 en priorité pour éviter les erreurs de résolution locale (Node 18+)
setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '..', '.env');
const CARDS_DIR = path.join(__dirname, '..', 'shared', 'data', 'cards');

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
const STRAPI_URL = env.VITE_STRAPI_URL || env.STRAPI_URL || `http://127.0.0.1:${env.STRAPI_PORT || env.PORT || 1340}`;
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;

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

async function deleteMediaFromStrapi(token, mediaId) {
  if (!mediaId) return;
  const res = await fetch(`${STRAPI_URL}/upload/files/${mediaId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`  ⚠️  Échec suppression ancienne image (${mediaId}): ${err}`);
  } else {
    console.log(`  🗑️  Ancienne image supprimée (${mediaId})`);
  }
}

async function fetchAllCards(token) {
  console.log('🔍 Récupération des cartes existantes...');
  let allCards = [];
  let page = 1;
  const pageSize = 100;
  
  while (true) {
    const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/api::card.card?page=${page}&pageSize=${pageSize}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Échec récupération cartes: ${err}`);
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

async function upsertCardInStrapi(token, cardData, mediaId, existingCard = null) {
  const payload = {
      name: cardData.name,
      description: cardData.description,
      level: cardData.level || 1,
      element: cardData.element,
      elements: Array.isArray(cardData.elements) ? cardData.elements : [cardData.element || 'None'],
      faction: cardData.faction || 'neutre',
      rarity: cardData.rarity || 'Common',
      defaultHp: cardData.defaultHp || 3,
      topValue: cardData.topValue?.toString() || "0",
      rightValue: cardData.rightValue?.toString() || "0",
      bottomValue: cardData.bottomValue?.toString() || "0",
      leftValue: cardData.leftValue?.toString() || "0",
      image: mediaId,
      collectionName: cardData.collectionName
  };
  
  const method = existingCard ? 'PUT' : 'POST';
  const url = existingCard 
    ? `${STRAPI_URL}/content-manager/collection-types/api::card.card/${existingCard.documentId || existingCard.id}`
    : `${STRAPI_URL}/content-manager/collection-types/api::card.card`;

  const res = await fetch(url, {
      method: method,
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
      const err = await res.text();
      throw new Error(`${existingCard ? 'Mise à jour' : 'Création'} échouée: ${err}`);
  }
}

async function main() {
    try {
        const token = await getAdminToken();
        const cardMap = await fetchAllCards(token);
        const directories = fs.readdirSync(CARDS_DIR).filter(file => fs.statSync(path.join(CARDS_DIR, file)).isDirectory());
        
        let successCount = 0;
        let updateCount = 0;
        let errorCount = 0;

        for (const dir of directories) {
            console.log(`\n📂 Traitement du dossier: ${dir}`);
            const dirPath = path.join(CARDS_DIR, dir);
            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                
                // Check if card already exists
                const existingCard = cardMap[cardData.name];
                
                // Determine image path
                let imagePath = null;
                const baseImageName = path.basename(file, '.json') + '.png';
                const directImagePath = path.join(dirPath, baseImageName);
                const visualImagePath = path.join(dirPath, 'visual', baseImageName);
                
                if (fs.existsSync(directImagePath)) {
                    imagePath = directImagePath;
                } else if (fs.existsSync(visualImagePath)) {
                    imagePath = visualImagePath;
                } else if (cardData.image) {
                     const relativeImagePath = path.join(__dirname, '..', cardData.image);
                     if (fs.existsSync(relativeImagePath)) {
                         imagePath = relativeImagePath;
                     }
                }

                if (!imagePath) {
                    console.log(`⚠️ Aucune image locale trouvée pour ${cardData.name} (${file}), ignorée.`);
                    errorCount++;
                    continue;
                }

                try {
                    const actionLabel = existingCard ? 'Mise à jour' : 'Création';
                    process.stdout.write(`⏳ ${actionLabel} de ${cardData.name.padEnd(30)}... `);
                    
                    const media = await uploadToStrapi(token, imagePath, path.basename(imagePath));
                    
                    // Récupérer l'ID de l'image actuelle avant l'update
                    let oldImageId = null;
                    if (existingCard && existingCard.image) {
                        oldImageId = typeof existingCard.image === 'object' ? existingCard.image.id : existingCard.image;
                    }

                    await upsertCardInStrapi(token, cardData, media.id, existingCard);
                    
                    console.log(`✅ OK`);
                    
                    // Nettoyage de l'ancienne image
                    if (oldImageId && oldImageId !== media.id) {
                        await deleteMediaFromStrapi(token, oldImageId);
                    }

                    if (existingCard) updateCount++; else successCount++;
                } catch (err) {
                    console.log(`❌ Erreur: ${err.message}`);
                    errorCount++;
                }
            }
        }
        console.log(`\n===================================`);
        console.log(`🎉 BILAN DU SEED `);
        console.log(`===================================`);
        console.log(`Nouvelles cartes créées     : ${successCount}`);
        console.log(`Cartes mises à jour         : ${updateCount}`);
        console.log(`Erreurs / Ignorées          : ${errorCount}`);
        console.log(`Total traité                : ${successCount + updateCount}`);
        console.log(`===================================\n`);

    } catch (error) {
        console.error('💥 Erreur fatale:', error.message);
    }
}

main();
