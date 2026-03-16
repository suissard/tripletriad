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

    // Clear existing cards
    console.log('Suppression des cartes existantes (optionnel, pour avoir une base propre)...');
    const existingCards = await app.documents('api::card.card').findMany({ limit: 1000 });
    for (const c of existingCards) {
        await app.documents('api::card.card').delete({ documentId: c.documentId });
    }

    console.log('Insertion des cartes...');
    for (let i = 0; i < cardsData.length; i++) {
        const card = cardsData[i];

        try {
            await app.documents('api::card.card').create({
                data: {
                    name: card.name,
                    description: card.description,
                    level: card.level,
                    element: card.element,
                    elements: Array.isArray(card.elements) ? card.elements : [card.element || 'None'],
                    faction: card.faction || 'neutre',
                    topValue: card.topValue,
                    rightValue: card.rightValue,
                    bottomValue: card.bottomValue,
                    leftValue: card.leftValue
                },
                status: 'published' // V5 draft & publish (if enabled, though schema says false, doing it just in case)
            });
            process.stdout.write(`\rInsertion : ${i + 1}/${cardsData.length} (${card.name})`);
        } catch (err) {
            console.error(`\nErreur lors de l'insertion de la carte ${card.name}:`, err.message);
        }
    }

    console.log('\n\nImportation terminée avec succès !');
    process.exit(0);
}

seedCards().catch((err) => {
    console.error('\nErreur fatale :', err);
    process.exit(1);
});
