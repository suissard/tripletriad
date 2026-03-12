import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::user-card.user-card', {
  config: {
    find: {},
    findOne: {},
    create: {},
    update: {},
    delete: {},
  },
});
