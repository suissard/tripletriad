import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

// Map elements
const nodes = [];
const edges = [];
let idCounter = 1;

// Colors
const colors = {
  vue: '#238636',   // Greenish
  js: '#1f6feb',    // Bluish
  api: '#d29922',   // Orange/Yellowish
  mechanic: '#8957e5', // Purple
  store: '#e34c26'  // Red/Orange
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else {
      processFile(filePath);
    }
  });
}

function getRelativePath(filePath) {
  return path.relative(srcDir, filePath).replace(/\\/g, '/');
}

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (ext !== '.vue' && ext !== '.js') return;

  const relPath = getRelativePath(filePath);
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');

  let type = 'default';
  let bgColor = ext === '.vue' ? colors.vue : colors.js;

  if (relPath.includes('/stores/')) bgColor = colors.store;
  if (relPath.includes('/game/')) bgColor = colors.mechanic;

  const nodeId = `node_${idCounter++}`;

  nodes.push({
    id: nodeId,
    type: type,
    label: `${fileName}\n(${relPath})`,
    style: { backgroundColor: bgColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' },
    // Temporarily position (will be handled by auto-layout or random, here random for start)
    position: { x: Math.random() * 800, y: Math.random() * 600 },
    data: { filePath: relPath, content: content } // Keep content for edge parsing
  });
}

function extractEdges() {
  // Simple heuristic: look for imports or generic component usage
  nodes.forEach(sourceNode => {
    const content = sourceNode.data.content;
    const relPath = sourceNode.data.filePath;

    // Look for imports (e.g., import AppButton from '@/components/ui/AppButton.vue')
    const importRegex = /import\s+[\w{}*,\s]+\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      // Try to resolve importPath to a file we know
      // Very naive resolution for demonstration:
      let targetPath = '';
      if (importPath.startsWith('.') || importPath.startsWith('..')) {
         const sourceDir = path.dirname(path.resolve(srcDir, relPath));
         const resolvedPath = path.resolve(sourceDir, importPath);
         targetPath = path.relative(srcDir, resolvedPath).replace(/\\/g, '/');
         // Handle missing extensions (.js/.vue)
         if (!targetPath.endsWith('.vue') && !targetPath.endsWith('.js')) {
             if (nodes.find(n => n.data.filePath === targetPath + '.js')) targetPath += '.js';
             else if (nodes.find(n => n.data.filePath === targetPath + '.vue')) targetPath += '.vue';
         }
      } else if (importPath.startsWith('@/')) {
         targetPath = importPath.replace('@/', '');
      } else if (importPath.startsWith('../../') || importPath.startsWith('../')) {
         // This logic is flawed but we can just do simple text matching for now
      }

      if (targetPath) {
        const targetNode = nodes.find(n => n.data.filePath === targetPath);
        if (targetNode && targetNode.id !== sourceNode.id) {
          edges.push({
            id: `edge_${sourceNode.id}_${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            animated: true,
            style: { stroke: '#6e7681' }
          });
        }
      }
    }

    // Scan for API calls (strapiService.find, etc)
    const apiRegex = /strapiService\.(find|findOne|create|update|delete)\(['"]([^'"]+)['"]/g;
    while ((match = apiRegex.exec(content)) !== null) {
      const method = match[1];
      const endpoint = match[2];

      const apiNodeLabel = `API: ${endpoint} (${method.toUpperCase()})`;
      let apiNode = nodes.find(n => n.label === apiNodeLabel);
      if (!apiNode) {
        apiNode = {
          id: `api_${idCounter++}`,
          label: apiNodeLabel,
          style: { backgroundColor: colors.api, color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' },
          position: { x: Math.random() * 800 + 400, y: Math.random() * 600 + 400 },
          data: {}
        };
        nodes.push(apiNode);
      }

      edges.push({
        id: `edge_${sourceNode.id}_${apiNode.id}`,
        source: sourceNode.id,
        target: apiNode.id,
        label: method.toUpperCase(),
        animated: true,
        style: { stroke: colors.api }
      });
    }

    // Direct HTTP calls (fetch)
    const fetchRegex = /fetch\(['"](.*api.*)['"]/g;
    while ((match = fetchRegex.exec(content)) !== null) {
      const endpoint = match[1];
      const apiNodeLabel = `API: ${endpoint}`;
      let apiNode = nodes.find(n => n.label === apiNodeLabel);
      if (!apiNode) {
        apiNode = {
          id: `api_${idCounter++}`,
          label: apiNodeLabel,
          style: { backgroundColor: colors.api, color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' },
          position: { x: Math.random() * 800 + 400, y: Math.random() * 600 + 400 },
          data: {}
        };
        nodes.push(apiNode);
      }
      edges.push({
        id: `edge_${sourceNode.id}_${apiNode.id}`,
        source: sourceNode.id,
        target: apiNode.id,
        label: 'FETCH',
        animated: true,
        style: { stroke: colors.api }
      });
    }

    // Clean up content so it's not saved to JSON
    delete sourceNode.data.content;
  });
}

console.log('Scanning directories...');
processDirectory(srcDir);
console.log(`Found ${nodes.length} files/components.`);

console.log('Extracting edges and API calls...');
extractEdges();
console.log(`Found ${edges.length} connections.`);

// Force DAG Layout (very basic naive force-directed placement or grid)
// We'll arrange them in a basic grid based on categories to make it somewhat readable
let vueNodes = nodes.filter(n => n.style.backgroundColor === colors.vue);
let jsNodes = nodes.filter(n => n.style.backgroundColor === colors.js);
let storeNodes = nodes.filter(n => n.style.backgroundColor === colors.store);
let mechNodes = nodes.filter(n => n.style.backgroundColor === colors.mechanic);
let apiNodes = nodes.filter(n => n.style.backgroundColor === colors.api);

function layoutGrid(nodeList, startX, startY, cols) {
    nodeList.forEach((n, i) => {
        n.position = { x: startX + (i % cols) * 200, y: startY + Math.floor(i / cols) * 150 };
    });
}

layoutGrid(vueNodes, 100, 100, 5);
layoutGrid(jsNodes, 1200, 100, 3);
layoutGrid(storeNodes, 1200, 500, 2);
layoutGrid(mechNodes, 100, 800, 5);
layoutGrid(apiNodes, 100, 1200, 4);

const outputData = [...nodes, ...edges];

// Write to front/src/admin/data/architecture.json
const outputDir = path.resolve(srcDir, 'admin/data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'architecture.json'), JSON.stringify(outputData, null, 2));

console.log('Generated architecture.json successfully!');
