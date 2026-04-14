export default {
  routes: [
    {
      method: "GET",
      path: "/weekly-quest/progress",
      handler: "weekly-quest-progress.getProgress",
    },
    {
      method: "POST",
      path: "/weekly-quest/claim",
      handler: "weekly-quest-progress.claimTier",
    },
  ],
};
