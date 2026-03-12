export default {
  routes: [
    {
      method: 'POST',
      path: '/dev/add-currencies',
      handler: 'user-card.addDevCurrencies',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ]
}
