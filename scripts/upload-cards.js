import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadCards() {
    console.log('Lecture du fichier cards.json...');
    const cardsPath = path.join(__dirname, '..', 'shared', 'data', 'cards.json');

    if (!fs.existsSync(cardsPath)) {
        console.error('Erreur : Fichier cards.json introuvable à', cardsPath);
        console.error('Assurez-vous de lancer ce script à la racine du projet');
        process.exit(1);
    }

    const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    console.log(`${cardsData.length} cartes trouvées dans le JSON.`);

    // --- LECTURE DU FICHIER .ENV ---
    const envPath = path.join(__dirname, '..', '.env');
    let adminEmail = process.env.ADMIN_EMAIL;
    let adminPassword = process.env.ADMIN_PASSWORD;

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const val = match[2].trim();
                if (key === 'ADMIN_EMAIL' && !adminEmail) adminEmail = val;
                if (key === 'ADMIN_PASSWORD' && !adminPassword) adminPassword = val;
            }
        });
    }

    if (!adminEmail || !adminPassword) {
        console.error('Erreur : ADMIN_EMAIL ou ADMIN_PASSWORD non défini.');
        console.error('Veuillez les définir dans le fichier .env à la racine du projet ou via des variables d\'environnement.');
        process.exit(1);
    }

    // --- AUTHENTIFICATION ADMIN STRAPI ---
    console.log('Authentification auprès de Strapi...');
    const loginRes = await fetch('http://localhost:1337/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });

    if (!loginRes.ok) {
        const errorText = await loginRes.text();
        console.error("Échec de l'authentification Admin. Détails de l'erreur Strapi :");
        console.error(errorText);
        console.error(`Tentative avec email: ${adminEmail} (vérifiez .env).`);
        process.exit(1);
    }

    const loginData = await loginRes.json();
    const token = loginData.data.token;
    console.log('Authentification réussie ! Token récupéré.');

    // URL du Content Manager (réservé aux admins)
    const STRAPI_URL = 'http://localhost:1337/content-manager/collection-types/api::card.card';

    console.log('Envoi des cartes à Strapi via API REST...');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < cardsData.length; i++) {
        const card = cardsData[i];

        // NOTE: Le Content Manager de Strapi n'a pas besoin du wrapper "data: {}"
        const payload = {
            name: card.name,
            description: card.description,
            level: card.level,
            element: card.element,
            topValue: card.topValue.toString(),
            rightValue: card.rightValue.toString(),
            bottomValue: card.bottomValue.toString(),
            leftValue: card.leftValue.toString(),
        };

        try {
            const response = await fetch(STRAPI_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                successCount++;
                process.stdout.write(`\rInsertion API : ${successCount}/${cardsData.length} (${card.name})`);
            } else {
                const errData = await response.json();
                console.error(`\nErreur HTTP ${response.status} pour la carte ${card.name}:`, JSON.stringify(errData.error));
                errorCount++;
            }
        } catch (err) {
            console.error(`\nErreur de connexion pour la carte ${card.name}:`, err.message);
            errorCount++;
        }
    }

    console.log(`\n\nOpération terminée ! Succès: ${successCount}, Erreurs: ${errorCount}`);

    if (errorCount > 0) {
        console.log("Note: Vérifiez les erreurs ci-dessus. Quelques statistiques importantes !");
    }
}

uploadCards().catch(console.error);
