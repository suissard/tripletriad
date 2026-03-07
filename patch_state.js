const fs = require('fs');
const file = 'front/src/game/state.js';
let content = fs.readFileSync(file, 'utf8');

const stateReplacement = `
    // Auth State
    isLoggedIn: false,
    jwt: null,
    user: {
        id: null,
        username: 'Joueur Anonyme',
        avatar: 'https://api.dicebear.com/9.x/bottts/png?seed=player&backgroundColor=transparent',
        dust: 0
    },
`;
content = content.replace(/\/\/ Auth State\s*isLoggedIn: false,\s*jwt: null,\s*user: \{[\s\S]*?\},/m, stateReplacement);

const authReplacement = `
export function setAuth(jwt, user) {
    state.jwt = jwt;
    state.user = {
        id: user.id,
        username: user.username,
        avatar: \`https://api.dicebear.com/9.x/bottts/png?seed=\${user.username}&backgroundColor=transparent\`,
        dust: user.dust || 0
    };
`;
content = content.replace(/export function setAuth\(jwt, user\) \{[\s\S]*?avatar: `https:\/\/api\.dicebear\.com\/9\.x\/bottts\/png\?seed=\$\{user\.username\}&backgroundColor=transparent`/m, authReplacement);

const fetchCollectionReplacement = `
export async function fetchUserCollection() {
    if (!state.isLoggedIn) return;
    try {
        const result = await strapiService.find('user-cards', {
            filters: { user: { id: state.user.id } },
            populate: ['card']
        });
        const items = toArray(result);
        state.collection = items.map(item => ({
            id: item.id,
            cardId: item.card?.id,
            quantity: item.quantity
        }));

        // Also sync dust
        const userData = await strapiService.find(\`users/\${state.user.id}\`);
        if (userData && typeof userData.dust !== 'undefined') {
            state.user.dust = userData.dust;
            const updatedUser = { ...JSON.parse(localStorage.getItem('tt_user') || '{}'), dust: userData.dust };
            localStorage.setItem('tt_user', JSON.stringify(updatedUser));
        }
    } catch (e) {
        if (e.status === 401) {
            console.warn('Session expired (401). Logging out.');
            logout();
            return;
        }
        console.error('Collection sync failed', e);
    }
}
`;
content = content.replace(/export async function fetchUserCollection\(\) \{[\s\S]*?console\.error\('Collection sync failed', e\);\s*\}\s*\}/m, fetchCollectionReplacement);

const customMethodsReplacement = `
// CRAFTING & DISENCHANTING
export async function craftCard(cardId) {
    if (!state.isLoggedIn) return false;
    try {
        const response = await fetch(\`\${strapiService.url}/api/user-cards/craft\`, {
            method: 'POST',
            headers: strapiService.getHeaders(),
            body: JSON.stringify({ cardId })
        });
        const result = await response.json();

        if (response.ok) {
            state.user.dust = result.newDustTotal;

            // Update collection
            const existing = state.collection.find(c => c.cardId === cardId);
            if (existing) {
                existing.quantity = result.newQuantity;
            } else {
                state.collection.push({ cardId, quantity: 1 });
            }

            // Sync user dust to localStorage
            const updatedUser = { ...JSON.parse(localStorage.getItem('tt_user') || '{}'), dust: state.user.dust };
            localStorage.setItem('tt_user', JSON.stringify(updatedUser));
            return true;
        } else {
            console.error('Crafting failed:', result.error?.message || result.message);
            alert(\`Erreur: \${result.error?.message || result.message}\`);
            return false;
        }
    } catch (e) {
        console.error('Crafting failed', e);
        return false;
    }
}

export async function disenchantCard(cardId) {
    if (!state.isLoggedIn) return false;
    try {
        const response = await fetch(\`\${strapiService.url}/api/user-cards/disenchant\`, {
            method: 'POST',
            headers: strapiService.getHeaders(),
            body: JSON.stringify({ cardId })
        });
        const result = await response.json();

        if (response.ok) {
            state.user.dust = result.newDustTotal;

            // Update collection
            const existingIndex = state.collection.findIndex(c => c.cardId === cardId);
            if (existingIndex !== -1) {
                if (result.newQuantity === 0) {
                    state.collection.splice(existingIndex, 1);
                } else {
                    state.collection[existingIndex].quantity = result.newQuantity;
                }
            }

            // Sync user dust to localStorage
            const updatedUser = { ...JSON.parse(localStorage.getItem('tt_user') || '{}'), dust: state.user.dust };
            localStorage.setItem('tt_user', JSON.stringify(updatedUser));
            return true;
        } else {
            console.error('Disenchant failed:', result.error?.message || result.message);
            alert(\`Erreur: \${result.error?.message || result.message}\`);
            return false;
        }
    } catch (e) {
        console.error('Disenchanting failed', e);
        return false;
    }
}

export async function massDisenchantCards() {
    if (!state.isLoggedIn) return false;

    const confirm = await confirmAction('Désenchantement de masse', 'Êtes-vous sûr de vouloir détruire toutes vos cartes en surplus pour obtenir de la poussière ?');
    if (!confirm) return false;

    try {
        const response = await fetch(\`\${strapiService.url}/api/user-cards/mass-disenchant\`, {
            method: 'POST',
            headers: strapiService.getHeaders()
        });
        const result = await response.json();

        if (response.ok) {
            if (result.cardsDestroyed > 0) {
                alert(\`\${result.cardsDestroyed} cartes détruites pour \${result.totalDustGained} ✨ Poussière.\`);
                await fetchUserCollection(); // Full refresh
            } else {
                alert('Aucune carte en surplus à désenchanter.');
            }
            return true;
        } else {
            console.error('Mass disenchant failed:', result.error?.message || result.message);
            alert(\`Erreur: \${result.error?.message || result.message}\`);
            return false;
        }
    } catch (e) {
        console.error('Mass disenchanting failed', e);
        return false;
    }
}
`;

content += customMethodsReplacement;

fs.writeFileSync(file, content, 'utf8');
console.log('Patched state.js');
