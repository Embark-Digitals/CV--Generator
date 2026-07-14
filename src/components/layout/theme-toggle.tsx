import { Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme, type Theme } from '@/providers/theme-provider'
import { Button } from '@/components/ui/button'

const order: Theme[] = ['light', 'dark', 'system']

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = order[(order.indexOf(theme) + 1) % order.length]

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : SunMoon

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Appearance: ${theme}. Switch to ${next}.`}
      title={`Appearance: ${theme}`}
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}
