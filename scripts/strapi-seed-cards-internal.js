const strapiFactory = require('@strapi/strapi');
const fs = require('fs');
const path = require('path');

async function seedCards() {
    console.log('🚀 Initialisation de Strapi pour le seeding des cartes...');
    
    const APP_PATH = process.env.STRAPI_PATH || path.join(__dirname, '..');
    
    const app = await strapiFactory.createStrapi({ 
        distDir: path.join(APP_PATH, 'dist') 
    }).load();

    console.log('Lecture du fichier cards.json...');
    const cardsPath = path.join(APP_PATH, 'cards.json');

    if (!fs.existsSync(cardsPath)) {
        console.error('Erreur : Fichier cards.json introuvable à', cardsPath);
        process.exit(1);
    }

    const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    console.log(`${cardsData.length} cartes trouvées dans le JSON.`);

    console.log('Synchronisation des cartes (mise à jour des existantes, création des nouvelles)...');
    
    for (let i = 0; i < cardsData.length; i++) {
        const cardData = cardsData[i];

        try {
            // Check if card already exists by name
            const results = await app.documents('api::card.card').findMany({
                filters: { name: cardData.name }
            });
            const existing = results[0];

            const payload = {
                name: cardData.name,
                description: cardData.description,
                level: cardData.level,
                element: cardData.element,
                elements: Array.isArray(cardData.elements) ? cardData.elements : [cardData.element || 'None'],
                faction: cardData.faction || 'neutre',
                topValue: String(cardData.topValue),
                rightValue: String(cardData.rightValue),
                bottomValue: String(cardData.bottomValue),
                leftValue: String(cardData.leftValue),
                rarity: cardData.rarity || 'Common',
                collectionName: cardData.collectionName || 'base'
            };

            if (existing) {
                await app.documents('api::card.card').update({
                    documentId: existing.documentId,
                    data: payload,
                    status: 'published'
                });
            } else {
                await app.documents('api::card.card').create({
                    data: payload,
                    status: 'published'
                });
            }
            
            if (i % 20 === 0 || i === cardsData.length - 1) {
                process.stdout.write(`\rProgrès : ${i + 1}/${cardsData.length} (${cardData.name})`);
            }
        } catch (err) {
            console.error(`\nErreur avec la carte ${cardData.name}:`, err.message);
        }
    }

    console.log('\n\nImportation terminée avec succès !');
    process.exit(0);
}

seedCards().catch((err) => {
    console.error('\nErreur fatale :', err);
    process.exit(1);
});
