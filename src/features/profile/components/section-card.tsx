import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function SectionCard({
  title,
  description,
  onAdd,
  addLabel,
  children,
}: {
  title: string
  description?: string
  onAdd?: () => void
  addLabel?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {onAdd && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus aria-hidden="true" /> {addLabel ?? 'Add'}
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
      {children}
    </p>
  )
}
