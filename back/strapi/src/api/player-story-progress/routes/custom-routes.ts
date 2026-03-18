export default {
  routes: [
    {
      method: 'POST',
      path: '/player-story-progress/claim-step-reward',
      handler: 'player-story-progress.claimStepReward',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/player-story-progress/unlock-story',
      handler: 'player-story-progress.unlockStory',
      config: {
        policies: [],
      },
    },
  ],
};
