import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { FileUp, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { extractFileText } from '@/lib/extract-text'
import { useUserId } from '@/features/profile/hooks'
import {
  extractProfile,
  fetchExistingCounts,
  clearProfileSections,
  uploadSourceCv,
  type ExistingCounts,
} from '@/features/import/api'
import {
  saveReviewedImport,
  type ImportMode,
  type ImportSelection,
} from '@/features/import/save'
import type { CandidateProfile } from '@/features/import/schema'
import { useQueryClient } from '@tanstack/react-query'

type Step =
  | { name: 'upload' }
  | { name: 'processing'; detail: string }
  | {
      name: 'review'
      candidate: CandidateProfile
      documentId: string
      sourceText: string
      existing: ExistingCounts
    }
  | { name: 'done'; inserted: number; skipped: number }
  | { name: 'error'; message: string; documentId?: string; sourceText?: string }

function initialSelection(candidate: CandidateProfile): ImportSelection {
  return {
    personal: true,
    summary: true,
    experiences: candidate.experiences.map(() => true),
    education: candidate.education.map(() => true),
    certifications: candidate.certifications.map(() => true),
    skills: candidate.skills.map(() => true),
    systems: candidate.systems.map(() => true),
    references: candidate.references.map(() => true),
  }
}

export function ImportPage() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>({ name: 'upload' })
  const [selection, setSelection] = useState<ImportSelection | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [saving, setSaving] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [retrying, setRetrying] = useState(false)

  // Extraction step, reusable for the first attempt and for a retry that must
  // NOT re-upload the file. On failure it preserves documentId + sourceText so
  // the user can retry the same stored document.
  const runExtraction = async (documentId: string, sourceText: string) => {
    setStep({ name: 'processing', detail: 'Extracting structured information…' })
    try {
      const [candidate, existing] = await Promise.all([
        extractProfile(documentId),
        fetchExistingCounts(userId),
      ])
      setSelection(initialSelection(candidate))
      setStep({ name: 'review', candidate, documentId, sourceText, existing })
    } catch (err) {
      setStep({
        name: 'error',
        message: err instanceof Error ? err.message : 'Import failed.',
        documentId,
        sourceText,
      })
    }
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    try {
      setStep({ name: 'processing', detail: 'Reading document text…' })
      const text = await extractFileText(file)
      if (text.length < 40) {
        setStep({
          name: 'error',
          message:
            'Very little text could be read from this file. If it is a scanned image PDF, export a text-based copy and try again.',
        })
        return
      }
      setStep({ name: 'processing', detail: 'Uploading to private storage…' })
      const doc = await uploadSourceCv(userId, file, text)
      await runExtraction(doc.id, text)
    } catch (err) {
      setStep({
        name: 'error',
        message: err instanceof Error ? err.message : 'Import failed.',
      })
    }
  }

  // Retry extraction against the already-uploaded document (no re-upload). The
  // in-flight guard here plus the switch to the processing view prevents a
  // duplicate submission; the server also rejects concurrent duplicates.
  const retryExtraction = async (documentId: string, sourceText: string) => {
    if (retrying) return
    setRetrying(true)
    try {
      await runExtraction(documentId, sourceText)
    } finally {
      setRetrying(false)
    }
  }

  const totalExisting = useMemo(
    () =>
      step.name === 'review'
        ? Object.values(step.existing).reduce((a, b) => a + b, 0)
        : 0,
    [step],
  )

  const updateCandidate = (updater: (c: CandidateProfile) => CandidateProfile) => {
    setStep((s) => (s.name === 'review' ? { ...s, candidate: updater(s.candidate) } : s))
  }

  const save = async () => {
    if (step.name !== 'review' || !selection) return
    setSaving(true)
    try {
      if (mode === 'replace' && totalExisting > 0) {
        const ok = window.confirm(
          `Replace mode removes your ${totalExisting} existing profile records before importing. This cannot be undone. Continue?`,
        )
        if (!ok) {
          setSaving(false)
          return
        }
        await clearProfileSections(userId)
      }
      const result = await saveReviewedImport(
        userId,
        step.documentId,
        step.candidate,
        selection,
      )
      await queryClient.invalidateQueries()
      setStep({
        name: 'done',
        inserted: result.inserted,
        skipped: result.skippedDuplicates,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Saving failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Import source CV"
        description="Upload your existing CV, review every extracted record, and confirm it into your Master Career Profile."
      />

      {step.name === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload a PDF or Word CV</CardTitle>
            <CardDescription>
              The original file is stored privately. Nothing enters your
              profile until you review and confirm it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="cv-file"
              className="border-input hover:bg-accent flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed p-10 text-center transition-colors"
            >
              <FileUp className="text-muted-foreground h-8 w-8" aria-hidden="true" />
              <span className="text-sm font-medium">
                Choose a PDF or DOCX file
              </span>
              <span className="text-muted-foreground text-xs">
                Up to 20 MB · text-based documents only
              </span>
              <input
                id="cv-file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {step.name === 'processing' && (
        <Card>
          <CardContent className="p-10 text-center" aria-live="polite">
            <p className="text-sm font-medium">{step.detail}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              This can take a little while for longer documents.
            </p>
          </CardContent>
        </Card>
      )}

      {step.name === 'error' && (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-destructive text-sm" role="alert">
              {step.message}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {step.documentId && step.sourceText ? (
                <Button
                  onClick={() =>
                    void retryExtraction(step.documentId!, step.sourceText!)
                  }
                  disabled={retrying}
                >
                  <RotateCcw aria-hidden="true" />{' '}
                  {retrying ? 'Retrying…' : 'Retry extraction'}
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setStep({ name: 'upload' })}>
                {step.documentId ? 'Upload a different file' : (
                  <>
                    <RotateCcw aria-hidden="true" /> Try again
                  </>
                )}
              </Button>
              <Link
                to="/profile"
                className="text-primary inline-flex h-9 items-center text-sm underline-offset-4 hover:underline"
              >
                Add records manually instead
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {step.name === 'done' && (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-sm font-medium" role="status">
              Import complete: {step.inserted} records saved
              {step.skipped > 0
                ? `, ${step.skipped} duplicates skipped automatically`
                : ''}
              .
            </p>
            <div className="flex justify-center gap-2">
              <Link
                to="/profile"
                className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-md px-4 text-sm font-medium"
              >
                Review your Master Career Profile
              </Link>
              <Button variant="outline" onClick={() => setStep({ name: 'upload' })}>
                Import another CV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step.name === 'review' && selection && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review before saving</CardTitle>
              <CardDescription>
                Everything below was extracted by AI and needs your
                confirmation. Untick anything incorrect, or edit the text
                directly. Records you confirm are saved as verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {totalExisting > 0 && (
                <fieldset className="rounded-md border p-4">
                  <legend className="px-1 text-sm font-medium">
                    Your profile already has {totalExisting} records
                  </legend>
                  <div className="flex flex-col gap-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === 'merge'}
                        onChange={() => setMode('merge')}
                      />
                      Merge — add new records, skip duplicates (recommended)
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === 'replace'}
                        onChange={() => setMode('replace')}
                      />
                      Replace — remove existing employment, education,
                      certifications, skills and references first
                    </label>
                  </div>
                </fieldset>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSource((v) => !v)}
                aria-expanded={showSource}
              >
                {showSource ? 'Hide original text' : 'Show original text'}
              </Button>
              {showSource && (
                <Textarea
                  readOnly
                  value={step.sourceText}
                  rows={10}
                  aria-label="Original document text"
                  className="font-mono text-xs"
                />
              )}
            </CardContent>
          </Card>

          {step.candidate.personal && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Personal details</CardTitle>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selection.personal}
                    onChange={(e) =>
                      setSelection({ ...selection, personal: e.target.checked })
                    }
                  />
                  Include
                </label>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(
                    Object.entries(step.candidate.personal) as Array<
                      [string, string | null | undefined]
                    >
                  )
                    .filter(([, v]) => v)
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`cand-${key}`} className="capitalize">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        <Input
                          id={`cand-${key}`}
                          value={value ?? ''}
                          disabled={!selection.personal}
                          onChange={(e) =>
                            updateCandidate((c) => ({
                              ...c,
                              personal: { ...c.personal, [key]: e.target.value },
                            }))
                          }
                        />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(step.candidate.headline || step.candidate.professional_summary) && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Professional summary</CardTitle>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selection.summary}
                    onChange={(e) =>
                      setSelection({ ...selection, summary: e.target.checked })
                    }
                  />
                  Include
                </label>
              </CardHeader>
              <CardContent className="space-y-3">
                {step.candidate.headline != null && (
                  <div className="space-y-1">
                    <Label htmlFor="cand-headline">Headline</Label>
                    <Input
                      id="cand-headline"
                      value={step.candidate.headline ?? ''}
                      disabled={!selection.summary}
                      onChange={(e) =>
                        updateCandidate((c) => ({ ...c, headline: e.target.value }))
                      }
                    />
                  </div>
                )}
                {step.candidate.professional_summary != null && (
                  <div className="space-y-1">
                    <Label htmlFor="cand-summary">Summary</Label>
                    <Textarea
                      id="cand-summary"
                      rows={4}
                      value={step.candidate.professional_summary ?? ''}
                      disabled={!selection.summary}
                      onChange={(e) =>
                        updateCandidate((c) => ({
                          ...c,
                          professional_summary: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step.candidate.experiences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Employment history{' '}
                  <Badge variant="secondary">
                    {step.candidate.experiences.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {step.candidate.experiences.map((exp, i) => (
                  <div key={i} className="rounded-md border p-4">
                    <label className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selection.experiences[i]}
                        onChange={(e) =>
                          setSelection({
                            ...selection,
                            experiences: selection.experiences.map((v, j) =>
                              j === i ? e.target.checked : v,
                            ),
                          })
                        }
                      />
                      Include this role
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Job title</Label>
                        <Input
                          value={exp.title}
                          disabled={!selection.experiences[i]}
                          onChange={(e) =>
                            updateCandidate((c) => ({
                              ...c,
                              experiences: c.experiences.map((x, j) =>
                                j === i ? { ...x, title: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Company</Label>
                        <Input
                          value={exp.company}
                          disabled={!selection.experiences[i]}
                          onChange={(e) =>
                            updateCandidate((c) => ({
                              ...c,
                              experiences: c.experiences.map((x, j) =>
                                j === i ? { ...x, company: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Start date</Label>
                        <Input
                          placeholder="YYYY-MM-DD"
                          value={exp.start_date ?? ''}
                          disabled={!selection.experiences[i]}
                          onChange={(e) =>
                            updateCandidate((c) => ({
                              ...c,
                              experiences: c.experiences.map((x, j) =>
                                j === i ? { ...x, start_date: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>End date</Label>
                        <Input
                          placeholder="YYYY-MM-DD or blank if current"
                          value={exp.end_date ?? ''}
                          disabled={!selection.experiences[i]}
                          onChange={(e) =>
                            updateCandidate((c) => ({
                              ...c,
                              experiences: c.experiences.map((x, j) =>
                                j === i ? { ...x, end_date: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <Label>Responsibilities (one per line)</Label>
                      <Textarea
                        rows={Math.min(8, Math.max(3, exp.bullets.length + 1))}
                        value={exp.bullets.join('\n')}
                        disabled={!selection.experiences[i]}
                        onChange={(e) =>
                          updateCandidate((c) => ({
                            ...c,
                            experiences: c.experiences.map((x, j) =>
                              j === i
                                ? { ...x, bullets: e.target.value.split('\n') }
                                : x,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(
            [
              ['education', 'Education', step.candidate.education.map((e) => `${e.qualification} — ${e.institution}`)],
              ['certifications', 'Certifications', step.candidate.certifications.map((c) => c.name + (c.issuer ? ` — ${c.issuer}` : ''))],
              ['skills', 'Skills', step.candidate.skills],
              ['systems', 'Systems and software', step.candidate.systems],
              ['references', 'References', step.candidate.references.map((r) => [r.name, r.relationship, r.company].filter(Boolean).join(' · '))],
            ] as Array<[keyof ImportSelection & string, string, string[]]>
          )
            .filter(([, , items]) => items.length > 0)
            .map(([key, title, items]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>
                    {title} <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {items.map((label, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={(selection[key] as boolean[])[i]}
                          aria-label={`Include ${label}`}
                          onChange={(e) =>
                            setSelection({
                              ...selection,
                              [key]: (selection[key] as boolean[]).map((v, j) =>
                                j === i ? e.target.checked : v,
                              ),
                            })
                          }
                        />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}

          <div className="bg-card sticky bottom-0 flex items-center justify-end gap-3 rounded-md border p-4">
            <Button variant="ghost" onClick={() => setStep({ name: 'upload' })}>
              Start over
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm and save to profile'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
