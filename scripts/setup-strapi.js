#!/usr/bin/env node

/**
 * setup-strapi.js
 * 
 * Standalone provisioning script for Strapi.
 * Configures admin user, API user, and all permissions via REST API.
 * 
 * Usage: node scripts/setup-strapi.js
 * 
 * Reads credentials from .env at project root.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Config ────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Parse .env manually (no dotenv dependency)
function loadEnv() {
    const envPath = resolve(ROOT, '.env');
    const env = {};
    try {
        const content = readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const [key, ...rest] = trimmed.split('=');
            env[key.trim()] = rest.join('=').trim();
        }
    } catch (e) {
        console.error('⚠️  Could not read .env file:', e.message);
    }
    return env;
}

const env = loadEnv();
const STRAPI_URL = env.VITE_STRAPI_URL || `http://localhost:${env.STRAPI_PORT || 1340}`;
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
const ADMIN_FIRSTNAME = env.ADMIN_FIRSTNAME || 'Super';
const ADMIN_LASTNAME = env.ADMIN_LASTNAME || 'Admin';

// API user credentials (same as admin by default)
const API_USER_EMAIL = env.API_USER_EMAIL || ADMIN_EMAIL;
const API_USER_PASSWORD = env.API_USER_PASSWORD || ADMIN_PASSWORD;
const API_USER_NAME = env.API_USER_NAME || 'suissard';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !API_USER_EMAIL || !API_USER_PASSWORD) {
    console.error('❌ Missing required environment variables: ADMIN_EMAIL, ADMIN_PASSWORD, API_USER_EMAIL, or API_USER_PASSWORD.');
    console.error('   Please define them in your .env file at the project root.');
    process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const ok = (msg) => log('✅', msg);
const info = (msg) => log('ℹ️ ', msg);
const warn = (msg) => log('⚠️', msg);
const fail = (msg) => { log('❌', msg); process.exit(1); };

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function api(path, options = {}) {
    const url = `${STRAPI_URL}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
}

function authHeaders(jwt) {
    return { Authorization: `Bearer ${jwt}` };
}

// ─── Steps ─────────────────────────────────────────────────────────────────────

async function waitForStrapi() {
    info(`Waiting for Strapi at ${STRAPI_URL}...`);
    const maxAttempts = 60;
    for (let i = 1; i <= maxAttempts; i++) {
        try {
            const res = await fetch(`${STRAPI_URL}/admin/init`);
            if (res.ok) {
                const json = await res.json();
                ok(`Strapi is ready! (hasAdmin: ${json.data?.hasAdmin})`);
                return json.data;
            }
        } catch (e) {
            // Strapi not ready yet
        }
        process.stdout.write(`\r   Attempt ${i}/${maxAttempts}...`);
        await sleep(2000);
    }
    process.stdout.write('\n');
    fail('Strapi did not become ready in time.');
}

async function registerAdmin() {
    info('Registering admin user...');
    const { status, data } = await api('/admin/register-admin', {
        method: 'POST',
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            firstname: ADMIN_FIRSTNAME,
            lastname: ADMIN_LASTNAME,
        }),
    });

    if (status === 200 && data?.data?.token) {
        ok(`Admin registered: ${ADMIN_EMAIL}`);
        return data.data.token;
    }

    // If admin already exists, the endpoint returns an error
    if (status === 400) {
        info('Admin already exists, logging in...');
        return null;
    }

    fail(`Failed to register admin (${status}): ${JSON.stringify(data)}`);
}

async function loginAdmin() {
    info('Logging in as admin...');
    const { status, data } = await api('/admin/login', {
        method: 'POST',
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
        }),
    });

    if (status === 200 && data?.data?.token) {
        ok('Admin login successful.');
        return data.data.token;
    }

    fail(`Admin login failed (${status}): ${JSON.stringify(data)}`);
}

async function setupPermissions(adminJwt) {
    info('Fetching users-permissions roles...');

    const { status, data } = await api('/users-permissions/roles', {
        headers: authHeaders(adminJwt),
    });

    if (!data?.roles) {
        fail(`Could not fetch roles (${status}): ${JSON.stringify(data)}`);
    }

    const authRole = data.roles.find(r => r.type === 'authenticated');
    const publicRole = data.roles.find(r => r.type === 'public');

    if (!authRole) fail('Authenticated role not found!');
    info(`Found Authenticated role (ID: ${authRole.id})`);

    // Define the permissions we want
    const permissions = {
        'api::booster': { controllers: { booster: ['openBooster'] } },
        'api::card': { controllers: { card: ['find', 'findOne'] } },
        'api::deck': { controllers: { deck: ['find', 'findOne', 'create', 'update', 'delete'] } },
        'api::user-card': { controllers: { 'user-card': ['find', 'findOne', 'create', 'update', 'delete'] } },
        'api::game-config': { controllers: { 'game-config': ['find'] } },
        'api::match': { controllers: { match: ['find', 'findOne', 'create', 'update'] } },
        'plugin::users-permissions': {
            controllers: {
                user: ['me', 'find', 'findOne'],
                role: ['find', 'findOne'],
                auth: ['callback', 'register', 'connect'],
            }
        },
    };

    // Update Authenticated role
    await updateRolePermissions(adminJwt, authRole, permissions, 'Authenticated');

    // Also set public role with limited permissions
    if (publicRole) {
        const publicPerms = {
            'api::card': { controllers: { card: ['find', 'findOne'] } },
            'api::match': { controllers: { match: ['find', 'findOne', 'create', 'update'] } },
            'plugin::users-permissions': {
                controllers: {
                    auth: ['callback', 'register', 'connect'],
                }
            },
        };
        await updateRolePermissions(adminJwt, publicRole, publicPerms, 'Public');
    }
}

async function updateRolePermissions(adminJwt, role, permissions, roleName) {
    // First, get the full role details including current permissions
    const { status, data } = await api(`/users-permissions/roles/${role.id}`, {
        headers: authHeaders(adminJwt),
    });

    if (status !== 200) {
        fail(`Could not fetch role details for ${roleName} (${status}): ${JSON.stringify(data)}`);
    }

    // Merge our desired permissions with existing ones
    const existingPermissions = data?.role?.permissions || {};
    const mergedPermissions = { ...existingPermissions };

    for (const [pluginKey, pluginValue] of Object.entries(permissions)) {
        if (!mergedPermissions[pluginKey]) {
            mergedPermissions[pluginKey] = { controllers: {} };
        }
        for (const [controllerKey, actions] of Object.entries(pluginValue.controllers)) {
            if (!mergedPermissions[pluginKey].controllers[controllerKey]) {
                mergedPermissions[pluginKey].controllers[controllerKey] = {};
            }
            for (const action of actions) {
                mergedPermissions[pluginKey].controllers[controllerKey][action] = { enabled: true };
            }
        }
    }

    // Update the role with merged permissions
    const updateRes = await api(`/users-permissions/roles/${role.id}`, {
        method: 'PUT',
        headers: authHeaders(adminJwt),
        body: JSON.stringify({
            permissions: mergedPermissions,
        }),
    });

    if (updateRes.ok) {
        ok(`${roleName} role permissions updated successfully.`);
    } else {
        warn(`Failed to update ${roleName} permissions (${updateRes.status}): ${JSON.stringify(updateRes.data)}`);
    }
}

async function createApiUser(adminJwt) {
    info(`Setting up API user: ${API_USER_NAME} (${API_USER_EMAIL})...`);

    // Check if user already exists (search by username which is most likely to conflict)
    const { data } = await api(`/content-manager/collection-types/plugin::users-permissions.user?filters[username][$eq]=${encodeURIComponent(API_USER_NAME)}`, {
        headers: authHeaders(adminJwt),
    });
 
    if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
        ok(`API user already exists: ${API_USER_NAME} (ID: ${data.results[0].id})`);
        return;
    }

    // Get the Authenticated role ID
    const rolesRes = await api('/users-permissions/roles', {
        headers: authHeaders(adminJwt),
    });
    const authRole = rolesRes.data?.roles?.find(r => r.type === 'authenticated');
    const authRoleId = authRole?.id;
 
    if (!authRoleId) {
        fail('Could not find Authenticated role ID for user creation.');
    }

    // Create the user via content-manager API
    const createRes = await api('/content-manager/collection-types/plugin::users-permissions.user', {
        method: 'POST',
        headers: authHeaders(adminJwt),
        body: JSON.stringify({
            username: API_USER_NAME,
            email: API_USER_EMAIL,
            password: API_USER_PASSWORD,
            role: authRoleId,
            confirmed: true,
            blocked: false,
        }),
    });
 
    if (createRes.ok) {
        ok(`API user created: ${API_USER_NAME}`);
    } else {
        warn(`Could not create API user (${createRes.status}): ${JSON.stringify(createRes.data)}`);
    }
}

async function setupGameConfig(adminJwt) {
    info('Setting up Game Config...');

    // Check if game-config already exists
    const { status, data } = await api('/content-manager/single-types/api::game-config.game-config', {
        headers: authHeaders(adminJwt),
    });

    if (status === 200 && data) {
        ok('Game Config already exists.');
        return;
    }

    // Default configuration (matching schema defaults)
    const defaultConfig = {
        cardsPerDeck: 15,
        maxDecksPerUser: 5,
        turnTimeSeconds: 60,
        maxQuestsPerUser: 5,
        playableLimit: 2,
        craftingRatios: {
            common: { disenchant: 10, craft: 40 },
            uncommon: { disenchant: 20, craft: 80 },
            rare: { disenchant: 50, craft: 200 },
            epic: { disenchant: 100, craft: 400 },
            legendary: { disenchant: 400, craft: 1600 }
        },
        boosterCost: 100,
        boosterHits: 5,
        probCommon: 39,
        probUncommon: 30,
        probRare: 20,
        probEpic: 10,
        probLegendary: 1,
        probPremium: 5,
        colorPrimary: '#FFBF00',
        colorSecondary: '#0033ff',
        colorAccent: '#FFFF00',
        uiButtonHole: 30,
        uiButtonSpeed: 1.0,
        uiButtonOpacity: 0.25,
        storyUnlockPrice: 500
    };

    const createRes = await api('/content-manager/single-types/api::game-config.game-config', {
        method: 'PUT', // Single types use PUT to create/update
        headers: authHeaders(adminJwt),
        body: JSON.stringify(defaultConfig),
    });

    if (createRes.ok) {
        ok('Game Config initialized successfully.');
    } else {
        warn(`Failed to initialize Game Config (${createRes.status}): ${JSON.stringify(createRes.data)}`);
    }
}


// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Terra Nullius — Strapi Setup Script    ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');

    // Step 1: Wait for Strapi
    const initData = await waitForStrapi();

    // Step 2: Register or login admin
    let adminJwt;
    if (!initData.hasAdmin) {
        adminJwt = await registerAdmin();
    }
    if (!adminJwt) {
        adminJwt = await loginAdmin();
    }

    // Step 3: Setup permissions
    await setupPermissions(adminJwt);

    // Step 4: Create API user
    await createApiUser(adminJwt);

    // Step 5: Setup Game Config
    await setupGameConfig(adminJwt);

    // Done!

    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   ✅ Setup complete!                     ║');
    console.log('║                                          ║');
    console.log(`║   Admin:  ${ADMIN_EMAIL.padEnd(29)}║`);
    console.log(`║   API User: ${API_USER_NAME.padEnd(27)}║`);
    console.log('║                                          ║');
    console.log('║   Run tests: npm run test:api --prefix front ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
}

main().catch(err => {
    console.error('');
    fail(`Unexpected error: ${err.message}`);
});
