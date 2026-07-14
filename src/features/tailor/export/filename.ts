/**
 * Professional sanitised export filename:
 * CandidateName_JobTitle_Company_YYYY-MM-DD.pdf|docx
 */
export function exportFileName(
  candidateName: string,
  jobTitle: string,
  company: string,
  format: 'pdf' | 'docx',
  date: Date = new Date(),
): string {
  const clean = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .replace(/[^A-Za-z0-9 ]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'CV'
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  return `${clean(candidateName)}_${clean(jobTitle)}_${clean(company)}_${stamp}.${format}`
}
