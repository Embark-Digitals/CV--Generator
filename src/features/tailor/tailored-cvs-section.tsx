import { Link, useNavigate } from 'react-router-dom'
import { FilePlus2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/features/profile/components/section-card'
import { useCreateTailoredCv, useTailoredCvs } from './hooks'

export function TailoredCvsSection({
  applicationId,
  jobTitle,
}: {
  applicationId: string
  jobTitle: string
}) {
  const navigate = useNavigate()
  const { data: cvs = [], isLoading } = useTailoredCvs(applicationId)
  const create = useCreateTailoredCv(applicationId)

  const createCv = () => {
    create.mutate(`CV — ${jobTitle}`, {
      onSuccess: (cv) =>
        navigate(`/applications/${applicationId}/tailor/${cv.id}`),
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tailored CVs</CardTitle>
          <CardDescription>
            Each tailored CV starts as a snapshot of your verified profile.
          </CardDescription>
        </div>
        <Button size="sm" onClick={createCv} disabled={create.isPending}>
          <FilePlus2 aria-hidden="true" />
          {create.isPending ? 'Creating…' : 'New tailored CV'}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm" role="status">
            Loading…
          </p>
        ) : cvs.length === 0 ? (
          <EmptyState>
            No tailored CVs yet. Create one to start tailoring.
          </EmptyState>
        ) : (
          <ul className="divide-y">
            {cvs.map((cv) => (
              <li key={cv.id} className="py-2.5">
                <Link
                  to={`/applications/${applicationId}/tailor/${cv.id}`}
                  className="flex items-center justify-between gap-2 hover:underline"
                >
                  <span className="text-sm font-medium">{cv.title}</span>
                  <span className="flex items-center gap-2">
                    <Badge
                      variant={
                        cv.status === 'draft'
                          ? 'warning'
                          : cv.status === 'submitted'
                            ? 'success'
                            : 'secondary'
                      }
                    >
                      {cv.status}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {new Date(cv.updated_at).toLocaleDateString()}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
