const strapiFactory = require('@strapi/strapi');
const path = require('path');

async function repair() {
    console.log('🛠️ Initializing Strapi instance for card repair...');
    
    // In Docker, the working directory is /opt/app
    const APP_PATH = process.env.STRAPI_PATH || path.join(__dirname, '..');
    
    try {
        const app = await strapiFactory.createStrapi({ 
            distDir: path.join(APP_PATH, 'dist') 
        }).load();

        console.log('🔍 Checking for cards with missing relations...');
        
        // 1. Fetch Faction 'Neutre'
        const factions = await app.entityService.findMany('api::faction.faction', {
            filters: { code: 'NEUTRAL' }
        });
        const neutralId = factions[0]?.id;

        // 2. Fetch Collection 'Base'
        const collections = await app.entityService.findMany('api::collection.collection', {
            filters: { code: 'base' }
        });
        const baseId = collections[0]?.id;

        if (!neutralId || !baseId) {
            console.error('❌ Required entities (Faction: NEUTRAL or Collection: base) not found. Please run seed first.');
            process.exit(1);
        }

        // 3. Scan all cards
        const cards = await app.entityService.findMany('api::card.card', {
            populate: ['faction', 'collection']
        });

        let updatedCount = 0;
        for (const card of cards) {
            let updateData = {};
            if (!card.faction) {
                updateData.faction = neutralId;
            }
            if (!card.collection) {
                updateData.collection = baseId;
            }

            if (Object.keys(updateData).length > 0) {
                console.log(`🔧 Repairing card "${card.name}" (ID: ${card.id})...`);
                await app.entityService.update('api::card.card', card.id, {
                    data: updateData
                });
                updatedCount++;
            }
        }

        console.log(`✅ Repair completed. ${updatedCount} cards updated.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Repair failed:', err);
        process.exit(1);
    }
}

repair();
