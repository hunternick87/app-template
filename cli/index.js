#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import * as p from '@clack/prompts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectNamePattern = /^[a-z0-9][a-z0-9-]*$/

function validateProjectName(value) {
  if (!value) return 'Project name is required'
  if (!projectNamePattern.test(value)) return 'Use lowercase letters, numbers, and hyphens only'
  return undefined
}

function copyRecursive(source, destination) {
  const stats = fs.statSync(source)
  if (stats.isDirectory()) {
    if (['node_modules', 'dist', '.env'].includes(path.basename(source))) return
    fs.mkdirSync(destination, { recursive: true })
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry))
    }
    return
  }
  fs.copyFileSync(source, destination)
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.once('error', reject)
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)))
  })
}

function configureDatabase(targetDir, database) {
  const dbIndexPath = path.join(targetDir, 'src', 'db', 'index.ts')
  const drizzleConfigPath = path.join(targetDir, 'drizzle.config.ts')
  const schemaSource = path.join(__dirname, '..', 'generic', 'db', database, 'schema.ts')

  const setup = database === 'sqlite'
    ? "import { createClient } from '@libsql/client';\nimport { drizzle } from 'drizzle-orm/libsql';\n\nconst client = createClient({ url: process.env.DATABASE_URL ?? 'file:local.db' });\nconst db = drizzle(client);"
    : "import { Pool } from 'pg';\nimport { drizzle } from 'drizzle-orm/node-postgres';\n\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });\nconst db = drizzle(pool);"
  const credentials = database === 'sqlite'
    ? "dialect: 'sqlite',\n    dbCredentials: { url: process.env.DATABASE_URL ?? 'file:local.db' },"
    : "dialect: 'postgresql',\n    dbCredentials: { url: process.env.DATABASE_URL! },"

  fs.copyFileSync(schemaSource, path.join(targetDir, 'src', 'db', 'schema.ts'))
  fs.writeFileSync(dbIndexPath, fs.readFileSync(dbIndexPath, 'utf8').replace('{{drizzleSetup}}', setup))
  fs.writeFileSync(drizzleConfigPath, fs.readFileSync(drizzleConfigPath, 'utf8').replace('{{drizzleConfig}}', credentials))
}

function configureTheme(targetDir, themeMode) {
  const rootRoutePath = path.join(targetDir, 'src', 'web', 'routes', '__root.tsx')
  const rootRoute = fs.readFileSync(rootRoutePath, 'utf8')
  const initialTheme = themeMode === 'both' ? 'await getStoredTheme()' : `'${themeMode}' as const`
  fs.writeFileSync(rootRoutePath, rootRoute.replace('{{initialTheme}}', initialTheme))

  if (themeMode === 'both') return

  for (const route of ['index.tsx', 'demo/apiFunc.tsx', 'demo/serverFunc.tsx']) {
    const routePath = path.join(targetDir, 'src', 'web', 'routes', route)
    const contents = fs.readFileSync(routePath, 'utf8')
      .replace(/^import \{ ThemeToggle \}.*\n/m, '')
      .replace(/\s*<div className="mt-8">\s*<ThemeToggle \/>\s*<\/div>/g, '')
    fs.writeFileSync(routePath, contents)
  }
}

function replaceTemplateTokens(targetDir, projectName) {
  for (const relativePath of ['package.json', 'README.md', 'src/web/routes/__root.tsx']) {
    const filePath = path.join(targetDir, relativePath)
    fs.writeFileSync(filePath, fs.readFileSync(filePath, 'utf8').replaceAll('{{PROJECT_NAME}}', projectName))
  }
}

async function main() {
  p.intro('Create App Template')

  const args = process.argv.slice(2)
  const unattended = args.includes('--yes')
  const databaseFlag = args.find((arg) => arg.startsWith('--database='))?.split('=')[1]
  const themeFlag = args.find((arg) => arg.startsWith('--theme='))?.split('=')[1]
  let projectName = args.find((arg) => !arg.startsWith('--'))
  if (projectName) {
    const error = validateProjectName(projectName)
    if (error) throw new Error(error)
  } else {
    projectName = await p.text({ message: 'Project name', placeholder: 'my-awesome-app', validate: validateProjectName })
    if (p.isCancel(projectName)) return p.cancel('Operation cancelled.')
  }

  const database = unattended ? (databaseFlag ?? 'sqlite') : await p.select({
    message: 'Database',
    options: [
      { value: 'sqlite', label: 'SQLite', hint: 'Local file database' },
      { value: 'postgresql', label: 'PostgreSQL', hint: 'Networked database' },
    ],
  })
  if (!['sqlite', 'postgresql'].includes(database)) throw new Error('Database must be sqlite or postgresql')
  if (p.isCancel(database)) return p.cancel('Operation cancelled.')

  const themeMode = unattended ? (themeFlag ?? 'both') : await p.select({
    message: 'Color mode',
    options: [
      { value: 'light', label: 'Light only' },
      { value: 'dark', label: 'Dark only' },
      { value: 'both', label: 'Light and dark' },
    ],
  })
  if (!['light', 'dark', 'both'].includes(themeMode)) throw new Error('Theme must be light, dark, or both')
  if (p.isCancel(themeMode)) return p.cancel('Operation cancelled.')

  const installDependencies = unattended ? !args.includes('--no-install') : await p.confirm({ message: 'Install dependencies?', initialValue: true })
  if (p.isCancel(installDependencies)) return p.cancel('Operation cancelled.')

  const targetDir = path.resolve(process.cwd(), projectName)
  if (path.dirname(targetDir) !== path.resolve(process.cwd())) {
    throw new Error('Project must be created directly inside the current directory')
  }
  if (fs.existsSync(targetDir)) {
    throw new Error(`Target directory already exists: ${projectName}`)
  }

  const spinner = p.spinner()
  spinner.start('Creating project')
  copyRecursive(path.join(__dirname, '..', 'template'), targetDir)

  replaceTemplateTokens(targetDir, projectName)
  configureDatabase(targetDir, database)
  configureTheme(targetDir, themeMode)
  fs.writeFileSync(path.join(targetDir, 'project.config.json'), JSON.stringify({ database, themeMode }, null, 2) + '\n')
  spinner.stop('Project created')

  if (installDependencies) {
    const installSpinner = p.spinner()
    installSpinner.start('Installing dependencies')
    await run('bun', ['install'], targetDir)
    installSpinner.stop('Dependencies installed')
  }

  p.note(`cd ${projectName}\nbun run dev`, 'Next steps')
  p.outro('Happy coding!')
}

if (import.meta.main) {
  main().catch((error) => {
    p.cancel(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

export { validateProjectName }
