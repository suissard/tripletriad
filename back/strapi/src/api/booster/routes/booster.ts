export default {
    routes: [
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
