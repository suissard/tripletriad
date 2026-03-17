import fs from 'fs';
import path from 'path';

export async function bootstrapStories(strapi: any) {
  try {
    const storiesDir = path.join(strapi.dirs.app.src, 'shared', 'data', 'stories');
    if (!fs.existsSync(storiesDir)) {
      console.log('Stories directory not found, skipping story bootstrap.');
      return;
    }

    const storyFiles = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json'));

    // Get all cards for random rewards
    const allCards = await strapi.entityService.findMany('api::card.card', {
      fields: ['id']
    });

    for (const file of storyFiles) {
      const filePath = path.join(storiesDir, file);
      const storyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Check if story exists
      const existingStories = await strapi.entityService.findMany('api::story.story', {
        filters: { title: storyData.title }
      });

      if (existingStories.length > 0) {
        continue; // Story already exists
      }

      console.log(`Creating story: ${storyData.title}`);

      // Create Story
      const newStory = await strapi.entityService.create('api::story.story', {
        data: {
          title: storyData.title,
          description: storyData.description,
          cost: 0,
          costType: 'coins'
        }
      });

      // Create Steps
      if (storyData.steps && Array.isArray(storyData.steps)) {
        for (const stepData of storyData.steps) {
          // Select 3 random cards for rewards
          const randomRewards = [];
          if (allCards.length > 0) {
            for (let i = 0; i < Math.min(3, allCards.length); i++) {
               const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
               randomRewards.push(randomCard.id);
            }
          }

          await strapi.entityService.create('api::story-step.story-step', {
            data: {
              title: stepData.title,
              description: stepData.description,
              startDialogue: stepData.startDialogue || [],
              endDialogue: stepData.endDialogue || [],
              story: newStory.id,
              rewardCards: randomRewards
            }
          });
        }
      }
    }
    console.log('✅ Stories bootstrapped.');
  } catch (error) {
    console.error('❌ Error bootstrapping stories:', error);
  }
}
