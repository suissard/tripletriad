#!/usr/bin/env node

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { symlinkSync, existsSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const projects = [
  { name: 'Front-end', path: 'front' },
  { name: 'Strapi (Back-end)', path: 'back/strapi' }
];


console.log('🔗 Linking .env to Strapi directory...');
const rootEnv = resolve(ROOT, '.env');
const strapiEnv = resolve(ROOT, 'back/strapi/.env');

try {
  if (existsSync(strapiEnv)) {
    unlinkSync(strapiEnv);
  }
  symlinkSync('../../.env', strapiEnv);
  console.log('✅ .env linked successfully!\n');
} catch (error) {
  console.warn('⚠️ Could not create .env symlink (normal on Windows without dev mode).');
}

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
