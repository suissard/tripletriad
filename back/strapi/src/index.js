'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) { },

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

      // Seed Cards
      const cardCount = await strapi.documents('api::card.card').count();
      if (cardCount === 0) {
        console.log('Seeding 45 cards...');
        const elements = ["None", "Fire", "Ice", "Thunder", "Earth", "Poison", "Wind", "Water", "Holy"];
        const names = [
          "Goblin", "Fang", "Skeleton", "Flan", "Dire Rat", "Bat", "Slime", "Bomb", "Mandragora",
          "Cactuar", "Tonberry", "Ochu", "Malboro", "Behemoth", "Iron Giant", "Chimera", "Coeurl", "Mummy",
          "Ifrit", "Shiva", "Ramuh", "Titan", "Diabolos", "Leviathan", "Carbuncle", "Siren", "Cerberus",
          "Odin", "Bahamut", "Alexander", "Gilgamesh", "Ultima Weapon", "Omega Weapon", "Kefka", "Sephiroth", "Kuja",
          "Squall", "Cloud", "Zidane", "Tidus", "Lightning", "Noctis", "Clive", "Yuna", "Aerith"
        ];

        for (let i = 0; i < 45; i++) {
          const tier = Math.floor(i / 9);
          let level;
          if (tier === 0) level = Math.floor(Math.random() * 2) + 1;
          else if (tier === 1) level = Math.floor(Math.random() * 2) + 3;
          else if (tier === 2) level = Math.floor(Math.random() * 2) + 5;
          else if (tier === 3) level = Math.floor(Math.random() * 2) + 7;
          else level = Math.floor(Math.random() * 2) + 9;

          const getVal = (lvl) => {
            const min = Math.max(1, Math.floor(lvl / 2));
            let max = Math.min(10, lvl + 2);
            if (lvl >= 8) max = 10;
            const v = Math.floor(Math.random() * (max - min + 1)) + min;
            return v === 10 ? 'A' : v.toString();
          };

          await strapi.documents('api::card.card').create({
            data: {
              name: names[i] || `Card ${i + 1}`,
              description: `Une carte de niveau ${level} redoutable.`,
              level: level,
              element: Math.random() < 0.3 ? elements[Math.floor(Math.random() * 8) + 1] : "None",
              topValue: getVal(level),
              rightValue: getVal(level),
              bottomValue: getVal(level),
              leftValue: getVal(level)
            }
          });
        }
        console.log('45 cards seeded successfully.');
      }
    } catch (error) {
      console.error('Bootstrap error:', error);
    }
  },
};
