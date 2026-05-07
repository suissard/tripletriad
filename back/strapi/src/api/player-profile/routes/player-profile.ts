export default {
  routes: [
    {
      method: "GET",
      path: "/player-profile/:identifier",
      handler: "player-profile.getProfile",
      config: {
        auth: false, // We handle auth inside the controller for friendship status
      },
    },
  ],
};
