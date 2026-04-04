#!/usr/bin/env node

/**
 * Script de génération de prompts via webhook n8n
 * 
 * Appelle le webhook n8n pour chaque carte et remplace le champ "prompt"
 * par le résultat retourné.
 * 
 * Usage:
 *   node scripts/generate-prompts.cjs --test             # Test sur la carte 001
 *   node scripts/generate-prompts.cjs --card 016         # Traite une carte spécifique
 *   node scripts/generate-prompts.cjs --range 001-010    # Traite une plage de cartes
 *   node scripts/generate-prompts.cjs --dry-run          # Affiche le body sans appeler le webhook
 *   node scripts/generate-prompts.cjs                    # Traite TOUTES les cartes
 *   node scripts/generate-prompts.cjs --no-backup        # Sans backup
 */

const fs = require('fs');
const path = require('path');

const WEBHOOK_URL = 'https://n8n.clavier.dev/webhook/createprompt';
const BASE_CARDS_DIR = path.join(__dirname, '..', 'shared', 'data', 'base-cards');
const TIMEOUT_MS = 120_000; // 2 minutes timeout par requête

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construit le body du webhook à partir des données d'une carte
 */
function buildWebhookBody(cardData) {
  return {
    name: cardData.name,
    function: cardData.description,
    scenography: cardData.prompt?.scenography?.setting || '',
    attitude: cardData.prompt?.subject?.attitude?.behavior || '',
    faction: cardData.faction,
    category: cardData.name,
  };
}

/**
 * Appelle le webhook avec timeout
 */
async function callWebhook(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      console.log('  ⚠️  Réponse non-JSON, stockée telle quelle');
      return { raw: text };
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Traite une seule carte
 */
async function processCard(filePath, opts = {}) {
  const { dryRun = false, backup = true } = opts;
  const fileName = path.basename(filePath);
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📇 ${fileName}`);

  const cardData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const body = buildWebhookBody(cardData);

  console.log(`  📋 Nom:      ${cardData.name}`);
  console.log(`  🏴 Faction:  ${cardData.faction}`);
  console.log(`  ⭐ Rareté:   ${cardData.rarity}`);
  console.log(`  🎯 Élément:  ${cardData.element}`);

  if (dryRun) {
    console.log(`\n  📤 Body webhook (dry-run):`);
    const bodyStr = JSON.stringify(body, null, 2);
    bodyStr.split('\n').forEach(l => console.log('     ' + l));
    return { card: fileName, status: 'dry-run' };
  }

  // Appel webhook
  console.log(`  📡 Appel webhook...`);
  const startTime = Date.now();
  const result = await callWebhook(body);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ⏱️  Réponse en ${elapsed}s`);

  // Aperçu de la réponse
  const preview = JSON.stringify(result).substring(0, 300);
  console.log(`  📝 Aperçu: ${preview}${preview.length >= 300 ? '...' : ''}`);

  // Backup dans un dossier dédié
  if (backup) {
    const backupDir = path.join(path.dirname(filePath), '..', 'base-cards-backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.copyFileSync(filePath, path.join(backupDir, fileName));
    console.log(`  💾 Backup → base-cards-backup/${fileName}`);
  }

  // Déterminer le nouveau prompt
  let newPrompt;
  if (result.raw) {
    newPrompt = result;
  } else if (result.prompt) {
    newPrompt = result.prompt;
  } else {
    newPrompt = result;
  }

  // Mise à jour du fichier
  cardData.prompt = newPrompt;
  fs.writeFileSync(filePath, JSON.stringify(cardData, null, 2) + '\n', 'utf-8');
  console.log(`  ✅ Fichier mis à jour !`);

  return { card: fileName, status: 'updated' };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, test: false, card: null, range: null, noBackup: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run': opts.dryRun = true; break;
      case '--test': opts.test = true; break;
      case '--card': opts.card = args[++i]; break;
      case '--range': opts.range = args[++i]; break;
      case '--no-backup': opts.noBackup = true; break;
      case '--help':
        console.log(`
  Usage: node scripts/generate-prompts.cjs [options]
  
  Options:
    --test           Test sur la première carte uniquement
    --card <num>     Traiter une carte spécifique (ex: 016)
    --range <s-e>    Traiter une plage (ex: 001-010)  
    --dry-run        Afficher le body sans appeler le webhook
    --no-backup      Ne pas créer de backup
    --help           Aide
        `);
        process.exit(0);
    }
  }
  return opts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  console.log('');
  console.log('🚀 ═══════════════════════════════════════════════════');
  console.log('   Générateur de Prompts — Webhook n8n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  📡 Webhook: ${WEBHOOK_URL}`);
  console.log(`  📁 Dossier: ${BASE_CARDS_DIR}`);

  const mode = opts.dryRun ? '🔍 DRY-RUN' : opts.test ? '🧪 TEST (1 carte)' : '🏭 PRODUCTION';
  console.log(`  🎛️  Mode: ${mode}`);

  // Lister les fichiers
  const allFiles = fs.readdirSync(BASE_CARDS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => path.join(BASE_CARDS_DIR, f));

  console.log(`  📂 ${allFiles.length} cartes trouvées`);

  // Filtrer
  let files;
  if (opts.test) {
    files = [allFiles[0]];
  } else if (opts.card) {
    files = allFiles.filter(f => path.basename(f).startsWith(opts.card));
    if (files.length === 0) {
      console.error(`  ❌ Carte ${opts.card} non trouvée`);
      process.exit(1);
    }
  } else if (opts.range) {
    const [start, end] = opts.range.split('-').map(Number);
    files = allFiles.filter(f => {
      const num = parseInt(path.basename(f).split('-')[0]);
      return num >= start && num <= end;
    });
  } else {
    files = allFiles;
  }

  console.log(`  🎯 ${files.length} carte(s) sélectionnée(s)`);

  // Traitement
  const results = [];
  for (const filePath of files) {
    try {
      const result = await processCard(filePath, {
        dryRun: opts.dryRun,
        backup: !opts.noBackup,
      });
      results.push(result);

      // Délai entre les appels (sauf dry-run)
      if (!opts.dryRun && files.length > 1) {
        console.log('  ⏳ Pause 2s...');
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`  ❌ ERREUR: ${err.message}`);
      results.push({ card: path.basename(filePath), status: 'error', error: err.message });
    }
  }

  // Résumé final
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 RÉSUMÉ');
  console.log(`${'═'.repeat(60)}`);
  const updated = results.filter(r => r.status === 'updated').length;
  const dryRuns = results.filter(r => r.status === 'dry-run').length;
  const errors = results.filter(r => r.status === 'error').length;
  console.log(`  Total:      ${results.length}`);
  console.log(`  Mis à jour: ${updated}`);
  console.log(`  Dry-run:    ${dryRuns}`);
  console.log(`  Erreurs:    ${errors}`);

  if (errors > 0) {
    console.log('\n  ❌ Cartes en erreur:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`     - ${r.card}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\n✅ Terminé !');
}

main().catch(err => {
  console.error('\n💥 Erreur fatale:', err);
  process.exit(1);
});
