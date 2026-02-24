import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
    const queryClient = new QueryClient()

    const router = createRouter({
        routeTree,
        scrollRestoration: true,
        context: { queryClient },
        defaultNotFoundComponent: () => <div>Not Found</div>,
    })

    setupRouterSsrQueryIntegration({
        router,
        queryClient,
    })

    return router
}