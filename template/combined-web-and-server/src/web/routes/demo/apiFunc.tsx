// src/routes/index.tsx
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { ThemeToggle } from '@/components/themeToggle'
import { readCount, incrementCount } from '@/api'
import { useQuery, useMutation } from '@tanstack/react-query'

export const Route = createFileRoute('/demo/apiFunc')({
    component: Home
})

function Home() {
    const router = useRouter()
    const routeContext = Route.useRouteContext()

    const query = useQuery({ queryKey: ['count'], queryFn: readCount })

    const mutation = useMutation({
        mutationFn: incrementCount,
        onSuccess: () => {
            // Invalidate and refetch
            routeContext.queryClient.invalidateQueries({ queryKey: ['count'] })
        },
    })

    return (
        <div className="flex min-h-svh flex-col items-center justify-center">
            <Button
                onClick={() => {
                    mutation.mutate(1)
                }}
            >Add 1 to {query.data}?</Button>
            <div className="mt-4">Current Count: {query.data}</div>
            <div className="mt-8">
                <ThemeToggle />
            </div>
        </div>
    )
}