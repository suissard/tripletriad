import fs from 'fs';
import path from 'path';

export async function bootstrapStories(strapi: any) {
  try {
    const storiesDir = path.join(strapi.dirs.app.src, 'shared', 'data', 'stories');
    const exampleFile = path.join(strapi.dirs.app.src, 'shared', 'data', 'story-example.json');
    
    let storyFiles = [];
    if (fs.existsSync(storiesDir)) {
      const dirFiles = fs.readdirSync(storiesDir).filter(f => f.endsWith('.json')).map(f => path.join(storiesDir, f));
      storyFiles = [...storyFiles, ...dirFiles];
    }
    if (fs.existsSync(exampleFile)) {
      storyFiles.push(exampleFile);
    }

    if (storyFiles.length === 0) {
      console.log('⚠️ No story files found, skipping story bootstrap.');
      return;
    }

    console.log(`🚀 Starting two-pass story bootstrap for ${storyFiles.length} files...`);

    // Get all cards for random rewards
    const allCards = await strapi.entityService.findMany('api::card.card', {
      fields: ['id', 'name']
    });
    const cardIds = allCards.map((c: any) => c.id);

    // Get all decks for validation
    const allDecks = await strapi.entityService.findMany('api::deck.deck', {
      fields: ['id', 'name']
    });
    const deckIds = allDecks.map((d: any) => d.id);
    const deckMap = new Map(allDecks.map((d: any) => [d.name, d.id]));

    const storiesToProcess = [];

    // --- Pass 1: Gather data and Create/Update Stories ---
    console.log('--- Pass 1: Syncing Stories ---');
    for (const filePath of storyFiles) {
      try {
        const storyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!storyData.title) {
          console.warn(`  ⚠️ Skipping file ${filePath}: missing title`);
          continue;
        }

        let story;
        const existingStories = await strapi.entityService.findMany('api::story.story', {
          filters: { title: storyData.title },
          populate: ['steps']
        });

        if (existingStories.length > 0) {
          story = existingStories[0];
          console.log(`  🔄 Updating story: "${storyData.title}" (ID: ${story.id})`);
          
          // Delete old steps to ensure a clean re-seed
          const stepsToDelete = await strapi.entityService.findMany('api::story-step.story-step', {
            filters: { story: story.id }
          });
          
          if (stepsToDelete && stepsToDelete.length > 0) {
            for (const step of stepsToDelete) {
              await strapi.entityService.delete('api::story-step.story-step', step.id);
            }
            console.log(`    🗑️ Deleted ${stepsToDelete.length} old steps.`);
          }
          
          story = await strapi.entityService.update('api::story.story', story.id, {
            data: {
              description: storyData.description,
              cost: storyData.cost || 0,
              costType: storyData.costType || 'coins'
            }
          });
        } else {
          story = await strapi.entityService.create('api::story.story', {
            data: {
              title: storyData.title,
              description: storyData.description,
              cost: storyData.cost || 0,
              costType: storyData.costType || 'coins'
            }
          });
          console.log(`  🆕 Created story: "${storyData.title}" (ID: ${story.id})`);
        }

        storiesToProcess.push({ storyId: story.id, storyData });
      } catch (err: any) {
        console.error(`  ❌ Failed to process file ${filePath} in Pass 1:`, err.message);
      }
    }

    // --- Pass 2: Create and Link Steps ---
    console.log('--- Pass 2: Syncing Steps ---');
    for (const { storyId, storyData } of storiesToProcess) {
      try {
        const createStep = async (stepData: any) => {
          const situations = (stepData.situations || []).map((s: any) => {
            const cleanSit = { ...s };
            // Validate card rewards
            if (cleanSit.__component === 'story.situation-reward' && cleanSit.rewardCards) {
               cleanSit.rewardCards = (cleanSit.rewardCards as any[]).filter(id => cardIds.includes(Number(id)));
            }
            // Validate decks in battle
            if (cleanSit.__component === 'story.situation-battle') {
              if (cleanSit.enemyDeckName && deckMap.has(cleanSit.enemyDeckName)) cleanSit.enemyDeck = deckMap.get(cleanSit.enemyDeckName);
              if (cleanSit.playerDeckName && deckMap.has(cleanSit.playerDeckName)) cleanSit.playerDeck = deckMap.get(cleanSit.playerDeckName);
              delete cleanSit.enemyDeckName;
              delete cleanSit.playerDeckName;
              if (cleanSit.enemyDeck && !deckIds.includes(Number(cleanSit.enemyDeck))) delete cleanSit.enemyDeck;
              if (cleanSit.playerDeck && !deckIds.includes(Number(cleanSit.playerDeck))) delete cleanSit.playerDeck;
            }
            return cleanSit;
          });

          return await strapi.entityService.create('api::story-step.story-step', {
            data: {
              title: stepData.title,
              description: stepData.description || '',
              story: storyId,
              situations: situations
            }
          } as any);
        };

        if (storyData.steps && Array.isArray(storyData.steps)) {
          console.log(`  📑 Seeding ${storyData.steps.length} steps for "${storyData.title}"...`);
          for (const stepData of storyData.steps) {
            const randomRewards = [];
            if (cardIds.length > 0) {
              for (let i = 0; i < Math.min(3, cardIds.length); i++) {
                 randomRewards.push(cardIds[Math.floor(Math.random() * cardIds.length)]);
              }
            }

            const stepSituations = [];
            if (stepData.startDialogue && stepData.startDialogue.length > 0) {
              stepSituations.push({
                __component: 'story.situation-dialogue',
                situationId: 'start',
                dialogues: stepData.startDialogue
              });
            }

            stepSituations.push({
              __component: 'story.situation-reward',
              situationId: 'reward',
              rewardCards: stepData.rewardCards || randomRewards
            });

            if (stepData.endDialogue && stepData.endDialogue.length > 0) {
              stepSituations.push({
                __component: 'story.situation-dialogue',
                situationId: 'end',
                dialogues: stepData.endDialogue
              });
            }

            try {
              const step = await createStep({ ...stepData, situations: stepSituations });
              // console.log(`      ✅ Created step: "${stepData.title}" (ID: ${step.id})`);
            } catch (err: any) {
              console.error(`      ❌ Failed to create step "${stepData.title}":`, err.message);
            }
          }
        } else if (storyData.situations && Array.isArray(storyData.situations)) {
          console.log(`  📑 Seeding multi-situation step for "${storyData.title}"...`);
          try {
            const step = await createStep({ 
              title: storyData.title, 
              description: storyData.description, 
              situations: storyData.situations 
            });
            console.log(`    ✅ Created single-step story (Step ID: ${step.id})`);
          } catch (err: any) {
            console.error(`    ❌ Failed to create situations step for "${storyData.title}":`, err.message);
          }
        }
      } catch (err: any) {
        console.error(`  ❌ Failed to process story "${storyData.title}" in Pass 2:`, err.message);
      }
    }
    console.log('✅ Story bootstrap completed successfully.');
  } catch (error: any) {
    console.error('❌ Fatal error in story bootstrap:', error);
  }
}
