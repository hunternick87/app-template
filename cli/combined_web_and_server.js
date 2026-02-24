#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from "node:child_process";
import * as p from '@clack/prompts';
import { askCodeEditor, askDatabase } from './quetsions.js';
import { checkDirEmpty, makeDir, copyRecursive, safeUnlink, createConfigFile } from './utls.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createCombinedProject(projectName) {
    const database = await askDatabase()
    const themeMode = await askTheme()
    const installDeps = await askInstallDeps();
    const codeEditor = await askCodeEditor();

    // Start spinner for file operations
    const s = p.spinner();
    s.start('Creating project');

    const targetDir = path.resolve(process.cwd(), projectName);

    // Create target directory if it doesn't exist
    makeDir(projectName);

    // Check if directory is empty
    checkDirEmpty(projectName, s);

    const templateDir = path.resolve(__dirname, '..', 'template', 'combined-web-and-server');
    const genericDir = path.resolve(templateDir, '..', 'generic');

    s.message('Copying template files');
    copyRecursive(templateDir, targetDir);

    // Update package.json with project name
    s.message('Updating configuration');
    const packageJsonPath = path.join(targetDir, 'package.json');
    let packageJsonText = fs.readFileSync(packageJsonPath, 'utf8');
    packageJsonText = packageJsonText.replace('{{PROJECT_NAME}}', projectName);
    fs.writeFileSync(packageJsonPath, packageJsonText);

    // Create a config file with the selected options
    createConfigFile(projectName, {
        platform: 'combined',
        database,
        themeMode,
    });

    await drizzle(targetDir, database);
}

