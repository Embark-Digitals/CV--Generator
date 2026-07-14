import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        That page does not exist.
      </p>
      <Link
        to="/dashboard"
        className="text-primary text-sm underline-offset-4 hover:underline"
      >
        Back to dashboard
      </Link>
    </main>
  )
}
