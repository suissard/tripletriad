export default {
  routes: [
    {
      method: 'GET',
      path: '/cards/filters',
      handler: 'api::card.card.getFilters',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
