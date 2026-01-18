// src/routes/index.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/themeToggle'


export const Route = createFileRoute('/')({
    component: Home,
})

function Home() {

    return (
        <div className="flex min-h-svh flex-col items-center justify-center">
            <div className="mt-8">
                <ThemeToggle />
            </div>
            <div className="mt-8 space-x-4">
                <Link to="/demo/apiFunc">
                    <button className="btn">Demo: API Function</button>
                </Link>
                <Link to="/demo/serverFunc">
                    <button className="btn">Demo: Server Function</button>
                </Link>
            </div>
        </div>
    )
}