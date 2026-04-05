import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const CARDS_BASE_DIR = path.join(ROOT_DIR, 'shared', 'data', 'cards', 'base-cards');
const OUTPUT_FILE = path.join(ROOT_DIR, 'shared', 'data', 'cards.json');

const FRONT_PUBLIC_CARDS = path.join(ROOT_DIR, 'front', 'public', 'cards');

/**
 * Aggregates all individual card JSON files into a single cards.json,
 * and syncs their visuals to the frontend public directory.
 */
function syncCards() {
  console.log('🔍 Scanning base-cards for offline data...');
  
  if (!fs.existsSync(CARDS_BASE_DIR)) {
    console.error(`❌ Error: Directory not found: ${CARDS_BASE_DIR}`);
    process.exit(1);
  }

  // Ensure public cards directory exists
  if (!fs.existsSync(FRONT_PUBLIC_CARDS)) {
    fs.mkdirSync(FRONT_PUBLIC_CARDS, { recursive: true });
  }

  const files = fs.readdirSync(CARDS_BASE_DIR).filter(f => f.endsWith('.json'));
  const cards = [];

  const VISUAL_DIR = path.join(CARDS_BASE_DIR, 'visual');
  const availableVisuals = fs.existsSync(VISUAL_DIR) ? fs.readdirSync(VISUAL_DIR) : [];

  for (const file of files) {
    try {
      const filePath = path.join(CARDS_BASE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const cardData = JSON.parse(content);
      const baseName = path.basename(file, '.json');
      
      // Extract ID from filename if missing
      if (!cardData.id) {
        const idMatch = file.match(/^(\d+)-/);
        if (idMatch) {
          cardData.id = parseInt(idMatch[1], 10);
        }
      }

      // Sync visual if it exists
      const visualFile = baseName + '.png';
      if (availableVisuals.includes(visualFile)) {
        const srcPath = path.join(VISUAL_DIR, visualFile);
        const destPath = path.join(FRONT_PUBLIC_CARDS, visualFile);
        
        // Only copy if changed or missing
        const srcStats = fs.statSync(srcPath);
        if (!fs.existsSync(destPath) || fs.statSync(destPath).size !== srcStats.size) {
            fs.copyFileSync(srcPath, destPath);
        }
        
        // Set imageUrl for the frontend to use
        cardData.imageUrl = `/cards/${visualFile}`;
      }

      // Ensure a description exists
      if (!cardData.description) {
        cardData.description = '';
      }

      cards.push(cardData);
    } catch (err) {
      console.error(`⚠️ Failed to parse ${file}:`, err.message);
    }
  }

  // Sort by ID
  cards.sort((a, b) => (a.id || 0) - (b.id || 0));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cards, null, 2));
  console.log(`✅ Successfully synced ${cards.length} cards and their visuals to ${OUTPUT_FILE}`);
}

syncCards();
