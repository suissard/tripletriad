import { describe, it, expect } from 'vitest';
import strapiService from '../src/api/strapi.js';

describe('Quest Reward Claim System', () => {
  let userToken = '';
  let userId = '';
  let documentId = '';
  let walletBefore = { coins: 0, gems: 0 };

  it('1. Register test user and get initial wallet', async () => {
    const timestamp = Date.now();
    const username = `claimtest_${timestamp}`;
    const email = `claim_${timestamp}@example.com`;
    const response = await strapiService.register({
      username,
      email,
      password: 'Password123!'
    });

    userToken = response.jwt;
    userId = response.user.id;
    strapiService.setToken(userToken);

    // Get wallet state
    const meRes = await strapiService.request('GET', '/users/me?populate[wallet]=*');
    walletBefore.coins = meRes.wallet?.coins || 0;
    walletBefore.gems = meRes.wallet?.gems || 0;
    console.log(`Initial wallet: ${walletBefore.coins} coins, ${walletBefore.gems} gems`);
  });

  it('2. Complete a quest and verify it is not auto-claimed', async () => {
    // Wait for quest assignment
    let quests = [];
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await strapiService.find('player-quests', { populate: ['quest_template'] });
      quests = res.data || res;
      if (Array.isArray(quests) && quests.length > 0) break;
    }

    const quest = quests[0];
    documentId = quest.documentId || quest.id;
    const target = quest.quest_template?.target || 1;
    const code = quest.quest_template?.code || 'PLAY_GAMES';
    
    console.log(`Completing quest ${quest.quest_template?.title} (target: ${target})`);

    // Force completion by sending enough events
    for (let i = 0; i < target; i++) {
        // Map code to event type
        let eventType = 'play_game';
        if (code.includes('WIN')) eventType = 'win_game';
        await strapiService.trackEvent(eventType);
    }

    // Wait for processing
    await new Promise(r => setTimeout(r, 2000));

    // Verify status is completed but rewardClaimed is false
    const res = await strapiService.findOne('player-quests', documentId);
    const updatedQuest = res.data || res;
    
    expect(updatedQuest.status).toBe('completed');
    expect(updatedQuest.rewardClaimed).toBe(false);

    // Verify wallet has NOT changed
    const meRes = await strapiService.request('GET', '/users/me?populate[wallet]=*');
    expect(meRes.wallet?.coins || 0).toBe(walletBefore.coins);
    expect(meRes.wallet?.gems || 0).toBe(walletBefore.gems);
  }, 20000);

  it('3. Claim reward and verify wallet update', async () => {
    const res = await strapiService.claimQuestReward(documentId);
    
    expect(res.success).toBe(true);
    expect(res.reward).toBeDefined();
    expect(res.playerQuest.rewardClaimed).toBe(true);

    // Verify wallet updated
    const meRes = await strapiService.request('GET', '/users/me?populate[wallet]=*');
    expect(meRes.wallet?.coins || 0).toBeGreaterThan(walletBefore.coins);
    console.log(`Final wallet: ${meRes.wallet?.coins} coins`);
  });

  it('4. Prevent double claiming', async () => {
    const res = await strapiService.claimQuestReward(documentId);
    expect(res.error).toBeDefined();
  });
});
