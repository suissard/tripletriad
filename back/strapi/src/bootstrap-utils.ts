import { Core } from '@strapi/strapi';
import permissions from './permissions.json';
import { generateQuestTemplates } from './api/quest-template/services/quest-template-generator';
import { bootstrapCollections } from './api/collection/services/collection-bootstrap';
import { bootstrapFactions } from './api/faction/services/faction-bootstrap';
import { migrateCardsToFactions } from './api/faction/services/faction-migration';
import { bootstrapDecks } from './api/deck/services/deck-bootstrap';
import { bootstrapStories } from './api/story/services/story-bootstrap';
import { bootstrapWeeklyQuestConfig } from './api/weekly-quest-config/services/weekly-quest-config-bootstrap';
import { bootstrapGameConfig } from './api/game-config/services/game-config-bootstrap';
import { bootstrapGuild } from './api/guild/services/guild-bootstrap';
import { assignQuestsToUser, ensureUserHasWelcomeQuest } from './api/player-quest/services/quest-assignment';

// ---------------------------------------------------------------------------
// Hierarchical Permission Engine
// ---------------------------------------------------------------------------

interface PermissionsConfig {
  _meta: { hierarchy: string[]; description?: string };
  routes: Record<string, string>;
}

/**
 * Resolves the permission hierarchy: for each role, compute the full set of
 * actions it should have (own level + all lower levels).
 *
 * Example with hierarchy ["public", "authenticated"]:
 *   - "public" actions   → only routes tagged "public"
 *   - "authenticated"    → routes tagged "public" + "authenticated"
 *   - "admin"            → everything (handled separately)
 */
function resolvePermissions(
  hierarchy: string[],
  routes: Record<string, string>,
): Map<string, Set<string>> {
  const roleActions = new Map<string, Set<string>>();

  for (const role of hierarchy) {
    roleActions.set(role, new Set());
  }

  for (const [action, minRole] of Object.entries(routes)) {
    const minIndex = hierarchy.indexOf(minRole);
    if (minIndex === -1) {
      console.warn(`⚠️  permissions.json: unknown role "${minRole}" for action "${action}" — skipped`);
      continue;
    }
    // Grant this action to minRole and every role above it in the hierarchy
    for (let i = minIndex; i < hierarchy.length; i++) {
      roleActions.get(hierarchy[i])!.add(action);
    }
  }

  return roleActions;
}

/**
 * Ensure a Strapi role has all the given actions. Uses a bulk pre-fetch of
 * existing permissions to avoid N+1 queries.
 */
async function ensureRolePermissions(
  strapi: Core.Strapi,
  roleId: number,
  roleName: string,
  actions: Set<string> | string[],
) {
  const actionList = actions instanceof Set ? [...actions] : actions;
  if (actionList.length === 0) return;

  // Bulk pre-fetch existing permissions for this role
  const existing = await strapi.entityService.findMany(
    'plugin::users-permissions.permission',
    { filters: { role: { id: roleId } }, limit: -1 } as any,
  );
  const existingActions = new Set((existing as any[]).map((p: any) => p.action));

  const toCreate = actionList.filter((a) => !existingActions.has(a));

  for (const action of toCreate) {
    await strapi.entityService.create('plugin::users-permissions.permission', {
      data: { action, role: roleId },
    });
  }

  console.log(
    `✅ ${roleName} — ${toCreate.length} permissions added (${actionList.length} total).`,
  );
}

// ---------------------------------------------------------------------------

