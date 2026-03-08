export default {
  routes: [
    { // Route custom pour l'arbitrage
      method: 'POST',
      path: '/match/arbitrate',
      handler: 'match.arbitrate',
      config: {
        auth: false, // À configurer selon vos besoins (ex: auth: true)
      },
    },
  ],
};
