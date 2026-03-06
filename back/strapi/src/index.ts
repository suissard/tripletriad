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
  async bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {},
};
