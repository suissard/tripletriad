export default {
  routes: [
    {
      method: 'POST',
      path: '/shop/open-pack',
      handler: 'shop.openPack',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
