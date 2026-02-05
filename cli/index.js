#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🚀 Welcome to Internal HCWS Project Creator!\n');

  // Get project name
  const args = process.argv.slice(2);
  let projectName = args[0];
  
  if (!projectName) {
    projectName = await prompt('Project name: ');
    if (!projectName) {
      console.error('Error: Project name is required.');
      rl.close();
      process.exit(1);
    }
  }

  const autoCode = await prompt('Auto launch VS code after install? (Y/N) ');

  // Determine the target directory
  const targetDir = path.resolve(process.cwd(), projectName);

  console.log(`\nCreating a new app in ${targetDir}...`);

  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Check if directory is empty
  const existing = fs.readdirSync(targetDir);
  if (existing.length > 0) {
    console.error(`Error: Directory ${targetDir} is not empty.`);
    rl.close();
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

  if (!autoCode) {
    console.log('✅ Template files copied successfully!');
    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    console.log('  bun install');
    console.log('  bun run dev');
    console.log('\nHappy coding! 🚀');
  } else {
    console.log('✅ Template files copied successfully!');
    console.log('  Auto opening VS code...');
    console.log('\nHappy coding! 🚀');

    spawn("code", [projectName], {
      stdio: "inherit",
      shell: true,
    });
  }
  
  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
