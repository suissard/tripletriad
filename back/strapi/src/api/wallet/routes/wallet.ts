export default {
  routes: [
    {
      method: 'GET',
      path: '/wallets/me',
      handler: 'wallet.getMe',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/wallets',
      handler: 'wallet.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/wallets/:id',
      handler: 'wallet.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/wallets',
      handler: 'wallet.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/wallets/:id',
      handler: 'wallet.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/wallets/:id',
      handler: 'wallet.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
