import { factories } from "@strapi/strapi";

function getStartOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  // day is 0 (Sunday) to 6 (Saturday). We want Monday to be start of week.
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

export default factories.createCoreService(
  "api::weekly-quest-progress.weekly-quest-progress",
  ({ strapi }) => ({
    async getProgress(userId: number) {
      const records = await strapi.entityService.findMany(
        "api::weekly-quest-progress.weekly-quest-progress",
        {
          filters: { user: { id: userId } } as any,
        },
      );

      let progress = records && records.length > 0 ? records[0] : null;
      const startOfWeek = getStartOfCurrentWeek();

      if (!progress) {
        // Create new progress
        progress = await strapi.entityService.create(
          "api::weekly-quest-progress.weekly-quest-progress",
          {
            data: {
              user: userId,
              completedCount: 0,
              claimedTiers: [],
              lastResetDate: startOfWeek.toISOString(),
            },
          },
        );
      } else {
        // Check lazy reset
        const lastResetDate = new Date(progress.lastResetDate);
        if (lastResetDate.getTime() < startOfWeek.getTime()) {
          progress = await strapi.entityService.update(
            "api::weekly-quest-progress.weekly-quest-progress",
            progress.id,
            {
              data: {
                completedCount: 0,
                claimedTiers: [],
                lastResetDate: startOfWeek.toISOString(),
              },
            },
          );
        }
      }

      return progress;
    },

    async incrementProgress(userId: number) {
      const progress = await this.getProgress(userId);
      const newCount = progress.completedCount + 1;

      return strapi.entityService.update(
        "api::weekly-quest-progress.weekly-quest-progress",
        progress.id,
        {
          data: {
            completedCount: newCount,
          },
        },
      );
    },
  }),
);
