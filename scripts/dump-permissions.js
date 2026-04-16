const strapi = require('@strapi/strapi');

async function dump() {
  const app = await strapi().load();
  const permissionsService = app.plugin('users-permissions').service('users-permissions');
  const allPermissions = await permissionsService.getActions();
  
  const actions = [];
  for (const sectionKey of Object.keys(allPermissions)) {
    const section = allPermissions[sectionKey];
    if (section.controllers) {
      for (const controllerKey of Object.keys(section.controllers)) {
        const controller = section.controllers[controllerKey];
        for (const actionKey of Object.keys(controller)) {
          actions.push(`${sectionKey}.${controllerKey}.${actionKey}`);
        }
      }
    }
  }
  console.log(JSON.stringify(actions, null, 2));
  process.exit(0);
}

dump().catch(console.error);
