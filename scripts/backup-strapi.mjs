#!/usr/bin/env node

/**
 * backup-strapi.mjs
 *
 * Sauvegarde complète de l'intégralité des données et réglages Strapi.
 * Exporte toutes les collections, single-types, composants, permissions,
 * utilisateurs, fichiers uploadés et config admin via l'API Content Manager.
 *
 * Le résultat est un dossier horodaté contenant :
 *   - manifest.json          : métadonnées de la sauvegarde
 *   - data/                  : un fichier JSON par collection
 *   - config/                : permissions, rôles, tokens, etc.
 *   - uploads.tar.gz         : archive des fichiers média (si présents)
 *
 * Usage :
 *   node scripts/backup-strapi.mjs                   # backup standard
 *   node scripts/backup-strapi.mjs --output ./my-dir  # dossier personnalisé
 *   node scripts/backup-strapi.mjs --no-uploads       # sans les fichiers média
 *
 * Prérequis : Strapi doit être démarré (npm run start).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join, basename } from 'path';
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
const outputIdx = args.indexOf('--output');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUTPUT_DIR = outputIdx !== -1 && args[outputIdx + 1]
    ? resolve(args[outputIdx + 1])
    : resolve(ROOT, `backups/strapi-backup-${timestamp}`);

// ─── Helpers ───────────────────────────────────────────────────────────────────

const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const ok = (msg) => log('✅', msg);
const info = (msg) => log('ℹ️ ', msg);
const warn = (msg) => log('⚠️', msg);
const fail = (msg) => { log('❌', msg); process.exit(1); };

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

function writeJSON(filePath, data) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
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

// ─── Content Type Discovery ────────────────────────────────────────────────────

async function discoverContentTypes(token) {
    info('Découverte des content-types...');

    const { data } = await api('/content-manager/content-types', {
        headers: authHeaders(token),
    });

    if (!data?.data) {
        fail('Impossible de récupérer les content-types.');
    }

    const collections = [];
    const singleTypes = [];

    // Plugin UIDs inaccessibles via Content Manager (internes Strapi)
    const SKIP_UIDS = new Set([
        'plugin::upload.file',
        'plugin::upload.folder',
        'plugin::i18n.locale',
        'plugin::content-releases.release',
        'plugin::content-releases.release-action',
        'plugin::review-workflows.workflow',
        'plugin::review-workflows.workflow-stage',
        'plugin::users-permissions.permission',
        'plugin::users-permissions.role',
    ]);

    for (const ct of data.data) {
        // Ignore les types internes de Strapi (admin, uploads gérés séparément)
        if (ct.uid.startsWith('admin::')) continue;
        if (SKIP_UIDS.has(ct.uid)) continue;

        if (ct.kind === 'collectionType') {
            collections.push(ct);
        } else if (ct.kind === 'singleType') {
            singleTypes.push(ct);
        }
    }

    ok(`Trouvé ${collections.length} collections et ${singleTypes.length} single-types.`);
    return { collections, singleTypes };
}

// ─── Data Export ───────────────────────────────────────────────────────────────

async function exportCollection(token, ct) {
    const uid = ct.uid;
    const label = ct.info?.displayName || uid;
    let allResults = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
        const { data, ok: isOk } = await api(
            `/content-manager/collection-types/${uid}?page=${page}&pageSize=${pageSize}&populate=*`,
            { headers: authHeaders(token) }
        );

        if (!isOk || !data?.results) {
            if (page === 1) {
                warn(`  Impossible de lire ${label} (${uid}), ignoré.`);
                return null;
            }
            break;
        }

        allResults = allResults.concat(data.results);

        if (page >= (data.pagination?.pageCount || 1)) break;
        page++;
    }

    return { uid, label, count: allResults.length, entries: allResults };
}

async function exportSingleType(token, ct) {
    const uid = ct.uid;
    const label = ct.info?.displayName || uid;

    const { data, ok: isOk, status } = await api(
        `/content-manager/single-types/${uid}?populate=*`,
        { headers: authHeaders(token) }
    );

    if (!isOk || !data) {
        if (status === 404) {
            info(`  ${label} (${uid}) : pas encore créé, ignoré.`);
        } else {
            warn(`  Impossible de lire ${label} (${uid}), ignoré. (HTTP ${status})`);
        }
        return null;
    }

    return { uid, label, entry: data };
}

// ─── Config Export ─────────────────────────────────────────────────────────────

async function exportPermissions(token) {
    info('Export des permissions et rôles...');

    // En Strapi 5, le token admin n'est pas accepté par /api/users-permissions/roles.
    // On utilise l'endpoint Content Manager pour les users-permissions roles,
    // ou on passe par l'API user auth.

    // Stratégie 1 : Essayer via API user auth (identifiants du .env)
    const API_USER_EMAIL = env.API_USER_EMAIL || env.ADMIN_EMAIL;
    const API_USER_PASSWORD = env.API_USER_PASSWORD || env.ADMIN_PASSWORD;

    let apiJwt = null;
    try {
        const authRes = await api('/api/auth/local', {
            method: 'POST',
            body: JSON.stringify({
                identifier: API_USER_EMAIL,
                password: API_USER_PASSWORD,
            }),
        });
        if (authRes.ok && authRes.data?.jwt) {
            apiJwt = authRes.data.jwt;
        }
    } catch (e) { /* ignore */ }

    const rolesDetailed = [];

    if (apiJwt) {
        // Utiliser le JWT API user pour accéder aux roles 
        const rolesRes = await api('/api/users-permissions/roles', {
            headers: authHeaders(apiJwt),
        });

        const roles = rolesRes.data?.roles || [];

        for (const role of roles) {
            const detailRes = await api(`/api/users-permissions/roles/${role.id}`, {
                headers: authHeaders(apiJwt),
            });
            if (detailRes.ok && detailRes.data?.role) {
                rolesDetailed.push(detailRes.data.role);
            }
        }
    }

    if (rolesDetailed.length === 0) {
        // Fallback : utiliser l'endpoint admin /admin/content-manager
        // pour lire les rôles via le Content Manager (plugin::users-permissions.role)
        info('  Fallback : lecture des rôles via Content Manager...');
        const cmRes = await api('/content-manager/collection-types/plugin::users-permissions.role?page=1&pageSize=100&populate=*', {
            headers: authHeaders(token),
        });
        if (cmRes.ok && cmRes.data?.results) {
            for (const role of cmRes.data.results) {
                rolesDetailed.push(role);
            }
        }
    }

    ok(`  ${rolesDetailed.length} rôles exportés avec permissions.`);
    return rolesDetailed;
}

