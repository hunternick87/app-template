import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'


// https://vite.dev/config/
export default defineConfig({
    server: {
        port: 3000,
    },
    plugins: [
        tanstackStart({
            router: {
                entry: 'web/router.tsx',
                routesDirectory: 'web/routes',
                generatedRouteTree: 'web/routeTree.gen.ts',
            },
        }),
        // react's vite plugin must come after start's vite plugin
        viteReact(),
        tailwindcss(),
    ],
    resolve: {
        tsconfigPaths: true,
        alias: {
            "@": path.resolve(__dirname, "src/web"),
        },
    },
})
