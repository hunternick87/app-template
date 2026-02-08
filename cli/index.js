#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from "node:child_process";
import * as p from '@clack/prompts';
import { setTimeout } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.clear();

    p.intro('🚀 Welcome to HCWS Project Creator!');

    // Get project name
    const args = process.argv.slice(2);
    let projectName = args[0];

    if (!projectName) {
        projectName = await p.text({
            message: 'What is your project name?',
            placeholder: 'my-awesome-app',
            validate: (value) => {
                if (!value) return 'Project name is required';
                if (!/^[a-z0-9-]+$/.test(value)) return 'Project name can only contain lowercase letters, numbers, and hyphens';
            }
        });

        if (p.isCancel(projectName)) {
            p.cancel('Operation cancelled.');
            process.exit(0);
        }
    }

    // Ask about database
    const database = await p.select({
        message: 'Which database would you like to use?',
        options: [
            { value: 'sqlite', label: 'SQLite', hint: 'File-based, great for development' },
            { value: 'postgresql', label: 'PostgreSQL', hint: 'Production-ready, scalable' }
        ],
    });

    if (p.isCancel(database)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
    }

    // Ask about additional features
    // const features = await p.multiselect({
    //     message: 'Select additional features:',
    //     options: [
    //         { value: 'auth', label: 'Authentication', hint: 'User login/signup' },
    //         { value: 'email', label: 'Email Service', hint: 'Send transactional emails' },
    //         { value: 'stripe', label: 'Stripe Integration', hint: 'Payment processing' },
    //         { value: 'analytics', label: 'Analytics', hint: 'Track user events' },
    //     ],
    //     required: false,
    // });

    // if (p.isCancel(features)) {
    //     p.cancel('Operation cancelled.');
    //     process.exit(0);
    // }

    // Confirm settings
    const shouldContinue = await p.confirm({
        message: 'Install dependencies after scaffolding?',
        initialValue: true,
    });

    if (p.isCancel(shouldContinue)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
    }

    const autoCode = await p.confirm({
        message: 'Open in VS Code after installation?',
        initialValue: false,
    });

    if (p.isCancel(autoCode)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
    }

    // Start spinner for file operations
    const s = p.spinner();
    s.start('Creating project');

    // Determine the target directory
    const targetDir = path.resolve(process.cwd(), projectName);

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Check if directory is empty
    const existing = fs.readdirSync(targetDir);
    if (existing.length > 0) {
        s.stop('Directory is not empty');
        p.outro(`Error: Directory ${targetDir} is not empty.`);
        process.exit(1);
    }

    // Copy template files
    const templateDir = path.resolve(__dirname, '..', 'template');
    const genericDir = path.resolve(__dirname, '..', 'generic');

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

    s.message('Copying template files');
    copyRecursive(templateDir, targetDir);

    // Update package.json with project name and database choice
    s.message('Updating configuration');
    const packageJsonPath = path.join(targetDir, 'package.json');
    let packageJson = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = packageJson.replace('{{PROJECT_NAME}}', projectName);
    fs.writeFileSync(packageJsonPath, packageJson);

    // Create a config file with the selected options
    const configPath = path.join(targetDir, 'project.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
        database,
        features,
    }, null, 2));

    // database specific setup
    const drizzleConfigPath = path.join(targetDir, 'drizzle.json');
    const dbIndexPath = path.join(targetDir, 'src', 'db', 'index.ts');
    let drizzleConfigJson = fs.readFileSync(drizzleConfigPath, 'utf8');
    let dbIndexJson = fs.readFileSync(dbIndexPath, 'utf8');
    if (database === 'sqlite') {
        // SQLite specific setup if needed
        dbIndexJson = dbIndexJson.replace('{{drizzleImport}}', "import { drizzle } from 'drizzle-orm/bun-sqlite';");
        drizzleConfigJson = drizzleConfigJson.replace('{{drizzleDialect}}', "sqlite");

        fs.copyFileSync(genericDir + "/bun_sqlite/schema.ts", targetDir + '/src/db/schema.ts');
    } else if (database === 'postgresql') {
        // PostgreSQL specific setup if needed
        dbIndexJson = dbIndexJson.replace('{{drizzleImport}}', "import { drizzle } from 'drizzle-orm/node-postgres';");
        drizzleConfigJson = drizzleConfigJson.replace('{{drizzleDialect}}', "postgresql");

        await new Promise((resolve, reject) => {
          const install = spawn('bun', ['install', '-d', '@types/pg', 'tsx'], { cwd: targetDir, stdio: 'pipe' });
          install.on('close', (code) => code === 0 ? resolve() : reject());
        });

        await new Promise((resolve, reject) => {
          const install = spawn('bun', ['install', 'pg'], { cwd: targetDir, stdio: 'pipe' });
          install.on('close', (code) => code === 0 ? resolve() : reject());
        });

        fs.copyFileSync(genericDir + "/postgresql/schema.ts", targetDir + '/src/db/schema.ts');
    }

    fs.writeFileSync(drizzleConfigPath, drizzleConfigJson);
    fs.writeFileSync(dbIndexPath, dbIndexJson);

    s.stop('Project created');

    // Install dependencies if confirmed
    if (shouldContinue) {
        const installSpinner = p.spinner();
        installSpinner.start('Installing dependencies');

        // Actual install:
        await new Promise((resolve, reject) => {
          const install = spawn('bun', ['install'], { cwd: targetDir, stdio: 'pipe' });
          install.on('close', (code) => code === 0 ? resolve() : reject());
        });

        installSpinner.stop('Dependencies installed');
    }

    // Open in VS Code if confirmed
    if (autoCode) {
        spawn("code", [targetDir], {
            stdio: "inherit",
            shell: true,
        });
    }

    // Final message
    let nextSteps = p.note(
        shouldContinue
            ? `cd ${projectName}\nbun run dev`
            : `cd ${projectName}\nbun install\nbun run dev`,
        'Next steps'
    );

    p.outro('Happy coding! 🚀');
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});