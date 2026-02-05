#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project name from command line args, default to current directory name
const args = process.argv.slice(2);
const projectName = args[0] || path.basename(process.cwd());

// Determine the target directory
const targetDir = args[0] ? path.resolve(process.cwd(), args[0]) : process.cwd();

console.log(`Creating a new app in ${targetDir}...`);

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Check if directory is empty (allow .git)
const existing = fs.readdirSync(targetDir).filter(f => f !== '.git');
if (existing.length > 0 && args[0]) {
  console.error(`Error: Directory ${targetDir} is not empty.`);
  process.exit(1);
}

// Copy template files
const templateDir = path.resolve(__dirname, '..', 'template');

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying template files...');
copyRecursive(templateDir, targetDir);

// Update package.json with project name
const packageJsonPath = path.join(targetDir, 'package.json');
let packageJson = fs.readFileSync(packageJsonPath, 'utf8');
packageJson = packageJson.replace('{{PROJECT_NAME}}', projectName);
fs.writeFileSync(packageJsonPath, packageJson);

console.log('Template files copied successfully!');
console.log('\nNext steps:');
console.log(`  cd ${args[0] || '.'}`);
console.log('  bun install');
console.log('  bun run dev');
console.log('\nHappy coding! 🚀');
