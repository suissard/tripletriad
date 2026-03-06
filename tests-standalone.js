const STRAPI_URL = 'http://localhost:1337/api';

async function runTests() {
    console.log('--- STARTING STANDALONE API TESTS ---');
    let jwt = '';
    let userId = '';
    let testDeckDocumentId = '';

    try {
        // 1. Auth as TestUser
        console.log('1. Testing Auth...');
        const authRes = await fetch(`${STRAPI_URL}/auth/local`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: 'testuser@tripletriad.com',
                password: 'testpassword123'
            })
        });
        const authData = await authRes.json();
        if (authRes.status !== 200) {
            console.error('FAILED AUTH:', authData);
            return;
        }
        jwt = authData.jwt;
        userId = authData.user.id;
        console.log(` - Auth OK (User: ${authData.user.username}, ID: ${userId})`);

        // 2. Role Check
        console.log('2. Testing Role...');
        const roleRes = await fetch(`${STRAPI_URL}/users/me?populate=role`, {
            headers: { 'Authorization': `Bearer ${jwt}` }
        });
        const roleData = await roleRes.json();
        console.log(` - Role detected: ${roleData.role?.type || 'Inconnu'}`);

        // 3. Create Deck
        console.log('3. Testing Create Deck...');
        const deckRes = await fetch(`${STRAPI_URL}/decks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    name: 'Test Deck Standalone',
                    user: userId,
                    cards: []
                }
            })
        });
        const deckData = await deckRes.json();
        if (deckRes.status === 201 || deckRes.status === 200) {
            testDeckDocumentId = deckData.data.documentId;
            console.log(` - Create Deck OK (documentId: ${testDeckDocumentId})`);
        } else {
            console.error(` - FAILED Create Deck (Status: ${deckRes.status}):`, JSON.stringify(deckData, null, 2));
        }

        // 4. Cleanup
        if (testDeckDocumentId) {
            console.log('4. Cleaning up...');
            const delRes = await fetch(`${STRAPI_URL}/decks/${testDeckDocumentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            console.log(` - Cleanup Status: ${delRes.status}`);
        }

    } catch (err) {
        console.error('TEST ERROR:', err);
    }
    console.log('--- TESTS COMPLETE ---');
}

runTests();
