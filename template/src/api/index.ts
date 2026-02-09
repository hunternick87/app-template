// src/api/index.ts
import { Hono } from 'hono'

export const api = new Hono().basePath('/api')

api.get('/health', (c) => c.json({ ok: true, timestamp: Date.now() }))

api.get('/count', async (c) => {
    const fs = await import('node:fs')
    const filePath = './private/count.txt'
    const count = parseInt(await fs.promises.readFile(filePath, 'utf-8').catch(() => '0'))
    return c.json({ count })
})

api.post('/count', async (c) => {
    const fs = await import('node:fs')
    const filePath = './private/count.txt'
    const { incrementBy } = await c.req.json()
    const currentCount = parseInt(await fs.promises.readFile(filePath, 'utf-8').catch(() => '0'))
    const newCount = currentCount + incrementBy
    await fs.promises.writeFile(filePath, `${newCount}`)
    return c.json({ count: newCount })
})

export default api
