import { describe, it, expect, beforeAll } from 'vitest';
import strapiService from '../src/api/strapi.js';

describe('Quest Progression System', () => {
  let userToken = '';
  let userId = '';
  let activeQuest = null;

  it('1. Should register a new test user', async () => {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const email = `test_${timestamp}@example.com`;
    const password = 'Password123!';

    const response = await strapiService.register({
      username,
      email,
      password
    });

    expect(response.jwt).toBeDefined();
    expect(response.user.id).toBeDefined();
    
    userToken = response.jwt;
    userId = response.user.id;
    
    // strapiService.setToken is called inside register in userStore, 
    // but here we are using strapiService directly
    strapiService.setToken(userToken);
  });

  it('2. Should wait for and identify an active quest', async () => {
    // Poll for quests as they are assigned via lifecycles in Strapi
    let quests = [];
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const result = await strapiService.find('player-quests', {
        populate: ['quest_template']
      });
      quests = result.data || result;
      if (Array.isArray(quests) && quests.length > 0) break;
    }

    expect(quests.length).toBeGreaterThan(0);
    
    // Prefer a generic "PLAY_GAMES" quest for testing if available
    activeQuest = quests.find(q => {
      const code = q.quest_template?.code || '';
      return code.includes('WELCOME') || (code.includes('PLAY') && !code.includes('ELEMENT'));
    }) || quests[0];

    expect(activeQuest).toBeDefined();
    console.log(`Testing with quest: ${activeQuest.quest_template?.title} (ID: ${activeQuest.id})`);
  }, 15000);

  it('3. Should track a "play_game" event and increment progress', async () => {
    const initialProgress = activeQuest.progress || 0;
    
    // Determine event type based on quest
    let eventType = 'play_game';
    let details = {};
    
    if (activeQuest.quest_template?.code?.includes('WIN')) {
      eventType = 'win_game';
    } else if (activeQuest.quest_template?.code?.includes('ELEMENT')) {
      eventType = 'play_card_element';
      const match = activeQuest.quest_template.code.match(/ELEMENT_(.*)_/);
      details.element = (match ? match[1].toLowerCase() : 'spore');
    }

    console.log(`Sending event: ${eventType} ${JSON.stringify(details)}`);
    
    await strapiService.trackEvent(eventType, details);

    // Wait for async processing in backend
    await new Promise(r => setTimeout(r, 2000));

    // Verify progress
    const result = await strapiService.findOne('player-quests', activeQuest.documentId || activeQuest.id);
    const updatedQuest = result.data || result;
    
    console.log(`Progress: ${initialProgress} -> ${updatedQuest.progress}`);
    expect(updatedQuest.progress).toBeGreaterThan(initialProgress);
  }, 10000);
});
