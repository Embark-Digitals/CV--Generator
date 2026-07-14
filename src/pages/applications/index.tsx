import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/features/profile/components/section-card'
import { StatusBadge } from '@/features/applications/status'
import {
  useApplications,
  useCreateApplication,
} from '@/features/applications/hooks'
import { uploadAdvertFile } from '@/features/applications/api'
import { extractFileText } from '@/lib/extract-text'
import { useUserId } from '@/features/profile/hooks'

export function ApplicationsPage() {
  const userId = useUserId()
  const navigate = useNavigate()
  const { data: applications = [], isLoading } = useApplications()
  const createApplication = useCreateApplication()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'active' | 'all'>('active')

  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [location, setLocation] = useState('')
  const [advertSource, setAdvertSource] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [advertText, setAdvertText] = useState('')
  const [advertFile, setAdvertFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const visible = applications.filter((a) =>
    filter === 'all'
      ? true
      : !['unsuccessful', 'withdrawn', 'archived'].includes(a.status),
  )

  const resetForm = () => {
    setCompany('')
    setJobTitle('')
    setLocation('')
    setAdvertSource('')
    setClosingDate('')
    setAdvertText('')
    setAdvertFile(null)
  }

  const submit = async () => {
    if (!company.trim() || !jobTitle.trim()) {
      toast.error('Company and job title are required.')
      return
    }
    setBusy(true)
    try {
      let fileText = ''
      if (advertFile) {
        fileText = await extractFileText(advertFile)
      }
      const text = advertText.trim() || fileText
      const created = await createApplication.mutateAsync({
        company: company.trim(),
        job_title: jobTitle.trim(),
        location: location.trim() || null,
        advert_source: advertSource.trim() || null,
        closing_date: closingDate || null,
        advert_text: text || null,
      })
      if (advertFile) {
        await uploadAdvertFile(userId, created.id, advertFile, fileText)
      }
      resetForm()
      setOpen(false)
      navigate(`/applications/${created.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the application.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Applications"
        description="Track every job application from consideration to outcome."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" /> New application
          </Button>
        }
      />

      <div className="mb-4">
        <Label htmlFor="filter" className="sr-only">
          Filter applications
        </Label>
        <Select
          id="filter"
          className="w-44"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'active' | 'all')}
        >
          <option value="active">Active applications</option>
          <option value="all">All applications</option>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm" role="status">
          Loading applications…
        </p>
      ) : visible.length === 0 ? (
        <EmptyState>
          No applications yet. Add the first job you are considering.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map((app) => (
            <li key={app.id}>
              <Link to={`/applications/${app.id}`} className="group block">
                <Card className="group-hover:border-primary/40 transition-colors">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{app.job_title}</p>
                      <p className="text-muted-foreground truncate text-sm">
                        {app.company}
                        {app.location ? ` · ${app.location}` : ''}
                        {app.closing_date
                          ? ` · closes ${app.closing_date}`
                          : ''}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New application"
        description="Paste the advertisement text or upload the original PDF/DOCX — the full advert is always preserved."
        className="max-w-2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="space-y-4"
          noValidate
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="app-company">Company *</Label>
              <Input
                id="app-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-title">Job title *</Label>
              <Input
                id="app-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-location">Location</Label>
              <Input
                id="app-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-source">Where you found it</Label>
              <Input
                id="app-source"
                placeholder="e.g. PNet, referral"
                value={advertSource}
                onChange={(e) => setAdvertSource(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-closing">Closing date</Label>
              <Input
                id="app-closing"
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-file">Advert file (PDF/DOCX)</Label>
              <Input
                id="app-file"
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setAdvertFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="app-advert">Advertisement text</Label>
            <Textarea
              id="app-advert"
              rows={8}
              placeholder="Paste the full job advertisement here…"
              value={advertText}
              onChange={(e) => setAdvertText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create application'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
