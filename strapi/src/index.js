'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    const adminFirstname = process.env.ADMIN_FIRSTNAME || 'Super';
    const adminLastname = process.env.ADMIN_LASTNAME || 'Admin';

    try {
      // Find the Super Admin role
      const roles = await strapi.admin.services.role.find({ filters: { name: 'Super Admin' } });
      const adminRole = roles[0];

      if (!adminRole) {
         console.log('Super Admin role not found. Skipping user creation.');
         return;
      }

      const existingAdmin = await strapi.admin.services.user.exists({ email: adminEmail });

      if (existingAdmin) {
        console.log(`Admin user with email ${adminEmail} already exists. Skipping.`);
      } else {
        console.log('Creating initial admin user...');
        const adminUser = await strapi.admin.services.user.create({
          email: adminEmail,
          firstname: adminFirstname,
          lastname: adminLastname,
          password: adminPassword,
          roles: [adminRole.id],
          isActive: true,
        });

        console.log(`Successfully created admin user: ${adminEmail}`);
      }
    } catch (error) {
      console.error('Failed to create admin user during bootstrap:', error);
    }
  },
};
