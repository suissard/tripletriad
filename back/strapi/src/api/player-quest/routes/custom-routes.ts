export default {
  routes: [
    {
      method: 'POST',
      path: '/player-quests/:id/claim',
      handler: 'api::player-quest.player-quest.claimReward',
    },
  ],
};
