# Document Exports

## One model, three renderers

The live preview (`ats-preview.tsx`), the PDF renderer (`export/pdf.tsx`,
`@react-pdf/renderer`) and the DOCX generator (`export/docx.ts`, `docx`) all
consume the same canonical `CvDocument` and the same shared helpers
(`contactLine`, `detailLine`, `visibleSections`, `formatDateRange`). Content
parity is by construction, not by comparison; the outputs are not required to
be pixel-identical.

## ATS Classic template

- A4, single column, selectable/searchable text
- Conservative serif typography (Times/Georgia family), clear uppercase
  section headings with rules, proper bullet hierarchy
- No decorative icons, graphics or colour blocks
- ATS-readable ordering: header → summary → skills → systems → employment →
  education → certifications → references
- Section order and visibility are user-configurable per tailored CV

## Visibility

Master defaults (Settings) flow into each new tailored CV and can be
overridden per document: address full/city-only/hidden; email, phone, date of
birth, gender, nationality, driver's licence toggles; references
full / “available on request” / hidden. Hidden fields are only omitted from
output — never deleted from the profile.

## PDF specifics

- `Times-Roman` built-in fonts → guaranteed selectable, searchable text
- `wrap={false}` on entries to avoid orphaned headers at page breaks
- Multi-page content flows naturally with stable margins

## DOCX specifics

- Real `HeadingLevel` styles, genuine Word bullet lists, right-aligned tab
  stops for date ranges — fully editable and ATS-parseable
- A4 page size and margins set explicitly in twips

## Filenames

`CandidateName_JobTitle_Company_YYYY-MM-DD.pdf|docx` — sanitised to safe
characters (`exportFileName`), tested against hostile input.

## Storage and records

Every export uploads to the private `exports` bucket under
`{user_id}/exports/{tailored_cv_id}/…` and inserts an `exports` row linked to
the tailored CV, application and (when applicable) the immutable version.
`exports.cv_version_id` is `ON DELETE RESTRICT` so a version's export history
cannot be silently lost. Downloads use signed URLs (10-minute expiry) or the
immediate local download at generation time.
