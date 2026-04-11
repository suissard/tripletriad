const strapiFactory = require('@strapi/strapi');
const path = require('path');

async function seedAll() {
    console.log('🚀 Initializing Strapi instance for seeding...');
    
    // In Docker, the working directory is /opt/app
    // Strapi points to /opt/app
    const APP_PATH = process.env.STRAPI_PATH || path.join(__dirname, '..');
    
    const app = await strapiFactory.createStrapi({ 
        distDir: path.join(APP_PATH, 'dist') 
    }).load();

    try {
        // We require the compiled bootstrap-utils from dist
        const utilsPath = path.join(APP_PATH, 'dist', 'bootstrap-utils');
        const { runFullBootstrap } = require(utilsPath);
        
        console.log('📦 Starting full data seeding...');
        await runFullBootstrap(app);
        console.log('✅ Seeding completed successfully!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }

    process.exit(0);
}

seedAll().catch((err) => {
    console.error('❌ Fatal error during seeding:', err);
    process.exit(1);
});
