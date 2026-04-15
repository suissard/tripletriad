#!/usr/bin/env node

/**
 * migrate-to-postgres.mjs — Version 2
 * 
 * Stratégie : injection directe dans PostgreSQL via Knex (dans le conteneur Strapi),
 * puis restauration des données business via l'API admin/Content Manager.
 * 
 * Étape 1 : Script Node.js exécuté DANS le conteneur pour injecter les uploads + users
 * Étape 2 : Script côté host pour les collections business via API
 * 
 * Usage :
 *   node scripts/migrate-to-postgres.mjs --input backups/strapi-backup-2026-04-14T20-06-33
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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
    } catch (e) { /* ignore */ }
    return env;
}

const env = loadEnv();
const STRAPI_URL = `http://127.0.0.1:${env.STRAPI_PORT || 1340}`;
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
const UPLOADS_DIR = resolve(ROOT, 'back/strapi_data/uploads');

const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
if (inputIdx === -1 || !args[inputIdx + 1]) {
    console.error('❌ Usage : node scripts/migrate-to-postgres.mjs --input <backup-dir>');
    process.exit(1);
}
const INPUT_DIR = resolve(args[inputIdx + 1]);
if (!existsSync(INPUT_DIR)) {
    console.error(`❌ Dossier introuvable : ${INPUT_DIR}`);
    process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const ok = (msg) => log('✅', msg);
const info = (msg) => log('ℹ️ ', msg);
const warn = (msg) => log('⚠️', msg);
const fail = (msg) => { log('❌', msg); process.exit(1); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function readJSON(filePath) {
    try { return JSON.parse(readFileSync(filePath, 'utf-8')); }
    catch (e) { return null; }
}

async function api(path, options = {}) {
    const url = `${STRAPI_URL}${path}`;
    try {
        const res = await fetch(url, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers },
        });
        const data = await res.json().catch(() => null);
        return { status: res.status, ok: res.ok, data };
    } catch (e) {
        return { status: 0, ok: false, data: null, error: e.message };
    }
}

function authHeaders(jwt) { return { Authorization: `Bearer ${jwt}` }; }

