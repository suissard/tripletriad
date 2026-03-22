import strapiService from './src/api/strapi.js';

async function test() {
  try {
    const res = await strapiService.login({ identifier: 'admin', password: 'password' }); // We don't know the password, but we don't need to save the login if we can just see the stories.
    // Wait, the API requires auth for /api/stories? Let's check config.
  } catch(e) {}
}
test();
