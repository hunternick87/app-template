// src/api/index.ts
import { Hono } from 'hono'
import { z } from 'zod'

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
    const body = z.object({ incrementBy: z.number().int().min(-100).max(100) }).safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'incrementBy must be an integer between -100 and 100' }, 400)
    const currentCount = parseInt(await fs.promises.readFile(filePath, 'utf-8').catch(() => '0'))
    const newCount = currentCount + body.data.incrementBy
    await fs.promises.writeFile(filePath, `${newCount}`)
    return c.json({ count: newCount })
})

export default api
