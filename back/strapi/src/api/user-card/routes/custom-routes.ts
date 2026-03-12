export default {
  routes: [
    {
      method: 'POST',
      path: '/user-cards/disenchant',
      handler: 'user-card.disenchant',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/user-cards/craft',
      handler: 'user-card.craft',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/user-cards/mass-disenchant',
      handler: 'user-card.massDisenchant',
      config: {
        policies: [],
        middlewares: [],
      },
    }
  ]
}