async function exportUsers(token) {
    info('Export des utilisateurs (users-permissions)...');

    let allUsers = [];
    let page = 1;

    while (true) {
        const { data, ok: isOk } = await api(
            `/content-manager/collection-types/plugin::users-permissions.user?page=${page}&pageSize=100&populate=*`,
            { headers: authHeaders(token) }
        );

        if (!isOk || !data?.results) break;

        allUsers = allUsers.concat(data.results);
        if (page >= (data.pagination?.pageCount || 1)) break;
        page++;
    }

    ok(`  ${allUsers.length} utilisateurs exportés.`);
    return allUsers;
}

async function exportUploadMetadata(token) {
    info('Export des métadonnées des fichiers uploadés...');

    let allFiles = [];
    let page = 1;
    const pageSize = 100;

    // L'endpoint correct pour les uploads en Strapi 5 est /upload/files (admin API)
    while (true) {
        const { data, ok: isOk } = await api(
            `/upload/files?page=${page}&pageSize=${pageSize}`,
            { headers: authHeaders(token) }
        );

        if (!isOk) break;

        // Strapi 5 retourne { results: [...], pagination: {...} }
        const results = data?.results || (Array.isArray(data) ? data : []);
        if (results.length === 0) break;

        allFiles = allFiles.concat(results);

        const pageCount = data?.pagination?.pageCount || Math.ceil((data?.pagination?.total || results.length) / pageSize);
        if (page >= pageCount) break;
        page++;
    }

    ok(`  ${allFiles.length} fichiers média indexés.`);
    return allFiles;
}

