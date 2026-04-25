export default {
  routes: [
    {
      method: "POST",
      path: "/card-frames/buy",
      handler: "card-frame.buy",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
