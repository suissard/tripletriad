#!/usr/bin/env node

/**
 * Script d'assemblage d'histoires à partir de structures multi-fichiers
 * Usage: node assemble_story.cjs <chemin-dossier-histoire> | --all
 *
 * Écrit <dossier>.json à côté des dossiers : c'est ce fichier plat que le bootstrap
 * Strapi (story-bootstrap.ts) importe au démarrage.
 */

const fs = require('fs');
const path = require('path');

// Constantes : ce script vit dans le dossier des histoires, lu tel quel par Strapi
const DATA_DIR = __dirname;
const DIST_DIR = DATA_DIR;

/**
 * Point d'entrée principal
 */
async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.error('Usage: node assemble_story.cjs <chemin-dossier-histoire> | --all');
      process.exit(1);
    }

    // Créer le dossier dist s'il n'existe pas
    if (!fs.existsSync(DIST_DIR)) {
      fs.mkdirSync(DIST_DIR, { recursive: true });
    }

    if (args[0] === '--all') {
      await assembleAllStories();
    } else {
      const storyPath = path.resolve(args[0]);
      await assembleSingleStory(storyPath);
    }
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Assemble toutes les histoires du dossier stories/
 */
async function assembleAllStories() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Le dossier "${DATA_DIR}" n'existe pas.`);
    return;
  }

  const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
  const storyDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  if (storyDirs.length === 0) {
    console.log('📭 Aucun dossier d\'histoire trouvé dans stories/.');
    return;
  }

  console.log(`📚 Assemblage de ${storyDirs.length} histoire(s)...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const dirName of storyDirs) {
    const storyPath = path.join(DATA_DIR, dirName);
    try {
      await assembleSingleStory(storyPath);
      successCount++;
    } catch (error) {
      console.error(`   ❌ ${dirName}: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n✅ Terminé: ${successCount} succès, ${failCount} échec(s).`);
}

/**
 * Assemble une seule histoire
 */
async function assembleSingleStory(storyPath) {
  const manifestPath = path.join(storyPath, 'manifest.json');

  // 1. Lire le manifest.json
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json introuvable');
  }

  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);

  // Validation du manifest
  if (!manifest.title || !manifest.situations || !Array.isArray(manifest.situations)) {
    throw new Error('manifest.json invalide (title et situations requis)');
  }

  console.log(`📖 "${manifest.title}"`);

  // 2. Lire chaque fichier situation
  const situations = [];
  const situationIds = new Set();
  const filePaths = [];

  for (const situation of manifest.situations) {
    const filePath = path.join(storyPath, situation.file);
    filePaths.push(filePath);

    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠️ Fichier manquant: ${situation.file}`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const situationData = JSON.parse(content);

      // Vérifier que le situationId correspond
      if (situationData.situationId !== situation.situationId) {
        console.warn(`   ⚠️ situationId mismatch: attendu ${situation.situationId}, trouvé ${situationData.situationId}`);
      }

      situations.push(situationData);
      situationIds.add(situationData.situationId);
    } catch (error) {
      console.warn(`   ⚠️ JSON invalide dans ${situation.file}: ${error.message}`);
    }
  }

  // 3. Valider tous les liens (dialogue/récompense, options de choix, issues de combat)
  const linksOf = (s) => [
    s.nextSituationId,
    ...(s.options || []).map(o => o.nextSituationId),
    s.onWinSituationId,
    s.onLoseSituationId,
  ].filter(Boolean);
  let orphanCount = 0;
  for (const situation of situations) {
    for (const target of linksOf(situation)) {
      if (!situationIds.has(target)) {
        console.warn(`   ⚠️ ${situation.situationId} → "${target}" n'existe pas`);
        orphanCount++;
      }
    }
  }

  // 4. Compter les fins (situations sans nextSituationId)
  const finishCount = situations.filter(s => /situation-(success|game-over)$/.test(s.__component)).length;
  const battleCount = situations.filter(s => s.__component === 'story.situation-battle').length;

  // 5. Générer l'output JSON
  const output = {
    title: manifest.title,
    description: manifest.description || '',
    situations: situations
  };

  // Nom du fichier de sortie basé sur le nom du dossier
  const folderName = path.basename(storyPath);
  const outputPath = path.join(DIST_DIR, `${folderName}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

  // 6. Afficher le résumé
  console.log(`   ✓ ${situations.length} situation(s) assemblée(s)`);
  if (orphanCount > 0) {
    console.log(`   ⚠️ ${orphanCount} référence(s) orpheline(s)`);
  }
  console.log(`   📍 Fins: ${finishCount} | Combats: ${battleCount}`);
  console.log(`   💾 Sortie: ${outputPath}\n`);
}

// Exécution
main();
