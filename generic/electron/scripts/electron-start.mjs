import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const electronPath = require('electron')

const APP_URL = process.env.APP_URL || 'http://localhost:3000'

async function waitForUrl(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) return
    } catch {
      // ignore
    }
    await delay(350)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function killProcess(proc) {
  if (!proc || proc.killed) return
  try {
    proc.kill('SIGINT')
  } catch {
    try {
      proc.kill()
    } catch {
      // ignore
    }
  }
}

async function main() {
  const server = spawn('bun', ['run', 'start'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
  })

  try {
    await waitForUrl(APP_URL)

    const electron = spawn(electronPath, ['electron/main.mjs'], {
      stdio: 'inherit',
      env: { ...process.env, APP_URL },
    })

    const stopAll = () => {
      killProcess(electron)
      killProcess(server)
    }

    process.on('SIGINT', () => {
      stopAll()
      process.exit(130)
    })

    electron.on('exit', (code) => {
      killProcess(server)
      process.exit(code ?? 0)
    })

    server.on('exit', (code) => {
      if (code && code !== 0) {
        killProcess(electron)
        process.exit(code)
      }
    })
  } catch (err) {
    killProcess(server)
    throw err
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
