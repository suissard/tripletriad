export default {
  routes: [
    {
      method: 'POST',
      path: '/player-event-log/track',
      handler: 'player-event-log.trackEvent',
      config: {
        auth: false, // We'll rely on permissions, but default core router is secured by default.
      }
    }
  ]
}