async function main() {

    function safeWriteFile(filePath, contents) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, contents);
    }

    function updatePackageJson(mutator) {
        const obj = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        mutator(obj);
        fs.writeFileSync(packageJsonPath, JSON.stringify(obj, null, 2) + '\n');
    }


    // Theme mode setup
    if (themeMode !== 'both') {
        const themeProviderPath = path.join(targetDir, 'src', 'web', 'components', 'theme-provider.tsx');
        const themeTogglePath = path.join(targetDir, 'src', 'web', 'components', 'themeToggle.tsx');
        safeUnlink(themeProviderPath);
        safeUnlink(themeTogglePath);

        const rootRoutePath = path.join(targetDir, 'src', 'web', 'routes', '__root.tsx');
        const indexRoutePath = path.join(targetDir, 'src', 'web', 'routes', 'index.tsx');
        const apiFuncRoutePath = path.join(targetDir, 'src', 'web', 'routes', 'demo', 'apiFunc.tsx');
        const serverFuncRoutePath = path.join(targetDir, 'src', 'web', 'routes', 'demo', 'serverFunc.tsx');

        const htmlAttrs = themeMode === 'dark'
            ? ' className="dark" suppressHydrationWarning'
            : ' suppressHydrationWarning';

        safeWriteFile(rootRoutePath, `/// <reference types="vite/client" />\nimport type { ReactNode } from 'react'\nimport { Outlet, createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router'\nimport appCss from "../index.css?url";\nimport type { QueryClient } from '@tanstack/react-query'\n\nexport const Route = createRootRouteWithContext<{\n  queryClient: QueryClient\n}>()({\n  head: () => ({\n    meta: [\n      { charSet: 'utf-8' },\n      { name: 'viewport', content: 'width=device-width, initial-scale=1' },\n      { title: 'TanStack Start Starter' },\n    ],\n    links: [{ rel: 'stylesheet', href: appCss }],\n  }),\n  component: RootComponent,\n})\n\nfunction RootComponent() {\n  return (\n    <RootDocument>\n      <Outlet />\n    </RootDocument>\n  )\n}\n\nfunction RootDocument({ children }: Readonly<{ children: ReactNode }>) {\n  return (\n    <html${htmlAttrs}>\n      <head>\n        <HeadContent />\n      </head>\n      <body>\n        {children}\n        <Scripts />\n      </body>\n    </html>\n  )\n}\n`);

        safeWriteFile(indexRoutePath, `// src/routes/index.tsx\nimport { createFileRoute, Link } from '@tanstack/react-router'\n\nexport const Route = createFileRoute('/')({\n  component: Home,\n})\n\nfunction Home() {\n  return (\n    <div className=\"flex min-h-svh flex-col items-center justify-center\">\n      <div className=\"mt-8 space-x-4\">\n        <Link to=\"/demo/apiFunc\">\n          <button className=\"btn\">Demo: API Function</button>\n        </Link>\n        <Link to=\"/demo/serverFunc\">\n          <button className=\"btn\">Demo: Server Function</button>\n        </Link>\n      </div>\n    </div>\n  )\n}\n`);

        safeWriteFile(apiFuncRoutePath, `// src/routes/index.tsx\nimport { createFileRoute, useRouter } from '@tanstack/react-router'\nimport { Button } from "@/components/ui/button"\nimport { readCount, incrementCount } from '@/api'\nimport { useQuery, useMutation } from '@tanstack/react-query'\n\nexport const Route = createFileRoute('/demo/apiFunc')({\n  component: Home\n})\n\nfunction Home() {\n  const router = useRouter()\n  const routeContext = Route.useRouteContext()\n\n  const query = useQuery({ queryKey: ['count'], queryFn: readCount })\n\n  const mutation = useMutation({\n    mutationFn: incrementCount,\n    onSuccess: () => {\n      // Invalidate and refetch\n      routeContext.queryClient.invalidateQueries({ queryKey: ['count'] })\n    },\n  })\n\n  return (\n    <div className=\"flex min-h-svh flex-col items-center justify-center\">\n      <Button\n        onClick={() => {\n          mutation.mutate(1)\n        }}\n      >Add 1 to {query.data}?</Button>\n      <div className=\"mt-4\">Current Count: {query.data}</div>\n    </div>\n  )\n}\n`);

        safeWriteFile(serverFuncRoutePath, `// src/routes/index.tsx\nimport * as fs from 'node:fs'\nimport { createFileRoute, useRouter } from '@tanstack/react-router'\nimport { createServerFn } from '@tanstack/react-start'\nimport { Button } from "@/components/ui/button"\n\nconst filePath = 'private/count.txt'\n\nasync function readCount() {\n  return parseInt(await fs.promises.readFile(filePath, 'utf-8').catch(() => '0'))\n}\n\nconst getCount = createServerFn({ method: 'GET' }).handler(() => {\n  return readCount()\n})\n\nconst updateCount = createServerFn({ method: 'POST' })\n  .inputValidator((d: number) => d)\n  .handler(async ({ data }) => {\n    const count = await readCount()\n    await fs.promises.writeFile(filePath, String(count + data))\n  })\n\nexport const Route = createFileRoute('/demo/serverFunc')({\n  component: Home,\n  loader: async () => await getCount(),\n})\n\nfunction Home() {\n  const router = useRouter()\n  const state = Route.useLoaderData()\n\n  return (\n    <div className=\"flex min-h-svh flex-col items-center justify-center\">\n      <Button\n        onClick={() => {\n          updateCount({ data: 1 }).then(() => {\n            router.invalidate()\n          })\n        }}\n      >Add 1 to {state}?</Button>\n      <div className=\"mt-4\">Current Count: {state}</div>\n    </div>\n  )\n}\n`);

        const cssPath = path.join(targetDir, 'src', 'web', 'index.css');
        if (themeMode === 'light') {
            safeWriteFile(cssPath, `@import "tailwindcss";\n@import "tw-animate-css";\n\n@theme inline {\n  --radius-sm: calc(var(--radius) - 4px);\n  --radius-md: calc(var(--radius) - 2px);\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) + 4px);\n  --radius-2xl: calc(var(--radius) + 8px);\n  --radius-3xl: calc(var(--radius) + 12px);\n  --radius-4xl: calc(var(--radius) + 16px);\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --color-card: var(--card);\n  --color-card-foreground: var(--card-foreground);\n  --color-popover: var(--popover);\n  --color-popover-foreground: var(--popover-foreground);\n  --color-primary: var(--primary);\n  --color-primary-foreground: var(--primary-foreground);\n  --color-secondary: var(--secondary);\n  --color-secondary-foreground: var(--secondary-foreground);\n  --color-muted: var(--muted);\n  --color-muted-foreground: var(--muted-foreground);\n  --color-accent: var(--accent);\n  --color-accent-foreground: var(--accent-foreground);\n  --color-destructive: var(--destructive);\n  --color-border: var(--border);\n  --color-input: var(--input);\n  --color-ring: var(--ring);\n  --color-chart-1: var(--chart-1);\n  --color-chart-2: var(--chart-2);\n  --color-chart-3: var(--chart-3);\n  --color-chart-4: var(--chart-4);\n  --color-chart-5: var(--chart-5);\n  --color-sidebar: var(--sidebar);\n  --color-sidebar-foreground: var(--sidebar-foreground);\n  --color-sidebar-primary: var(--sidebar-primary);\n  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);\n  --color-sidebar-accent: var(--sidebar-accent);\n  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);\n  --color-sidebar-border: var(--sidebar-border);\n  --color-sidebar-ring: var(--sidebar-ring);\n}\n\n:root {\n  --radius: 0.625rem;\n  --background: oklch(1 0 0);\n  --foreground: oklch(0.145 0 0);\n  --card: oklch(1 0 0);\n  --card-foreground: oklch(0.145 0 0);\n  --popover: oklch(1 0 0);\n  --popover-foreground: oklch(0.145 0 0);\n  --primary: oklch(0.205 0 0);\n  --primary-foreground: oklch(0.985 0 0);\n  --secondary: oklch(0.97 0 0);\n  --secondary-foreground: oklch(0.205 0 0);\n  --muted: oklch(0.97 0 0);\n  --muted-foreground: oklch(0.556 0 0);\n  --accent: oklch(0.97 0 0);\n  --accent-foreground: oklch(0.205 0 0);\n  --destructive: oklch(0.577 0.245 27.325);\n  --border: oklch(0.922 0 0);\n  --input: oklch(0.922 0 0);\n  --ring: oklch(0.708 0 0);\n  --chart-1: oklch(0.646 0.222 41.116);\n  --chart-2: oklch(0.6 0.118 184.704);\n  --chart-3: oklch(0.398 0.07 227.392);\n  --chart-4: oklch(0.828 0.189 84.429);\n  --chart-5: oklch(0.769 0.188 70.08);\n  --sidebar: oklch(0.985 0 0);\n  --sidebar-foreground: oklch(0.145 0 0);\n  --sidebar-primary: oklch(0.205 0 0);\n  --sidebar-primary-foreground: oklch(0.985 0 0);\n  --sidebar-accent: oklch(0.97 0 0);\n  --sidebar-accent-foreground: oklch(0.205 0 0);\n  --sidebar-border: oklch(0.922 0 0);\n  --sidebar-ring: oklch(0.708 0 0);\n}\n\n@layer base {\n  * {\n    @apply border-border outline-ring/50;\n  }\n  body {\n    @apply bg-background text-foreground;\n  }\n}\n`);
        } else {
            safeWriteFile(cssPath, `@import "tailwindcss";\n@import "tw-animate-css";\n\n@theme inline {\n  --radius-sm: calc(var(--radius) - 4px);\n  --radius-md: calc(var(--radius) - 2px);\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) + 4px);\n  --radius-2xl: calc(var(--radius) + 8px);\n  --radius-3xl: calc(var(--radius) + 12px);\n  --radius-4xl: calc(var(--radius) + 16px);\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --color-card: var(--card);\n  --color-card-foreground: var(--card-foreground);\n  --color-popover: var(--popover);\n  --color-popover-foreground: var(--popover-foreground);\n  --color-primary: var(--primary);\n  --color-primary-foreground: var(--primary-foreground);\n  --color-secondary: var(--secondary);\n  --color-secondary-foreground: var(--secondary-foreground);\n  --color-muted: var(--muted);\n  --color-muted-foreground: var(--muted-foreground);\n  --color-accent: var(--accent);\n  --color-accent-foreground: var(--accent-foreground);\n  --color-destructive: var(--destructive);\n  --color-border: var(--border);\n  --color-input: var(--input);\n  --color-ring: var(--ring);\n  --color-chart-1: var(--chart-1);\n  --color-chart-2: var(--chart-2);\n  --color-chart-3: var(--chart-3);\n  --color-chart-4: var(--chart-4);\n  --color-chart-5: var(--chart-5);\n  --color-sidebar: var(--sidebar);\n  --color-sidebar-foreground: var(--sidebar-foreground);\n  --color-sidebar-primary: var(--sidebar-primary);\n  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);\n  --color-sidebar-accent: var(--sidebar-accent);\n  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);\n  --color-sidebar-border: var(--sidebar-border);\n  --color-sidebar-ring: var(--sidebar-ring);\n}\n\n:root {\n  --radius: 0.625rem;\n  --background: oklch(0.145 0 0);\n  --foreground: oklch(0.985 0 0);\n  --card: oklch(0.205 0 0);\n  --card-foreground: oklch(0.985 0 0);\n  --popover: oklch(0.205 0 0);\n  --popover-foreground: oklch(0.985 0 0);\n  --primary: oklch(0.922 0 0);\n  --primary-foreground: oklch(0.205 0 0);\n  --secondary: oklch(0.269 0 0);\n  --secondary-foreground: oklch(0.985 0 0);\n  --muted: oklch(0.269 0 0);\n  --muted-foreground: oklch(0.708 0 0);\n  --accent: oklch(0.269 0 0);\n  --accent-foreground: oklch(0.985 0 0);\n  --destructive: oklch(0.704 0.191 22.216);\n  --border: oklch(1 0 0 / 10%);\n  --input: oklch(1 0 0 / 15%);\n  --ring: oklch(0.556 0 0);\n  --chart-1: oklch(0.488 0.243 264.376);\n  --chart-2: oklch(0.696 0.17 162.48);\n  --chart-3: oklch(0.769 0.188 70.08);\n  --chart-4: oklch(0.627 0.265 303.9);\n  --chart-5: oklch(0.645 0.246 16.439);\n  --sidebar: oklch(0.205 0 0);\n  --sidebar-foreground: oklch(0.985 0 0);\n  --sidebar-primary: oklch(0.488 0.243 264.376);\n  --sidebar-primary-foreground: oklch(0.985 0 0);\n  --sidebar-accent: oklch(0.269 0 0);\n  --sidebar-accent-foreground: oklch(0.985 0 0);\n  --sidebar-border: oklch(1 0 0 / 10%);\n  --sidebar-ring: oklch(0.556 0 0);\n}\n\n@layer base {\n  * {\n    @apply border-border outline-ring/50;\n  }\n  body {\n    @apply bg-background text-foreground;\n  }\n}\n`);
        }
    }

    // Electron platform overlay
    if (platform === 'electron') {
        const electronOverlayDir = path.resolve(genericDir, 'electron');
        if (fs.existsSync(electronOverlayDir)) {
            s.message('Adding Electron files');
            copyRecursive(electronOverlayDir, targetDir);
        }

        updatePackageJson((pkg) => {
            pkg.devDependencies = pkg.devDependencies || {};
            pkg.scripts = pkg.scripts || {};
            if (!pkg.devDependencies.electron) {
                pkg.devDependencies.electron = '^32.0.0';
            }
            if (!pkg.scripts['dev:electron']) {
                pkg.scripts['dev:electron'] = 'node scripts/electron-dev.mjs';
            }
            if (!pkg.scripts['start:electron']) {
                pkg.scripts['start:electron'] = 'node scripts/electron-start.mjs';
            }
        });

        const readmePath = path.join(targetDir, 'README.md');
        if (fs.existsSync(readmePath)) {
            const readme = fs.readFileSync(readmePath, 'utf8');
            if (!readme.includes('## Electron')) {
                fs.writeFileSync(readmePath, `${readme.trim()}\n\n## Electron\n\nRun the desktop app in dev (starts the web dev server + Electron):\n\n\`\`\`bash\nbun run dev:electron\n\`\`\`\n\nRun the desktop app against the production build:\n\n\`\`\`bash\nbun run build\nbun run start:electron\n\`\`\`\n`);
            }
        }
    }

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

    if (codeEditor) {
        const editorCommands = {
            vscode: 'code',
            antigravity: 'antigravity',
        };

        codeEditor.forEach((editor) => {
            const command = editorCommands[editor];
            if (command) {
                spawn(command, [targetDir], {
                    stdio: "inherit",
                    shell: true,
                });
            }
        });
    }

    // Final message
    const devCommand = platform === 'electron' ? 'bun run dev:electron' : 'bun run dev'
    let nextSteps = p.note(
        shouldContinue
            ? `cd ${projectName}\n${devCommand}`
            : `cd ${projectName}\nbun install\n${devCommand}`,
        'Next steps'
    );

    p.outro('Happy coding! 🚀');
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
