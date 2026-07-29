/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, ScriptOnce } from '@tanstack/react-router'
import { getStoredTheme, ThemeProvider } from "../components/theme-provider";
import appCss from "../index.css?url";
import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: '{{PROJECT_NAME}}' },
        ],
        links: [ { rel: "stylesheet", href: appCss } ],
    }),
    loader: async () => ({ _storedTheme: {{initialTheme}} }),
    component: RootComponent,
})

function RootComponent() {
    return (
        <RootDocument>
            <Outlet />
        </RootDocument>
    )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
    const { _storedTheme } = Route.useLoaderData();

    return (
        <html suppressHydrationWarning>
            <head>
                <HeadContent />
                <ScriptOnce
                    children={`
                        (function() {
                            const storedTheme = ${JSON.stringify(_storedTheme)};
                            if (storedTheme === 'system') {
                            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                            document.documentElement.className = systemTheme;
                            } else {
                            document.documentElement.className = storedTheme;
                            }
                        })();
                    `}
                />
            </head>
            <body>
                <ThemeProvider initialTheme={_storedTheme}>
                    {children}
                </ThemeProvider>
                <Scripts />
            </body>
        </html>
    )
}
