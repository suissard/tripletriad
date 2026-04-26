export default {
  routes: [
    {
      method: "POST",
      path: "/card-backs/buy",
      handler: "card-back.buy",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
