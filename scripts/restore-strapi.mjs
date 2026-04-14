#!/usr/bin/env node

/**
 * restore-strapi.mjs
 *
 * Restauration complète des données Strapi depuis une sauvegarde.
 * Réinjecte toutes les collections, single-types, permissions, utilisateurs
 * et fichiers média depuis un dossier de backup créé par backup-strapi.mjs.
 *
 * Usage :
 *   node scripts/restore-strapi.mjs --input ./backups/strapi-backup-2026-04-14T20-45-00
 *   node scripts/restore-strapi.mjs --input ./backups/strapi-backup-2026-04-14T20-45-00 --no-uploads
 *   node scripts/restore-strapi.mjs --input ./backups/strapi-backup-2026-04-14T20-45-00 --skip-permissions
 *   node scripts/restore-strapi.mjs --input ./backups/strapi-backup-2026-04-14T20-45-00 --dry-run
 *
 * Prérequis :
 *   - Strapi doit être démarré (npm run start)
 *   - L'admin doit être enregistré (npm run setup)
 *   - Les content-types doivent exister (même schéma que la source)
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ─── Config ────────────────────────────────────────────────────────────────────

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
    } catch (e) {
        console.error('⚠️  Impossible de lire .env :', e.message);
    }
    return env;
}

const env = loadEnv();
const STRAPI_URL = `http://127.0.0.1:${env.STRAPI_PORT || env.PORT || 1340}`;
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
const UPLOADS_DIR = resolve(ROOT, 'back/strapi_data/uploads');

// Parse CLI args
const args = process.argv.slice(2);
const noUploads = args.includes('--no-uploads');
const skipPermissions = args.includes('--skip-permissions');
const dryRun = args.includes('--dry-run');
const inputIdx = args.indexOf('--input');

if (inputIdx === -1 || !args[inputIdx + 1]) {
    console.error('❌ Usage : node scripts/restore-strapi.mjs --input <backup-dir>');
    process.exit(1);
}

const INPUT_DIR = resolve(args[inputIdx + 1]);

if (!existsSync(INPUT_DIR)) {
    console.error(`❌ Dossier de backup introuvable : ${INPUT_DIR}`);
    process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const ok = (msg) => log('✅', msg);
const info = (msg) => log('ℹ️ ', msg);
const warn = (msg) => log('⚠️', msg);
const fail = (msg) => { log('❌', msg); process.exit(1); };

function readJSON(filePath) {
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
        return null;
    }
}

async function api(path, options = {}) {
    const url = `${STRAPI_URL}${path}`;
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        const data = await res.json().catch(() => null);
        return { status: res.status, ok: res.ok, data };
    } catch (e) {
        return { status: 0, ok: false, data: null, error: e.message };
    }
}

function authHeaders(jwt) {
    return { Authorization: `Bearer ${jwt}` };
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function getAdminToken() {
    info('Authentification admin Strapi...');
    const { status, ok: isOk, data } = await api('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (isOk && data?.data?.token) {
        ok('Authentification réussie.');
        return data.data.token;
    }
    fail(`Échec de l'authentification admin (${status}): ${JSON.stringify(data)}`);
}

// ─── Restore Collections ──────────────────────────────────────────────────────

async function restoreCollection(token, backupData) {
    const { uid, label, entries } = backupData;
    if (!entries || entries.length === 0) {
        info(`  ${label}: aucune entrée à restaurer.`);
        return { created: 0, updated: 0, errors: 0 };
    }

    let created = 0, updated = 0, errors = 0;

    for (const entry of entries) {
        // Clean entry: remove system fields that should be auto-generated
        const cleanEntry = { ...entry };
        delete cleanEntry.id;
        delete cleanEntry.createdAt;
        delete cleanEntry.updatedAt;
        delete cleanEntry.publishedAt;
        delete cleanEntry.createdBy;
        delete cleanEntry.updatedBy;
        delete cleanEntry.locale;
        delete cleanEntry.localizations;

        // Handle relations: convert objects to IDs
        for (const [key, value] of Object.entries(cleanEntry)) {
            if (value && typeof value === 'object' && value.id && !Array.isArray(value)) {
                // Single relation: keep the ID reference
                cleanEntry[key] = value.id;
            } else if (Array.isArray(value) && value.length > 0 && value[0]?.id) {
                // Multi relation: keep ID array
                cleanEntry[key] = value.map(v => v.id);
            }
        }

        if (dryRun) {
            info(`  [DRY-RUN] Créerait : ${cleanEntry.name || cleanEntry.title || entry.documentId || 'entrée'}`);
            created++;
            continue;
        }

        // Check if entry already exists (by documentId if available)
        if (entry.documentId) {
            const checkRes = await api(
                `/content-manager/collection-types/${uid}/${entry.documentId}`,
                { headers: authHeaders(token) }
            );

            if (checkRes.ok) {
                // Update existing
                const updateRes = await api(
                    `/content-manager/collection-types/${uid}/${entry.documentId}`,
                    {
                        method: 'PUT',
                        headers: authHeaders(token),
                        body: JSON.stringify(cleanEntry),
                    }
                );

                if (updateRes.ok) {
                    updated++;
                } else {
                    errors++;
                    warn(`    Échec mise à jour ${entry.documentId}: ${updateRes.status}`);
                }
                continue;
            }
        }

        // Create new entry
        const createRes = await api(
            `/content-manager/collection-types/${uid}`,
            {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify(cleanEntry),
            }
        );

        if (createRes.ok) {
            created++;
        } else {
            errors++;
            const name = cleanEntry.name || cleanEntry.title || 'entrée';
            warn(`    Échec création "${name}": ${createRes.status} - ${JSON.stringify(createRes.data?.error?.message || '')}`);
        }

        // Small delay to avoid overwhelming Strapi
        await sleep(50);
    }

    return { created, updated, errors };
}

async function restoreSingleType(token, backupData) {
    const { uid, label, entry } = backupData;
    if (!entry) {
        info(`  ${label}: aucune donnée à restaurer.`);
        return false;
    }

    const cleanEntry = { ...entry };
    delete cleanEntry.id;
    delete cleanEntry.createdAt;
    delete cleanEntry.updatedAt;
    delete cleanEntry.publishedAt;
    delete cleanEntry.createdBy;
    delete cleanEntry.updatedBy;

    if (dryRun) {
        info(`  [DRY-RUN] Restaurerait single-type : ${label}`);
        return true;
    }

    const res = await api(
        `/content-manager/single-types/${uid}`,
        {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify(cleanEntry),
        }
    );

    return res.ok;
}

// ─── Restore Permissions ──────────────────────────────────────────────────────

async function restorePermissions(token) {
    if (skipPermissions) {
        info('Option --skip-permissions : permissions ignorées.');
        return;
    }

    const rolesFile = join(INPUT_DIR, 'config', 'roles-permissions.json');
    const savedRoles = readJSON(rolesFile);
    if (!savedRoles || savedRoles.length === 0) {
        warn('Aucune permission à restaurer.');
        return;
    }

    info('Restauration des permissions...');

    // Get current roles
    const { data } = await api('/api/users-permissions/roles', {
        headers: authHeaders(token),
    });

    if (!data?.roles) {
        warn('Impossible de récupérer les rôles actuels.');
        return;
    }

    for (const savedRole of savedRoles) {
        const currentRole = data.roles.find(r => r.type === savedRole.type);
        if (!currentRole) {
            warn(`  Rôle "${savedRole.type}" non trouvé, ignoré.`);
            continue;
        }

        if (dryRun) {
            info(`  [DRY-RUN] Restaurerait permissions du rôle : ${savedRole.type}`);
            continue;
        }

        const updateRes = await api(`/api/users-permissions/roles/${currentRole.id}`, {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify({
                permissions: savedRole.permissions,
            }),
        });

        if (updateRes.ok) {
            ok(`  Rôle "${savedRole.type}" : permissions restaurées.`);
        } else {
            warn(`  Échec restauration rôle "${savedRole.type}" (${updateRes.status}).`);
        }
    }
}

// ─── Restore Users ────────────────────────────────────────────────────────────

async function restoreUsers(token) {
    const usersFile = join(INPUT_DIR, 'config', 'users.json');
    const savedUsers = readJSON(usersFile);
    if (!savedUsers || savedUsers.length === 0) {
        info('Aucun utilisateur à restaurer.');
        return;
    }

    info(`Restauration de ${savedUsers.length} utilisateurs...`);

    // Get Authenticated role ID
    const rolesRes = await api('/api/users-permissions/roles', {
        headers: authHeaders(token),
    });
    const authRoleId = rolesRes.data?.roles?.find(r => r.type === 'authenticated')?.id;

    let created = 0, skipped = 0, errors = 0;

    for (const user of savedUsers) {
        // Check if user already exists
        const checkRes = await api(
            `/api/users-permissions/users?filters[email][$eq]=${encodeURIComponent(user.email)}`,
            { headers: authHeaders(token) }
        );

        if (checkRes.data && Array.isArray(checkRes.data) && checkRes.data.length > 0) {
            skipped++;
            continue;
        }

        if (dryRun) {
            info(`  [DRY-RUN] Créerait utilisateur : ${user.username} (${user.email})`);
            created++;
            continue;
        }

        const createRes = await api('/api/users-permissions/users', {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify({
                username: user.username,
                email: user.email,
                password: env.API_USER_PASSWORD || ADMIN_PASSWORD, // Use env password since we can't recover the original
                role: authRoleId,
                confirmed: true,
            }),
        });

        if (createRes.ok) {
            created++;
        } else {
            errors++;
            warn(`  Échec création user "${user.username}": ${createRes.status}`);
        }
    }

    ok(`  Utilisateurs : ${created} créés, ${skipped} existants, ${errors} erreurs.`);
}

// ─── Restore Uploads ──────────────────────────────────────────────────────────

function restoreUploads() {
    if (noUploads) {
        info('Option --no-uploads : fichiers média ignorés.');
        return;
    }

    const archivePath = join(INPUT_DIR, 'uploads.tar.gz');
    if (!existsSync(archivePath)) {
        info('Pas d\'archive uploads dans le backup.');
        return;
    }

    if (dryRun) {
        info('[DRY-RUN] Extrairait les uploads.');
        return;
    }

    info('Restauration des fichiers média...');
    mkdirSync(UPLOADS_DIR, { recursive: true });

    try {
        execSync(`tar -xzf "${archivePath}" -C "${UPLOADS_DIR}"`, { stdio: 'pipe' });
        ok('Fichiers média restaurés.');
    } catch (e) {
        warn(`Erreur lors de la restauration des uploads : ${e.message}`);
    }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Terra Nullius — Strapi Full Restore            ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // Read manifest
    const manifest = readJSON(join(INPUT_DIR, 'manifest.json'));
    if (!manifest) {
        fail('Fichier manifest.json introuvable dans le dossier de backup.');
    }

    info(`Backup du ${manifest.createdAt}`);
    info(`Source : ${manifest.strapiUrl} (${manifest.databaseClient})`);
    info(`Collections : ${manifest.totalCollections}, Single-Types : ${manifest.totalSingleTypes}`);
    info(`Utilisateurs : ${manifest.totalUsers}, Fichiers : ${manifest.totalUploadFiles}`);

    if (dryRun) {
        warn('MODE DRY-RUN : aucune modification ne sera faite.');
    }

    console.log('');

    // Ensure Strapi is running
    info(`Vérification de Strapi sur ${STRAPI_URL}...`);
    try {
        const check = await fetch(`${STRAPI_URL}/admin/init`);
        if (!check.ok) throw new Error(`Status ${check.status}`);
        ok('Strapi est accessible.');
    } catch (e) {
        fail(`Strapi n'est pas accessible sur ${STRAPI_URL}. Lancez d'abord : npm run start`);
    }

    // Auth
    const token = await getAdminToken();

    const stats = {
        collections: { created: 0, updated: 0, errors: 0 },
        singleTypes: { success: 0, errors: 0 },
    };

    // ── 1. Restore Collections ──
    console.log('');
    info('═══ Restauration des Collections ═══');

    for (const ct of manifest.collections) {
        const safeName = ct.uid.replace(/::/g, '__');
        const backupFile = join(INPUT_DIR, 'data', `${safeName}.json`);
        const backupData = readJSON(backupFile);

        if (!backupData) {
            warn(`  ${ct.label}: fichier de backup introuvable, ignoré.`);
            continue;
        }

        info(`  ${ct.label} (${ct.count} entrées)...`);
        const result = await restoreCollection(token, backupData);
        stats.collections.created += result.created;
        stats.collections.updated += result.updated;
        stats.collections.errors += result.errors;
        ok(`    → ${result.created} créées, ${result.updated} mises à jour, ${result.errors} erreurs`);
    }

    // ── 2. Restore Single-Types ──
    console.log('');
    info('═══ Restauration des Single-Types ═══');

    for (const st of manifest.singleTypes) {
        const safeName = st.uid.replace(/::/g, '__');
        const backupFile = join(INPUT_DIR, 'data', `${safeName}.json`);
        const backupData = readJSON(backupFile);

        if (!backupData) {
            warn(`  ${st.label}: fichier introuvable, ignoré.`);
            continue;
        }

        const success = await restoreSingleType(token, backupData);
        if (success) {
            ok(`  ${st.label}: restauré.`);
            stats.singleTypes.success++;
        } else {
            warn(`  ${st.label}: échec.`);
            stats.singleTypes.errors++;
        }
    }

    // ── 3. Restore Permissions ──
    console.log('');
    info('═══ Restauration des Permissions ═══');
    await restorePermissions(token);

    // ── 4. Restore Users ──
    console.log('');
    info('═══ Restauration des Utilisateurs ═══');
    await restoreUsers(token);

    // ── 5. Restore Uploads ──
    console.log('');
    info('═══ Restauration des Uploads ═══');
    restoreUploads();

    // Done!
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   ✅ Restauration terminée !                     ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║   📊 Entrées créées   : ${String(stats.collections.created).padEnd(24)}║`);
    console.log(`║   🔄 Entrées maj.     : ${String(stats.collections.updated).padEnd(24)}║`);
    console.log(`║   ❌ Erreurs           : ${String(stats.collections.errors).padEnd(24)}║`);
    console.log(`║   📄 Single-types     : ${String(stats.singleTypes.success).padEnd(24)}║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║                                                  ║');
    console.log('║   ⚠️  Les mots de passe utilisateur sont          ║');
    console.log('║      réinitialisés. Informez vos utilisateurs.   ║');
    console.log('║                                                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
}

main().catch(err => {
    console.error('');
    fail(`Erreur inattendue : ${err.message}`);
});
