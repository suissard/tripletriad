import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const frontPort = env('FRONTEND_PORT', '5180');
  const frontUrl = env('FRONT_URL', `http://localhost:${frontPort}`);
  const isProd = env('NODE_ENV') === 'production';
  const corsOrigins = isProd
    ? [frontUrl]
    : [frontUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5180', 'http://127.0.0.1:5180'];

  return [
    'strapi::logger',
    'strapi::errors',
    'strapi::security',
    {
      name: 'strapi::cors',
      config: {
        origin: corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        credentials: true,
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    {
      name: 'strapi::body',
      config: {
        jsonLimit: '2mb',
        formLimit: '10mb',
        textLimit: '2mb',
      },
    },
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
