// Synthetic test fixtures ONLY — never real personal data.
import type { CvDocument } from '@/features/tailor/document'

export function sampleDocument(
  overrides: Partial<CvDocument> = {},
): CvDocument {
  return {
    version: 1,
    header: { full_name: 'Test Candidate', headline: 'Senior Bookkeeper' },
    contact: {
      email: 'candidate@example.com',
      phone: '+27 00 000 0000',
      address_line: '1 Example Street',
      city: 'Johannesburg',
      region: 'Gauteng',
      postal_code: '2000',
      country: 'South Africa',
      date_of_birth: '1990-01-01',
      gender: 'Female',
      nationality: 'South African',
      drivers_licence: 'Code B',
    },
    summary:
      'Detail-oriented bookkeeper with experience across reconciliations, creditors and debtors.',
    skills: [
      { id: 's1', name: 'Reconciliations' },
      { id: 's2', name: 'Creditors' },
    ],
    systems: [
      { id: 'sys1', name: 'Pastel' },
      { id: 'sys2', name: 'Excel' },
    ],
    experiences: [
      {
        id: 'e1',
        company: 'Acme Trading (Pty) Ltd With A Very Long Company Name Indeed',
        title: 'Bookkeeper',
        location: 'Johannesburg',
        start_date: '2018-03-01',
        end_date: null,
        is_current: true,
        bullets: [
          { id: 'b1', content: 'Processed supplier invoices and reconciliations.' },
          { id: 'b2', content: 'Assisted with month-end reporting.' },
        ],
      },
      {
        id: 'e2',
        company: 'Beta Corp',
        title: 'Junior Clerk',
        location: null,
        start_date: '2015-01-01',
        end_date: '2018-02-01',
        is_current: false,
        bullets: [{ id: 'b3', content: 'Captured daily transactions.' }],
      },
    ],
    education: [
      {
        id: 'ed1',
        institution: 'Example College',
        qualification:
          'National Diploma in Financial Accounting With A Particularly Long Qualification Title',
        field_of_study: 'Accounting',
        start_date: '2012-01-01',
        end_date: '2014-12-01',
        grade: null,
      },
    ],
    certifications: [
      { id: 'c1', name: 'Pastel Certified User', issuer: 'Sage', issue_date: '2019-05-01' },
    ],
    references: [
      {
        id: 'r1',
        name: 'Jane Manager',
        relationship: 'Direct manager',
        company: 'Acme Trading',
        email: 'jane@example.com',
        phone: '+27 00 000 0001',
      },
      {
        id: 'r2',
        name: 'John Supervisor',
        relationship: 'Supervisor',
        company: 'Beta Corp',
        email: null,
        phone: null,
      },
    ],
    sectionOrder: [
      'summary',
      'skills',
      'systems',
      'experience',
      'education',
      'certifications',
      'references',
    ],
    sectionVisibility: {
      summary: true,
      skills: true,
      systems: true,
      experience: true,
      education: true,
      certifications: true,
      references: true,
    },
    visibility: {
      address_mode: 'city_only',
      show_email: true,
      show_phone: true,
      show_date_of_birth: false,
      show_gender: false,
      show_nationality: false,
      show_drivers_licence: false,
      references_mode: 'on_request',
    },
    ...overrides,
  }
}
