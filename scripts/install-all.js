#!/usr/bin/env node

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const projects = [
  { name: 'Root', path: '.' },
  { name: 'Front-end', path: 'front' },
  { name: 'Strapi (Back-end)', path: 'back/strapi' }
];

console.log('\n🚀 Starting installation for all projects...\n');

for (const project of projects) {
  const projectPath = resolve(ROOT, project.path);
  console.log(`📦 Installing dependencies for ${project.name}...`);
  console.log(`📍 Path: ${projectPath}`);

  try {
    execSync('npm install', {
      cwd: projectPath,
      stdio: 'inherit'
    });
    console.log(`✅ ${project.name} installed successfully!\n`);
  } catch (error) {
    console.error(`❌ Failed to install dependencies for ${project.name}.`);
    process.exit(1);
  }
}

console.log('🎉 All dependencies installed successfully!');
