import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
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
        tsConfigPaths(),
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
        alias: {
            "@": path.resolve(__dirname, "src/web"),
        },
    },
})
