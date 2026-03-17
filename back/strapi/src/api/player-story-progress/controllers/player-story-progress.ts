import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::player-story-progress.player-story-progress', ({ strapi }) => ({
  async claimStepReward(ctx) {
    const { id } = ctx.state.user;
    const { storyId, stepId } = ctx.request.body;

    if (!storyId || !stepId) {
      return ctx.badRequest('storyId and stepId are required');
    }

    const story = await strapi.entityService.findOne('api::story.story', storyId, {
      populate: {
        steps: {
          populate: ['rewardCards']
        }
      }
    });

    if (!story) {
      return ctx.notFound('Story not found');
    }

    const step = story.steps.find((s: any) => s.id === stepId);
    if (!step) {
      return ctx.notFound('Step not found in this story');
    }

    // Find progress
    let progress = await strapi.db.query('api::player-story-progress.player-story-progress').findOne({
      where: { user: id, story: storyId }
    });

    if (!progress) {
      progress = await strapi.entityService.create('api::player-story-progress.player-story-progress', {
        data: {
          user: id,
          story: storyId,
          status: 'in_progress',
          completedSteps: []
        }
      });
    }

    const completedSteps = Array.isArray(progress.completedSteps) ? progress.completedSteps : [];

    // Check if already completed
    if (completedSteps.includes(stepId)) {
      return ctx.badRequest('Step already completed');
    }

    // Add reward
    let rewardedCard = null;
    if (step.rewardCards && step.rewardCards.length > 0) {
      // pick a random card from the rewards
      const randomCard = step.rewardCards[Math.floor(Math.random() * step.rewardCards.length)];

      // give card to user
      const existingUserCard = await strapi.db.query('api::user-card.user-card').findOne({
        where: { user: id, card: randomCard.id, isPremium: false }
      });

      if (existingUserCard) {
        await strapi.entityService.update('api::user-card.user-card', existingUserCard.id, {
          data: { quantity: existingUserCard.quantity + 1 }
        });
      } else {
        await strapi.entityService.create('api::user-card.user-card', {
          data: {
            user: id,
            card: randomCard.id,
            quantity: 1,
            isPremium: false
          }
        });
      }
      rewardedCard = randomCard;
    }

    // Update progress
    const updatedSteps = [...completedSteps, stepId];
    let newStatus = progress.status;
    if (updatedSteps.length >= story.steps.length) {
      newStatus = 'completed';
    }

    const updatedProgress = await strapi.entityService.update('api::player-story-progress.player-story-progress', progress.id, {
      data: {
        completedSteps: updatedSteps,
        status: newStatus
      }
    });

    return {
      progress: updatedProgress,
      reward: rewardedCard
    };
  }
}));
