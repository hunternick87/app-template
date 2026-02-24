import * as p from '@clack/prompts';

export async function askCodeEditor() {
    const codeEditor = await p.multiselect({
        message: 'Open in code editor after installation?',
        options: [
            { value: 'vscode', label: 'VS Code' },
            { value: 'antigravity', label: 'Antigravity' },
        ],
        required: false,
    });

    if (p.isCancel(codeEditor)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
    }

    return codeEditor;
}

export async function askDatabase() {
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

    return database;
}

export async function askTheme() {
    const themeMode = await p.select({
        message: 'Default color mode?',
        options: [
            { value: 'light', label: 'Light only', hint: 'No theme switcher' },
            { value: 'dark', label: 'Dark only', hint: 'No theme switcher' },
            { value: 'both', label: 'Both (light + dark)', hint: 'Includes ThemeProvider + toggle' },
        ],
    });

    if (p.isCancel(themeMode)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
    }

    return themeMode;
}

export async function askInstallDeps() {
    const installDeps = await p.confirm({
        message: 'Install dependencies after setup?',
        initialValue: true,
    });

    if (p.isCancel(installDeps)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
    }

    return installDeps;
}