export async function runFullBootstrap(strapi: Core.Strapi) {
  console.log('🚀 Starting manual bootstrap sequence...');

  const config: PermissionsConfig = permissions;
  const hierarchy = config._meta.hierarchy; // e.g. ["public", "authenticated"]
  const roleActionMap = resolvePermissions(hierarchy, config.routes);

  // ── A. Admin Role — gets ALL discovered actions ──────────────────────────
  let adminRoles = await strapi.entityService.findMany('plugin::users-permissions.role', {
    filters: { type: 'admin' },
  });

  if (!adminRoles || adminRoles.length === 0) {
    adminRoles = await strapi.entityService.findMany('plugin::users-permissions.role', {
      filters: { name: 'Admin' },
    });
  }

  let boAdminRole = adminRoles[0];

  if (!boAdminRole) {
    boAdminRole = await strapi.entityService.create('plugin::users-permissions.role', {
      data: {
        name: 'Admin',
        description: 'Role for back-office administrators.',
        type: 'admin',
      },
    });
    console.log('✅ Admin Role created for back-office users.');
  }

  if (boAdminRole) {
    const permissionsService = strapi.plugin('users-permissions').service('users-permissions');
    const allPermissions = await permissionsService.getActions();

    const adminActions: string[] = [];
    for (const sectionKey of Object.keys(allPermissions)) {
      const section = allPermissions[sectionKey];
      if (section.controllers) {
        for (const controllerKey of Object.keys(section.controllers)) {
          const controller = section.controllers[controllerKey];
          for (const actionKey of Object.keys(controller)) {
            adminActions.push(`${sectionKey}.${controllerKey}.${actionKey}`);
          }
        }
      }
    }

    await ensureRolePermissions(strapi, (boAdminRole as any).id, 'Admin', adminActions);
  }

  // ── B. Hierarchy-based roles (public, authenticated, …) ─────────────────
  for (const roleName of hierarchy) {
    const found = await strapi.entityService.findMany('plugin::users-permissions.role', {
      filters: { type: roleName },
    });

    const role = (found as any[])?.[0];
    if (!role) {
      console.warn(`⚠️  Role "${roleName}" from hierarchy not found in DB — skipped.`);
      continue;
    }

    const actions = roleActionMap.get(roleName)!;
    await ensureRolePermissions(strapi, role.id, roleName, actions);
  }

  // 2. Setup Quests
  const templates = await strapi.entityService.findMany('api::quest-template.quest-template', {
    filters: { code: 'WELCOME_QUEST' }
  });

  if (templates.length === 0) {
    await strapi.entityService.create('api::quest-template.quest-template', {
      data: {
        code: 'WELCOME_QUEST',
        title: 'Bienvenue dans Terra Nullius !',
        description: 'Jouez votre première partie pour gagner des récompenses.',
        rewardCoins: 500,
        rewardGems: 500,
        type: 'play_games',
        target: 1,
      }
    });
    console.log('✅ Default Welcome Quest Template created.');
  }

  // Cleanup deprecated 48h, weekly, and element quest templates
  try {
    const allExistingTemplates = await strapi.entityService.findMany('api::quest-template.quest-template');
    const deprecatedIds = (allExistingTemplates as any[])
      .filter((t: any) => t.code.endsWith('_48H') || t.code.endsWith('_WEEKLY') || t.code.startsWith('PLAY_ELEMENT_'))
      .map((t: any) => t.id);

    if (deprecatedIds.length > 0) {
      // Delete associated player quests first to avoid orphaned relations
      await strapi.db.query('api::player-quest.player-quest').deleteMany({
        where: { quest_template: { id: { $in: deprecatedIds } } }
      });
      // Delete the templates
      await strapi.db.query('api::quest-template.quest-template').deleteMany({
        where: { id: { $in: deprecatedIds } }
      });
      console.log(`🧹 Cleaned up ${deprecatedIds.length} deprecated quest templates (48h/7d/elements).`);
    }
  } catch (err) {
    console.error('❌ Error cleaning up deprecated quests:', err);
  }

  await generateQuestTemplates(strapi);
  console.log('✅ Quest templates generated.');

  // 3. Collections
  try {
    await bootstrapCollections(strapi);
    console.log('✅ Collections bootstrapped.');
  } catch (err) {
    console.error('❌ Error bootstrapping collections:', err);
  }

  // 3.5 Factions
  try {
    await bootstrapFactions(strapi);
    console.log('✅ Factions bootstrapped.');

    await migrateCardsToFactions(strapi);
    console.log('✅ Card factions migration complete.');
  } catch (err) {
    console.error('❌ Error bootstrapping/migrating factions:', err);
  }

  // 4. Decks & Stories
  try {
    await bootstrapDecks(strapi);
    console.log('✅ Decks bootstrapped.');
  } catch (err) {
    console.error('❌ Error bootstrapping decks:', err);
  }

  try {
    await bootstrapStories(strapi);
    console.log('✅ Stories bootstrapped.');
  } catch (err) {
    console.error('❌ Error bootstrapping stories:', err);
  }

  // 4.5 Weekly Quest Config
  try {
    await bootstrapWeeklyQuestConfig(strapi);
    console.log('✅ WeeklyQuest Config bootstrapped.');
  } catch (err) {
    console.error('❌ Error bootstrapping WeeklyQuest Config:', err);
  }

  try {
    await bootstrapGameConfig(strapi);
    console.log('✅ Game Config bootstrapped.');
  } catch (err) {
    console.error('❌ Error bootstrapping Game Config:', err);
  }

  // 4.6 Guilds
  try {
    await bootstrapGuild(strapi);
    console.log('✅ Guilds bootstrapped.');
  } catch (err) {
    console.error('❌ Error bootstrapping Guilds:', err);
  }

  // 4. Backfill existing users
  const allUsers = await strapi.entityService.findMany('plugin::users-permissions.user');
  if (allUsers) {
    for (const user of (allUsers as any[])) {
      await ensureUserHasWelcomeQuest(strapi, user.id);
      await assignQuestsToUser(strapi, user.id, true);
    }
  }
  console.log('✅ Backfilled quests for existing users.');

  console.log('✨ Manual bootstrap complete.');
}
