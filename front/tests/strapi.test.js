import { describe, it, expect } from 'vitest';
import strapiService from '../src/api/strapi.js';

describe('Sequential Strapi API Tests (strapiService)', () => {
    let testDeckDocId = '';

    it('1. Login should succeed', async () => {
        const data = await strapiService.login({
            identifier: 'admin@gmail.com',
            password: 'Password123456789!'
        });
        expect(data.jwt).toBeDefined();
        console.log('Login OK');
    });

    it('2. GetMe should return the Authenticated role', async () => {
        const data = await strapiService.getMe();
        expect(data.id).toBeDefined();
        expect(data.role).toBeDefined();
        console.log(`User: ${data.username}, Role: ${data.role?.name}`);
    });

    it('3. Find cards should succeed', async () => {
        const data = await strapiService.find('cards');
        expect(Array.isArray(data)).toBe(true);
        console.log(`Cards found: ${data.length}`);
    });

    it('4. Create deck should succeed', async () => {
        const me = await strapiService.getMe();
        const data = await strapiService.create('decks', {
            name: 'Test Deck via Service',
            user: me.id,
        });
        expect(data).toBeDefined();
        testDeckDocId = data.documentId;
        console.log('Deck created:', testDeckDocId);
    });

    it('5. Delete deck should succeed', async () => {
        if (!testDeckDocId) return;
        await strapiService.delete('decks', testDeckDocId);
        console.log('Deck deleted');
    });
});
