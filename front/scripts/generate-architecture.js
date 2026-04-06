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
  vue: '#238636',      // Green (Components/Views)
  js: '#1f6feb',       // Blue (Utilities/Logic)
  api: '#d29922',      // Orange (Endpoints)
  mechanic: '#8957e5',  // Purple (Game Engine)
  store: '#e34c26',     // Red/Orange (Pinia)
  admin: '#f85149',     // Bright Red (Admin)
  config: '#8b949e'     // Grey (Config)
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'data') return;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else {
      processFile(filePath, stat);
    }
  });
}

function getRelativePath(filePath) {
  return path.relative(srcDir, filePath).replace(/\\/g, '/');
}

function processFile(filePath, stat) {
  const ext = path.extname(filePath);
  if (ext !== '.vue' && ext !== '.js' && ext !== '.mjs') return;

  const relPath = getRelativePath(filePath);
  const fileName = path.basename(filePath);
  const folder = path.dirname(relPath);
  const depth = relPath.split('/').length - 1;
  const content = fs.readFileSync(filePath, 'utf-8');

  let bgColor = colors.js;
  let category = 'logic';

  if (ext === '.vue') {
    bgColor = colors.vue;
    category = 'component';
  }

  if (relPath.includes('admin/')) {
    bgColor = colors.admin;
    category = 'admin';
  } else if (relPath.includes('stores/')) {
    bgColor = colors.store;
    category = 'store';
  } else if (relPath.includes('game/')) {
    bgColor = colors.mechanic;
    category = 'mechanic';
  } else if (relPath.includes('api/')) {
    bgColor = colors.api;
    category = 'api';
  } else if (relPath.includes('config/')) {
    bgColor = colors.config;
    category = 'config';
  } else if (relPath.includes('views/')) {
    category = 'view';
  }

  const nodeId = `node_${idCounter++}`;
  const sizeKb = (stat.size / 1024).toFixed(1);

  nodes.push({
    id: nodeId,
    label: `${fileName}\n(${sizeKb} KB)`,
    style: { 
      backgroundColor: bgColor, 
      color: '#fff', 
      border: '1px solid rgba(255,255,255,0.1)', 
      borderRadius: '10px', 
      padding: '10px',
      fontSize: '11px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
    },
    position: { x: 0, y: 0 },
    data: { 
      filePath: relPath, 
      folder: folder,
      depth: depth,
      category: category,
      extension: ext,
      content: content 
    }
  });
}

function resolveImport(importPath, sourceRelPath) {
  if (importPath.startsWith('@/')) return importPath.replace('@/', '');
  if (importPath.startsWith('.')) {
    const sourceDir = path.dirname(sourceRelPath);
    return path.join(sourceDir, importPath).replace(/\\/g, '/');
  }
  return null;
}

function extractEdges() {
  nodes.forEach(sourceNode => {
    if (!sourceNode.data.content) return;
    const content = sourceNode.data.content;
    const sourcePath = sourceNode.data.filePath;

    // 1. Static Imports
    const importRegex = /import\s+[\w{}*,\s]+\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[1];
      const targetRelPath = resolveImport(imp, sourcePath);
      if (targetRelPath) {
        let targetNode = nodes.find(n => 
          n.data.filePath === targetRelPath || 
          n.data.filePath === targetRelPath + '.vue' || 
          n.data.filePath === targetRelPath + '.js' ||
          n.data.filePath === targetRelPath + '.mjs' ||
          n.data.filePath === targetRelPath + '/index.js'
        );

        if (targetNode && targetNode.id !== sourceNode.id) {
          edges.push({
            id: `edge_${sourceNode.id}_${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            style: { stroke: 'rgba(139, 148, 158, 0.2)', strokeWidth: 1 }
          });
        }
      }
    }

    // 2. Stores
    const storeRegex = /use(\w+Store)\(\)/g;
    while ((match = storeRegex.exec(content)) !== null) {
      const storeName = match[1];
      const targetNode = nodes.find(n => n.data.filePath.toLowerCase().includes(storeName.toLowerCase()));
      if (targetNode && targetNode.id !== sourceNode.id) {
        edges.push({
          id: `edge_store_${sourceNode.id}_${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          label: 'store',
          animated: true,
          style: { stroke: colors.store, strokeWidth: 2 }
        });
      }
    }

    // 3. API
    const apiRegex = /strapiService\.(find|findOne|create|update|delete)\(['"]([^'"]+)['"]/g;
    while ((match = apiRegex.exec(content)) !== null) {
      const endpoint = match[2];
      const apiNodeLabel = `API: ${endpoint}`;
      let apiNode = nodes.find(n => n.label === apiNodeLabel);
      if (!apiNode) {
        apiNode = {
          id: `api_${idCounter++}`,
          label: apiNodeLabel,
          style: { backgroundColor: colors.api, color: '#000', borderRadius: '8px', padding: '8px', fontWeight: 'bold' },
          position: { x: 0, y: 0 },
          data: { category: 'api_endpoint', folder: 'api', depth: 4 }
        };
        nodes.push(apiNode);
      }
      edges.push({
        id: `edge_api_${sourceNode.id}_${apiNode.id}`,
        source: sourceNode.id,
        target: apiNode.id,
        animated: true,
        style: { stroke: colors.api }
      });
    }
    delete sourceNode.data.content;
  });
}

function applyTreeLayout() {
  const nodeWidth = 250;
  const nodeHeight = 120;
  const folderSpacing = 150;
  
  // Group by folder
  const folderGroups = {};
  nodes.forEach(node => {
    const f = node.data.folder || '.';
    if (!folderGroups[f]) folderGroups[f] = [];
    folderGroups[f].push(node);
  });

  const folders = Object.keys(folderGroups).sort();
  let currentY = 0;
  const folderY = {};

  folders.forEach(f => {
    folderY[f] = currentY;
    currentY += Math.max(folderGroups[f].length * nodeHeight / 2, 300);
  });

  nodes.forEach(node => {
    const f = node.data.folder || '.';
    const depth = node.data.depth || 0;
    const nodesInFolder = folderGroups[f];
    const indexInFolder = nodesInFolder.indexOf(node);
    
    node.position = {
      x: depth * (nodeWidth + folderSpacing),
      y: folderY[f] + indexInFolder * nodeHeight
    };
  });
}

console.log('🚀 Generating tree architecture...');
processDirectory(srcDir);
extractEdges();
applyTreeLayout();

const outputDir = path.resolve(srcDir, 'admin/data');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'architecture.json'), JSON.stringify([...nodes, ...edges], null, 2));
console.log(`✨ Generated ${nodes.length} nodes and ${edges.length} edges.`);
