export default {
  routes: [
    {
      method: "GET",
      path: "/cards/filters",
      handler: "card.getFilters",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
