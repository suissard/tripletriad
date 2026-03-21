const strapiFactory = require('@strapi/strapi');
const fs = require('fs');
const path = require('path');

async function seedCards() {
    console.log('Initialisation de Strapi...');
    const app = await strapiFactory.createStrapi({ distDir: path.join(__dirname, 'dist') }).load();

    console.log('Lecture du fichier cards.json (copié localement pour Docker)...');
    const cardsPath = path.join(__dirname, 'cards.json');

    if (!fs.existsSync(cardsPath)) {
        console.error('Erreur : Fichier cards.json introuvable à', cardsPath);
        process.exit(1);
    }

    const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    console.log(`${cardsData.length} cartes trouvées dans le JSON.`);

    // Instead of dropping all cards, we will update-or-create by name
    console.log('Synchronizing cards (updates existing, creates new)...');
    
    for (let i = 0; i < cardsData.length; i++) {
        const cardData = cardsData[i];

        try {
            // Check if card already exists by name
            const existing = await app.documents('api::card.card').findFirst({
                filters: { name: cardData.name }
            });

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
                process.stdout.write(`\rProgress : ${i + 1}/${cardsData.length} (${cardData.name})`);
            }
        } catch (err) {
            console.error(`\nError with card ${cardData.name}:`, err.message);
        }
    }

    console.log('\n\nImportation terminée avec succès !');
    process.exit(0);
}

seedCards().catch((err) => {
    console.error('\nErreur fatale :', err);
    process.exit(1);
});
