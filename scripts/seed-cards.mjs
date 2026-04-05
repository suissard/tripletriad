import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '..', '.env');
const CARDS_DIR = path.join(__dirname, '..', 'shared', 'data', 'cards');

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
const STRAPI_URL = `http://127.0.0.1:${env.STRAPI_PORT || env.PORT || 1340}`;
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
    throw new Error(`Échec login Strapi: ${err}`);
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

async function main() {
    try {
        const token = await getAdminToken();
        const directories = fs.readdirSync(CARDS_DIR).filter(file => fs.statSync(path.join(CARDS_DIR, file)).isDirectory());
        
        let successCount = 0;
        let errorCount = 0;

        for (const dir of directories) {
            console.log(`\n📂 Traitement du dossier: ${dir}`);
            const dirPath = path.join(CARDS_DIR, dir);
            const files = fs.readdirSync(dirPath);

            const jsonFiles = files.filter(f => f.endsWith('.json'));

            for (const file of jsonFiles) {
                const filePath = path.join(dirPath, file);
                const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                
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
                     // check relative to root just in case
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
                    process.stdout.write(`⏳ Intégration de ${cardData.name.padEnd(30)}... `);
                    const media = await uploadToStrapi(token, imagePath, path.basename(imagePath));
                    await createCardInStrapi(token, cardData, media.id);
                    console.log(`✅ OK`);
                    successCount++;
                } catch (err) {
                    console.log(`❌ Erreur: ${err.message}`);
                    errorCount++;
                }
            }
        }
        console.log(`\n===================================`);
        console.log(`🎉 BILAN DU SEED `);
        console.log(`===================================`);
        console.log(`Cartes intégrées avec succès : ${successCount}`);
        console.log(`Erreurs / Ignorées           : ${errorCount}`);
        console.log(`===================================\n`);

    } catch (error) {
        console.error('💥 Erreur fatale:', error.message);
    }
}

main();
