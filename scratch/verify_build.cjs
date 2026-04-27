const { execSync } = require('child_process');
try {
  execSync('cd back/strapi && npm run build -- --no-optimization', { stdio: 'inherit' });
} catch (e) {
  console.log("Failed to build");
}
