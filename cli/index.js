#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from "node:child_process";
import * as p from '@clack/prompts';

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

    const platform = await p.select({
        message: 'What are you building?',
        options: [
            { value: 'combined', label: 'Website With Server', hint: 'Full stack web app with a server and database' },
            { value: 'desktop', label: 'Desktop', hint: 'Desktop app wrapper around the web app' },
            { value: 'server', label: 'Server Only', hint: 'Backend server with API and database' },
            { value: 'website', label: 'Website Only', hint: 'Frontend web app without a server' },
            { value: 'multi', label: 'Multi-Platform', hint: 'Combined web + server + desktop projects' }
        ],
    });

    if (p.isCancel(platform)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
    }

    if (platform === 'combined') {
        await createCombinedProject(projectName).catch((error) => {
            console.error('Error creating combined project:', error);
            process.exit(1);
        });
    } else if (platform === 'desktop') {
        await createDesktopProject(projectName).catch((error) => {
            console.error('Error creating desktop project:', error);
            process.exit(1);
        });
    } else if (platform === 'server') {
        await createServerProject(projectName).catch((error) => {
            console.error('Error creating server project:', error);
            process.exit(1);
        });
    } else if (platform === 'website') {
        await createWebsiteProject(projectName).catch((error) => {
            console.error('Error creating website project:', error);
            process.exit(1);
        });
    } else if (platform === 'multi') {
        await createMultiPlatformProject(projectName).catch((error) => {
            console.error('Error creating multi-platform project:', error);
            process.exit(1);
        });
    }
    
    p.outro('🎉 Project setup complete! Happy coding!');
    
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
