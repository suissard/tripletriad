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
   */
  async bootstrap({ strapi }/*: { strapi: Core.Strapi }*/) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tripletriad.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    const adminFirstname = process.env.ADMIN_FIRSTNAME || 'Super';
    const adminLastname = process.env.ADMIN_LASTNAME || 'Admin';

    try {
      // Find the Super Admin role
      const roles = await strapi.admin.services.role.find({
        filters: { code: 'strapi-super-admin' }
      });
      const adminRole = roles[0];

      if (!adminRole) {
         strapi.log.warn('Super Admin role not found. Skipping user creation.');
         return;
      }

      const existingAdmin = await strapi.admin.services.user.exists({ email: adminEmail });

      if (existingAdmin) {
        strapi.log.info(`Admin user with email ${adminEmail} already exists. Skipping.`);
      } else {
        strapi.log.info('Creating initial admin user...');
        const adminUser = await strapi.admin.services.user.create({
          email: adminEmail,
          firstname: adminFirstname,
          lastname: adminLastname,
          password: adminPassword,
          roles: [adminRole.id],
          isActive: true,
        });

        strapi.log.info(`Successfully created admin user: ${adminEmail}`);
        strapi.log.info(`Password: ${adminPassword}`);
      }
    } catch (error) {
      strapi.log.error('Failed to create admin user during bootstrap:');
      console.error(error);
    }
  },
};
