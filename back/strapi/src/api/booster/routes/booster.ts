export default {
    routes: [
      {
        method: 'POST',
        path: '/booster/buy',
        handler: 'booster.buyBooster',
        config: {
          policies: [],
          middlewares: [],
        },
      },
      {
        method: 'POST',
        path: '/booster/open',
        handler: 'booster.openBooster',
        config: {
          policies: [],
          middlewares: [],
        },
      },
    ],
  };
