import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::match.match', {
  config: {
    create: {
      auth: false,
    },
  },
});
