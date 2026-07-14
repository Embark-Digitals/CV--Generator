import { NavLink, Outlet } from 'react-router-dom'
import {
  Briefcase,
  FileUp,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'Career Profile', icon: UserRound },
  { to: '/import', label: 'Import CV', icon: FileUp },
  { to: '/applications', label: 'Applications', icon: Briefcase },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const { signOut } = useAuth()

  return (
    <div className="bg-background flex min-h-screen flex-col md:flex-row">
      <aside className="border-border bg-card flex shrink-0 flex-col border-b md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold">
            CV
          </span>
          <span className="text-sm font-semibold tracking-tight">
            CV Machine
          </span>
        </div>
        <nav
          aria-label="Primary"
          className="flex flex-row gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:pb-0 md:pt-2"
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/15'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center justify-between gap-2 border-t p-3 md:flex">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            aria-label="Sign out"
          >
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex h-12 items-center justify-end gap-2 border-b px-4 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            aria-label="Sign out"
          >
            <LogOut aria-hidden="true" />
          </Button>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
