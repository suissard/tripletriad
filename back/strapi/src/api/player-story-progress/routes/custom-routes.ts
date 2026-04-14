export default {
  routes: [
    {
      method: "POST",
      path: "/player-story-progress/claim-step-reward",
      handler: "player-story-progress.claimStepReward",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/player-story-progress/unlock-story",
      handler: "player-story-progress.unlockStory",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/player-story-progress/save-step-progress",
      handler: "player-story-progress.saveStepProgress",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/player-story-progress/reset",
      handler: "player-story-progress.resetProgress",
      config: {
        policies: [],
      },
    },
  ],
};
