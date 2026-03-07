// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   * 
   * Note: User/permissions setup is handled by scripts/setup-strapi.js
   *       Run: npm run setup
   */
  async bootstrap({ strapi } /*: { strapi: Core.Strapi } */) {
    // Bootstrap user permissions for new routes
    const roles = await strapi.entityService.findMany('plugin::users-permissions.role', {
      filters: { type: 'authenticated' },
    });

    const authRole = roles[0];

    if (authRole) {
      const actions = [
        'api::user-card.user-card.disenchant',
        'api::user-card.user-card.craft',
        'api::user-card.user-card.massDisenchant',
        'api::booster.booster.openBooster',
      ];

      for (const action of actions) {
        const existingPermission = await strapi.entityService.findMany('plugin::users-permissions.permission', {
          filters: { action, role: authRole.id }
        });

        if (existingPermission.length === 0) {
          await strapi.entityService.create('plugin::users-permissions.permission', {
            data: { action, role: authRole.id }
          });
        }
      }
    }
  },
};
