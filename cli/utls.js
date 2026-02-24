import fs from 'fs';
import path from 'path';
import * as p from '@clack/prompts';

export function makeDir(projectName) {
    const targetDir = path.resolve(process.cwd(), projectName);
    if (!fs.existsSync(targetDir)) {fs.mkdirSync(targetDir, { recursive: true })}
}

export function checkDirEmpty(projectName, s) {
    const targetDir = path.resolve(process.cwd(), projectName);
    const existing = fs.readdirSync(targetDir);
    if (existing.length > 0) {
        s.stop('Directory is not empty');
        p.outro(`Error: Directory ${targetDir} is not empty.`);
        process.exit(1);
    }
}

export function copyRecursive(src, dest) {
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

export function safeUnlink(filePath) {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
        // ignore
    }
}

export function safeWriteFile(filePath, contents) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
}

export function updateProjectNameInFiles(projectName, files) {
    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const updatedContent = content.replace(/__PROJECT_NAME__/g, projectName);
        fs.writeFileSync(file, updatedContent, 'utf-8');
    });
}

export function createConfigFile(projectName, config) {
    const configPath = path.join(process.cwd(), projectName, 'project.config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}