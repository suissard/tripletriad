import type { Core } from '@strapi/strapi';

/**
 * Strapi server configuration.
 * Uses env vars: FRONT_URL, FRONT_PORT
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  const frontPort = env('FRONT_PORT', '5180');
  const frontUrl = env('FRONT_URL', `http://localhost:${frontPort}`);

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
      keys: env.array('APP_KEYS'),
    },
    webhooks: {
      populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    },
  };
};

export default config;