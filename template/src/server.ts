// src/server.ts
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { api } from './api'
import path from 'path'

const clientDistDir = path.resolve(process.cwd(), 'dist/client')
const isProd = import.meta.env.PROD

export default createServerEntry({
    async fetch(request) {
        const url = new URL(request.url)

        // Route API requests to Hono
        if (url.pathname.startsWith('/api')) {
            return api.fetch(request)
        }

        // Serve built client assets in production (CSS/JS/fonts)
        if (isProd && (url.pathname.startsWith('/assets/') || url.pathname === '/favicon.ico')) {
            const fsPath = path.join(clientDistDir, url.pathname.slice(1))
            const file = (globalThis as any)?.Bun?.file?.(fsPath)
            if (file && (await file.exists())) {
                return new Response(file)
            }
            return new Response('Not Found', { status: 404 })
        }

        // Fall back to TanStack Start for SSR/frontend routes
        return handler.fetch(request)
    },
})