async function getAdminToken() {
    const { ok: isOk, data } = await api('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (isOk && data?.data?.token) return data.data.token;
    fail(`Auth admin échouée: ${JSON.stringify(data)}`);
}

// ─── Phase 1 : Injection directe des uploads + users dans PostgreSQL ──────────

function generateKnexScript() {
    const uploads = readJSON(join(INPUT_DIR, 'config', 'upload-metadata.json')) || [];
    const users = readJSON(join(INPUT_DIR, 'config', 'users.json')) || [];

    // Generate a Node.js script that uses pg directly to inject data
    const script = `
const { Client } = require('pg');

async function main() {
    const client = new Client({
        host: process.env.DATABASE_HOST || 'terra-nullius-db',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME || 'strapi',
        user: process.env.DATABASE_USERNAME || 'strapi',
        password: process.env.DATABASE_PASSWORD || 'strapi',
    });

    await client.connect();
    console.log('✅ Connecté à PostgreSQL');

    // ── Upload Files ──
    const uploads = ${JSON.stringify(uploads)};

    console.log('ℹ️  Insertion de ' + uploads.length + ' fichiers upload...');
    let uploadOk = 0, uploadErr = 0;

    for (const f of uploads) {
        try {
            // Check if already exists by document_id
            const check = await client.query('SELECT id FROM files WHERE document_id = $1', [f.documentId]);
            if (check.rows.length > 0) { uploadOk++; continue; }

            await client.query(\`
                INSERT INTO files (document_id, name, alternative_text, caption, width, height, formats, hash, ext, mime, size, url, preview_url, provider, provider_metadata, folder_path, created_at, updated_at, published_at, locale)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            \`, [
                f.documentId,
                f.name,
                f.alternativeText,
                f.caption,
                f.width,
                f.height,
                JSON.stringify(f.formats),
                f.hash,
                f.ext,
                f.mime,
                f.size,
                f.url,
                f.previewUrl,
                f.provider || 'local',
                f.provider_metadata ? JSON.stringify(f.provider_metadata) : null,
                f.folderPath || '/',
                f.createdAt,
                f.updatedAt,
                f.publishedAt,
                f.locale,
            ]);
            uploadOk++;
        } catch (e) {
            uploadErr++;
            if (uploadErr <= 3) console.error('  ⚠️ Upload err:', f.name, e.message);
        }
    }
    console.log('✅ Uploads: ' + uploadOk + ' insérés, ' + uploadErr + ' erreurs');

    // ── Users ──
    const users = ${JSON.stringify(users.map(u => ({
        documentId: u.documentId,
        username: u.username,
        email: u.email,
        confirmed: u.confirmed,
        blocked: u.blocked,
        coins: u.coins,
        dust: u.dust,
        premiumMode: u.premiumMode,
        holoFineness: u.holoFineness,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        publishedAt: u.publishedAt,
        roleType: u.role?.type || 'authenticated',
    })))};

    console.log('ℹ️  Insertion de ' + users.length + ' utilisateurs...');
    let userOk = 0, userErr = 0;

    // Get role IDs
    const rolesRes = await client.query("SELECT id, type FROM up_roles");
    const roleIdByType = {};
    for (const r of rolesRes.rows) roleIdByType[r.type] = r.id;

    for (const u of users) {
        try {
            const check = await client.query('SELECT id FROM up_users WHERE document_id = $1 OR email = $2', [u.documentId, u.email]);
            if (check.rows.length > 0) { userOk++; continue; }

            const roleId = roleIdByType[u.roleType] || roleIdByType['authenticated'];

            // Insert user with a placeholder password hash (bcrypt)
            const placeholderHash = '$2a$10$placeholder000000000000000000000000000000000000000';

            const result = await client.query(\`
                INSERT INTO up_users (document_id, username, email, password, confirmed, blocked, coins, dust, premium_mode, holo_fineness, created_at, updated_at, published_at, locale, provider)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id
            \`, [
                u.documentId,
                u.username,
                u.email,
                placeholderHash,
                u.confirmed !== false,
                u.blocked || false,
                u.coins || 100,
                u.dust || 0,
                u.premiumMode || 'random',
                u.holoFineness || 0.05,
                u.createdAt,
                u.updatedAt,
                u.publishedAt,
                null,
                'local',
            ]);

            // Set role via the join table
            if (result.rows[0]?.id && roleId) {
                await client.query('INSERT INTO up_users_role_lnk (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [result.rows[0].id, roleId]);
            }

            userOk++;
        } catch (e) {
            userErr++;
            if (userErr <= 3) console.error('  ⚠️ User err:', u.username, e.message);
        }
    }
    console.log('✅ Users: ' + userOk + ' insérés, ' + userErr + ' erreurs');

    await client.end();
    console.log('✅ Terminé.');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
`;

    return script;
}

// ─── Phase 2 : Collections via API ────────────────────────────────────────────

async function migrateCollection(token, uid, label, entries, options = {}) {
    const { skipRelations = [] } = options;

    if (!entries || entries.length === 0) {
        info(`  ${label}: aucune entrée.`);
        return 0;
    }

    let created = 0, updated = 0, errors = 0;

    for (const entry of entries) {
        const cleanEntry = { ...entry };
        delete cleanEntry.id;
        delete cleanEntry.createdAt;
        delete cleanEntry.updatedAt;
        delete cleanEntry.publishedAt;
        delete cleanEntry.createdBy;
        delete cleanEntry.updatedBy;
        delete cleanEntry.locale;
        delete cleanEntry.localizations;
        delete cleanEntry.status;

        // Handle relations
        for (const [key, value] of Object.entries(cleanEntry)) {
            if (skipRelations.includes(key)) { delete cleanEntry[key]; continue; }

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (value.documentId) {
                    // Single relation → use documentId directly (entities should exist now)
                    cleanEntry[key] = value.documentId;
                } else if (value.id) {
                    delete cleanEntry[key];
                }
            } else if (Array.isArray(value) && value.length > 0) {
                if (value[0]?.documentId) {
                    cleanEntry[key] = value.map(v => v.documentId);
                } else if (value[0]?.id && typeof value[0] === 'object' && !value[0]?.documentId) {
                    // Keep component-like arrays (boosters, etc.), remove pure relations
                    if (value[0]?.type || value[0]?.collection || value[0]?.situationId || value[0]?.action) {
                        // This looks like a component - keep as-is
                    } else {
                        delete cleanEntry[key];
                    }
                }
            }
        }

        // Check if already exists
        if (entry.documentId) {
            const checkRes = await api(
                `/content-manager/collection-types/${uid}/${entry.documentId}`,
                { headers: authHeaders(token) }
            );
            if (checkRes.ok) { updated++; continue; }
        }

        const createRes = await api(`/content-manager/collection-types/${uid}`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify(cleanEntry),
        });

        if (createRes.ok) {
            created++;
        } else {
            errors++;
            const name = cleanEntry.name || cleanEntry.title || 'entrée';
            if (errors <= 5) {
                warn(`    Échec "${name}": ${createRes.status} - ${JSON.stringify(createRes.data?.error?.message || '').slice(0, 200)}`);
            }
        }
        await sleep(30);
    }

    if (errors > 5) warn(`    ... et ${errors - 5} autres erreurs`);
    ok(`  ${label}: ${created} créées, ${updated} existantes, ${errors} erreurs`);
    return created;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   Terra Nullius — Migration SQLite → PostgreSQL (v2)        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    const manifest = readJSON(join(INPUT_DIR, 'manifest.json'));
    if (!manifest) fail('manifest.json introuvable.');

    info(`Source : ${manifest.databaseClient} | ${manifest.totalCollections} collections | ${manifest.totalUsers} users | ${manifest.totalUploadFiles} uploads`);

    // Verify Strapi
    info(`Vérification de Strapi sur ${STRAPI_URL}...`);
    try {
        const check = await fetch(`${STRAPI_URL}/admin/init`);
        if (!check.ok) throw new Error(`Status ${check.status}`);
        ok('Strapi accessible.');
    } catch (e) { fail(`Strapi inaccessible : ${e.message}`); }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1 : Injection directe dans PostgreSQL (uploads + users)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    info('PHASE 1 : Injection directe PostgreSQL (uploads + users)');
    console.log('═'.repeat(60));

    info('Génération du script d\'injection...');
    const knexScript = generateKnexScript();
    const scriptPath = resolve(ROOT, 'scripts', '_tmp_pg_inject.cjs');
    writeFileSync(scriptPath, knexScript, 'utf-8');
    ok('Script généré.');

    info('Copie du script dans le conteneur Strapi...');
    try {
        execSync(`docker cp "${scriptPath}" terra-nullius-strapi:/opt/app/_tmp_pg_inject.cjs`, { stdio: 'pipe' });
        ok('Script copié.');
    } catch (e) { fail(`Impossible de copier le script : ${e.message}`); }

    info('Exécution dans le conteneur...');
    try {
        const output = execSync(
            'docker.compose exec -T terra-nullius-strapi node /opt/app/_tmp_pg_inject.cjs',
            { cwd: ROOT, encoding: 'utf-8', timeout: 120000 }
        );
        console.log(output);
    } catch (e) {
        warn(`Script pg : ${e.message}`);
        if (e.stdout) console.log(e.stdout);
        if (e.stderr) console.error(e.stderr);
    }

    // Cleanup
    try { execSync('docker.compose exec -T terra-nullius-strapi rm -f /opt/app/_tmp_pg_inject.cjs', { cwd: ROOT, stdio: 'pipe' }); } catch (e) { /* ignore */ }
    try { execSync(`rm -f "${scriptPath}"`, { stdio: 'pipe' }); } catch (e) { /* ignore */ }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2 : Collections via API admin
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    info('PHASE 2 : Import des Collections via API (ordre de dépendance)');
    console.log('═'.repeat(60));

    const token = await getAdminToken();

    // Collections dans l'ordre de dépendance
    const collectionOrder = [
        { uid: 'api::card.card', file: 'api__card.card.json', label: 'Card', skipRelations: ['storiesRewardedFrom'] },
        { uid: 'api::foil-effect.foil-effect', file: 'api__foil-effect.foil-effect.json', label: 'FoilEffect' },
        { uid: 'api::story.story', file: 'api__story.story.json', label: 'Story' },
        { uid: 'api::story-step.story-step', file: 'api__story-step.story-step.json', label: 'Story Step' },
        { uid: 'api::quest-template.quest-template', file: 'api__quest-template.quest-template.json', label: 'Quest Template' },
        { uid: 'api::wallet.wallet', file: 'api__wallet.wallet.json', label: 'Wallet' },
        { uid: 'api::deck.deck', file: 'api__deck.deck.json', label: 'Deck' },
        { uid: 'api::user-card.user-card', file: 'api__user-card.user-card.json', label: 'User Card' },
        { uid: 'api::match.match', file: 'api__match.match.json', label: 'Match' },
        { uid: 'api::player-quest.player-quest', file: 'api__player-quest.player-quest.json', label: 'Player Quest' },
        { uid: 'api::player-event-log.player-event-log', file: 'api__player-event-log.player-event-log.json', label: 'Player Event Log' },
        { uid: 'api::player-story-progress.player-story-progress', file: 'api__player-story-progress.player-story-progress.json', label: 'Player Story Progress' },
        { uid: 'api::board-background.board-background', file: 'api__board-background.board-background.json', label: 'Board Background' },
        { uid: 'api::game-history.game-history', file: 'api__game-history.game-history.json', label: 'Game History' },
        { uid: 'api::weekly-quest-progress.weekly-quest-progress', file: 'api__weekly-quest-progress.weekly-quest-progress.json', label: 'Weekly Quest Progress' },
    ];

    for (const col of collectionOrder) {
        const data = readJSON(join(INPUT_DIR, 'data', col.file));
        await migrateCollection(token, col.uid, col.label, data?.entries, {
            skipRelations: col.skipRelations || [],
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3 : Single Types
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    info('PHASE 3 : Import des Single-Types');
    console.log('═'.repeat(60));

    for (const st of manifest.singleTypes || []) {
        const safeName = st.uid.replace(/::/g, '__');
        const backupData = readJSON(join(INPUT_DIR, 'data', `${safeName}.json`));
        if (!backupData?.entry) { warn(`  ${st.label}: pas de données.`); continue; }

        const cleanEntry = { ...backupData.entry };
        delete cleanEntry.id; delete cleanEntry.createdAt; delete cleanEntry.updatedAt;
        delete cleanEntry.publishedAt; delete cleanEntry.createdBy; delete cleanEntry.updatedBy;
        delete cleanEntry.documentId;

        const res = await api(`/content-manager/single-types/${st.uid}`, {
            method: 'PUT', headers: authHeaders(token),
            body: JSON.stringify(cleanEntry),
        });
        if (res.ok) ok(`  ${st.label}: restauré.`);
        else warn(`  ${st.label}: échec (${res.status}).`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 4 : Permissions
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    info('PHASE 4 : Restauration des Permissions');
    console.log('═'.repeat(60));

    const savedRoles = readJSON(join(INPUT_DIR, 'config', 'roles-permissions.json'));
    if (savedRoles && savedRoles.length > 0) {
        let apiJwt = null;
        try {
            const authRes = await api('/api/auth/local', {
                method: 'POST',
                body: JSON.stringify({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
            });
            if (authRes.ok) apiJwt = authRes.data?.jwt;
        } catch (e) { /* ignore */ }

        if (apiJwt) {
            const rolesRes = await api('/api/users-permissions/roles', { headers: authHeaders(apiJwt) });
            const currentRoles = rolesRes.data?.roles || [];
            for (const sr of savedRoles) {
                const cr = currentRoles.find(r => r.type === sr.type);
                if (!cr) continue;
                const ur = await api(`/api/users-permissions/roles/${cr.id}`, {
                    method: 'PUT', headers: authHeaders(apiJwt),
                    body: JSON.stringify({ permissions: sr.permissions }),
                });
                if (ur.ok) ok(`  Rôle "${sr.type}": permissions restaurées.`);
                else warn(`  Rôle "${sr.type}": échec (${ur.status}).`);
            }
        } else {
            warn('JWT API user indisponible — permissions ignorées.');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 5 : Uploads physiques (fichiers sur disque)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    info('PHASE 5 : Restauration des fichiers média physiques');
    console.log('═'.repeat(60));

    const archivePath = join(INPUT_DIR, 'uploads.tar.gz');
    if (existsSync(archivePath)) {
        mkdirSync(UPLOADS_DIR, { recursive: true });
        try {
            execSync(`tar -xzf "${archivePath}" -C "${UPLOADS_DIR}"`, { stdio: 'pipe' });
            ok('Fichiers média restaurés sur le disque.');
        } catch (e) { warn(`Extraction : ${e.message}`); }
    } else {
        info('Pas d\'archive uploads.');
    }

    // Done!
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ Migration terminée !                                    ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║   ⚠️  Les mots de passe ont été réinitialisés.               ║');
    console.log('║   Informez vos utilisateurs.                                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
}

main().catch(err => {
    console.error('');
    fail(`Erreur inattendue : ${err.message}\n${err.stack}`);
});
