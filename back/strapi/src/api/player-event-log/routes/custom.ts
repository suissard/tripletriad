export default {
  routes: [
    {
      method: 'POST',
      path: '/player-event-log/track',
      handler: 'player-event-log.trackEvent',
      config: {
        // Protected by permissions
      }
    }
  ]
}