async function exportAdminRoles(token) {
    info('Export des rôles admin...');

    const { data, ok: isOk } = await api('/admin/roles', {
        headers: authHeaders(token),
    });

    if (isOk && data?.data) {
        ok(`  ${data.data.length} rôles admin exportés.`);
        return data.data;
    }
    warn('  Impossible d\'exporter les rôles admin.');
    return [];
}

// ─── Uploads Archive ──────────────────────────────────────────────────────────

function archiveUploads() {
    if (noUploads) {
        info('Option --no-uploads : les fichiers média ne sont pas archivés.');
        return false;
    }

    if (!existsSync(UPLOADS_DIR)) {
        warn('Dossier uploads introuvable, pas d\'archive média.');
        return false;
    }

    const files = readdirSync(UPLOADS_DIR);
    if (files.length === 0) {
        info('Dossier uploads vide, pas d\'archive média.');
        return false;
    }

    info(`Archivage de ${files.length} fichiers média...`);
    const archivePath = join(OUTPUT_DIR, 'uploads.tar.gz');

    try {
        execSync(`tar -czf "${archivePath}" -C "${UPLOADS_DIR}" .`, { stdio: 'pipe' });
        const sizeBytes = statSync(archivePath).size;
        const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
        ok(`  Archive uploads créée : ${sizeMB} MB`);
        return true;
    } catch (e) {
        warn(`  Erreur lors de l'archivage : ${e.message}`);
        return false;
    }
}

// ─── Component Schemas ────────────────────────────────────────────────────────

function exportComponentSchemas() {
    info('Export des schémas de composants...');

    const componentsDir = resolve(ROOT, 'back/strapi/src/components');
    const schemas = {};

    if (!existsSync(componentsDir)) {
        warn('Dossier components introuvable.');
        return schemas;
    }

    const categories = readdirSync(componentsDir).filter(f =>
        statSync(join(componentsDir, f)).isDirectory()
    );

    for (const category of categories) {
        const catDir = join(componentsDir, category);
        const files = readdirSync(catDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
            const key = `${category}.${basename(file, '.json')}`;
            try {
                schemas[key] = JSON.parse(readFileSync(join(catDir, file), 'utf-8'));
            } catch (e) {
                warn(`  Erreur lecture composant ${key}: ${e.message}`);
            }
        }
    }

    ok(`  ${Object.keys(schemas).length} schémas de composants exportés.`);
    return schemas;
}

// ─── Content-Type Schemas ─────────────────────────────────────────────────────

