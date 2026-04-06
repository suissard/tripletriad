import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setDefaultResultOrder } from 'node:dns';

setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, '..', '.env');

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
  }
  return env;
}

const env = loadEnv();
const STRAPI_URL = `http://127.0.0.1:${env.STRAPI_PORT || 1340}`;

async function main() {
  try {
    console.log(`Connecting to Strapi at ${STRAPI_URL}...`);
    
    // 1. Register a new test user
    const testUsername = `testuser_${Date.now()}`;
    const testEmail = `${testUsername}@example.com`;
    const testPassword = 'Password123!';

    console.log(`Creating test user: ${testUsername}...`);
    const registerRes = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: testUsername,
            email: testEmail,
            password: testPassword
        })
    });

    if (!registerRes.ok) {
        throw new Error(`Failed to register test user: ${await registerRes.text()}`);
    }

    const registerData = await registerRes.json();
    const userToken = registerData.jwt;
    const userId = registerData.user.id;

    console.log(`Test user created (ID: ${userId}). Waiting for quest assignment...`);
    
    let userQuests;
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const uQuestsRes = await fetch(`${STRAPI_URL}/api/player-quests?populate=quest_template`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const resData = await uQuestsRes.json();
        userQuests = resData.data;
        if (userQuests && userQuests.length > 0) break;
        console.log('  Still waiting...');
    }

    if (!userQuests || userQuests.length === 0) {
        throw new Error('No quests assigned to test user.');
    }

    // Filter quests to find a generic one (PLAY_GAMES_DAILY or similar)
    const q = userQuests.find(quest => {
        const code = quest.quest_template?.code || '';
        return code.includes('WELCOME') || (code.includes('PLAY') && !code.includes('ELEMENT'));
    }) || userQuests[0];

    const initialProgress = q.progress || 0;
    const docId = q.documentId;
    
    // Determine right event type based on quest
    let eventType = 'play_game';
    let details = {};
    
    if (q.quest_template?.code?.includes('WIN')) {
        eventType = 'win_game';
    } else if (q.quest_template?.code?.includes('ELEMENT')) {
        eventType = 'play_card_element';
        // Extract element from code like PLAY_ELEMENT_SPORE_48H
        const match = q.quest_template.code.match(/ELEMENT_(.*)_/);
        details.element = (match ? match[1].toLowerCase() : 'spore');
    }

    console.log(`Targeting Quest ID: ${q.id} (DocID: ${docId})`);
    console.log(`Template: ${q.quest_template?.title} (${q.quest_template?.code})`);
    console.log(`Initial progress: ${initialProgress}`);

    console.log(`Sending "${eventType}" event with details ${JSON.stringify(details)}...`);
    const trackRes = await fetch(`${STRAPI_URL}/api/player-event-log/track`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ eventType, ...details })
    });

    if (!trackRes.ok) {
        throw new Error(`Track event failed: ${await trackRes.text()}`);
    }
    console.log('Event tracked successfully.');

    console.log('Verifying progress update...');
    await new Promise(r => setTimeout(r, 3000)); // Wait longer for processing

    const verifyRes = await fetch(`${STRAPI_URL}/api/player-quests/${docId}`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const verifyData = await verifyRes.json();
    
    if (!verifyData.data) {
        console.log('Full Verify Response:', JSON.stringify(verifyData, null, 2));
        throw new Error('Verification response data is null.');
    }
    
    const newProgress = verifyData.data.progress;
    console.log(`Final Progress: ${newProgress}`);

    if (newProgress > initialProgress) {
        console.log('✅ SUCCESS: Quest progressed correctly!');
    } else {
        console.log('❌ FAILURE: Quest progress did not increase.');
    }

  } catch (error) {
    console.error('Test script error:', error.message);
  }
}

main();
