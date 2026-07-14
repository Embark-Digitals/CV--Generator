import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Toggle built on a real checkbox for native semantics. */
export const Switch = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => (
  <span className={cn('relative inline-flex items-center', className)}>
    <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
    <span
      aria-hidden="true"
      className="bg-input peer-checked:bg-primary peer-focus-visible:outline-ring block h-5 w-9 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
    />
    <span
      aria-hidden="true"
      className="bg-card pointer-events-none absolute left-0.5 top-0.5 block h-4 w-4 rounded-full shadow transition-transform peer-checked:translate-x-4"
    />
  </span>
))
Switch.displayName = 'Switch'