function exportContentTypeSchemas() {
    info('Export des schémas de content-types...');

    const apiDir = resolve(ROOT, 'back/strapi/src/api');
    const schemas = {};

    if (!existsSync(apiDir)) {
        warn('Dossier api introuvable.');
        return schemas;
    }

    const apis = readdirSync(apiDir).filter(f =>
        statSync(join(apiDir, f)).isDirectory()
    );

    for (const apiName of apis) {
        const schemaPath = join(apiDir, apiName, 'content-types', apiName, 'schema.json');
        if (existsSync(schemaPath)) {
            try {
                schemas[apiName] = JSON.parse(readFileSync(schemaPath, 'utf-8'));
            } catch (e) {
                warn(`  Erreur lecture schéma ${apiName}: ${e.message}`);
            }
        }
    }

    ok(`  ${Object.keys(schemas).length} schémas de content-types exportés.`);
    return schemas;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Terra Nullius — Strapi Full Backup             ║');
    console.log('╚══════════════════════════════════════════════════╝');
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

    // Create output directory
    mkdirSync(join(OUTPUT_DIR, 'data'), { recursive: true });
    mkdirSync(join(OUTPUT_DIR, 'config'), { recursive: true });
    mkdirSync(join(OUTPUT_DIR, 'schemas'), { recursive: true });

    const manifest = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        strapiUrl: STRAPI_URL,
        databaseClient: env.DATABASE_CLIENT || 'sqlite',
        collections: [],
        singleTypes: [],
        includesUploads: false,
    };

    // ── 1. Discover & export content types ──
    const { collections, singleTypes } = await discoverContentTypes(token);

    console.log('');
    info('═══ Export des Collections ═══');
    for (const ct of collections) {
        const result = await exportCollection(token, ct);
        if (result) {
            const safeName = result.uid.replace(/::/g, '__');
            writeJSON(join(OUTPUT_DIR, 'data', `${safeName}.json`), result);
            manifest.collections.push({
                uid: result.uid,
                label: result.label,
                count: result.count,
            });
            ok(`  ${result.label}: ${result.count} entrées`);
        }
    }

    console.log('');
    info('═══ Export des Single-Types ═══');
    for (const ct of singleTypes) {
        const result = await exportSingleType(token, ct);
        if (result) {
            const safeName = result.uid.replace(/::/g, '__');
            writeJSON(join(OUTPUT_DIR, 'data', `${safeName}.json`), result);
            manifest.singleTypes.push({
                uid: result.uid,
                label: result.label,
            });
            ok(`  ${result.label}`);
        }
    }

    // ── 2. Config ──
    console.log('');
    info('═══ Export de la Configuration ═══');

    const roles = await exportPermissions(token);
    writeJSON(join(OUTPUT_DIR, 'config', 'roles-permissions.json'), roles);

    const users = await exportUsers(token);
    writeJSON(join(OUTPUT_DIR, 'config', 'users.json'), users);

    const uploadMeta = await exportUploadMetadata(token);
    writeJSON(join(OUTPUT_DIR, 'config', 'upload-metadata.json'), uploadMeta);

    const adminRoles = await exportAdminRoles(token);
    writeJSON(join(OUTPUT_DIR, 'config', 'admin-roles.json'), adminRoles);

    // ── 3. Schemas ──
    console.log('');
    info('═══ Export des Schémas ═══');

    const componentSchemas = exportComponentSchemas();
    writeJSON(join(OUTPUT_DIR, 'schemas', 'components.json'), componentSchemas);

    const ctSchemas = exportContentTypeSchemas();
    writeJSON(join(OUTPUT_DIR, 'schemas', 'content-types.json'), ctSchemas);

    // ── 4. Uploads ──
    console.log('');
    info('═══ Archive des Uploads ═══');
    manifest.includesUploads = archiveUploads();

    // ── 5. Environment snapshot ──
    const envSnapshot = { ...env };
    // Redact sensitive values
    for (const key of Object.keys(envSnapshot)) {
        if (key.includes('SECRET') || key.includes('SALT') || key.includes('KEY') || key.includes('PASSWORD')) {
            envSnapshot[key] = '***REDACTED***';
        }
    }
    writeJSON(join(OUTPUT_DIR, 'config', 'env-snapshot.json'), envSnapshot);

    // ── 6. Manifest ──
    manifest.totalCollections = manifest.collections.length;
    manifest.totalSingleTypes = manifest.singleTypes.length;
    manifest.totalUsers = users.length;
    manifest.totalUploadFiles = uploadMeta.length;
    writeJSON(join(OUTPUT_DIR, 'manifest.json'), manifest);

    // Done!
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   ✅ Sauvegarde terminée !                       ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║   📁 Dossier : ${basename(OUTPUT_DIR).padEnd(33)}║`);
    console.log(`║   📊 Collections : ${String(manifest.totalCollections).padEnd(29)}║`);
    console.log(`║   📄 Single-Types : ${String(manifest.totalSingleTypes).padEnd(28)}║`);
    console.log(`║   👥 Utilisateurs : ${String(manifest.totalUsers).padEnd(28)}║`);
    console.log(`║   🖼️  Fichiers média : ${String(manifest.totalUploadFiles).padEnd(26)}║`);
    console.log(`║   📦 Uploads archivés : ${manifest.includesUploads ? 'Oui' : 'Non'.padEnd(24)}║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║                                                  ║');
    console.log('║   Restauration :                                 ║');
    console.log('║   node scripts/restore-strapi.mjs \\              ║');
    console.log(`║     --input ${basename(OUTPUT_DIR).padEnd(36)}║`);
    console.log('║                                                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
}

main().catch(err => {
    console.error('');
    fail(`Erreur inattendue : ${err.message}`);
});
