-- CV Machine — initial schema
-- Relational Master Career Profile, job workspace, tailoring, versioning, AI audit.
-- Every user-owned record carries explicit ownership and timestamps.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.verification_status as enum (
  'pending_verification',
  'verified',
  'user_confirmed',
  'rejected'
);

create type public.record_source as enum (
  'cv_import',
  'manual',
  'ai',
  'user_confirmation'
);

create type public.address_visibility as enum ('full', 'city_only', 'hidden');

create type public.references_visibility as enum ('full', 'on_request', 'hidden');

create type public.application_status as enum (
  'considering',
  'preparing',
  'ready_to_apply',
  'applied',
  'interview',
  'assessment',
  'offer',
  'unsuccessful',
  'withdrawn',
  'archived'
);

create type public.requirement_kind as enum (
  'qualification',
  'experience',
  'skill',
  'system',
  'responsibility',
  'regulatory',
  'licence',
  'industry_term',
  'submission',
  'other'
);

create type public.requirement_priority as enum ('required', 'preferred');

create type public.alignment_status as enum (
  'supported',
  'partially_supported',
  'not_evidenced',
  'needs_confirmation'
);

create type public.suggestion_status as enum (
  'pending',
  'accepted',
  'rejected',
  'manually_edited'
);

create type public.cv_status as enum (
  'draft',
  'ready',
  'locked',
  'submitted',
  'archived'
);

create type public.ai_run_kind as enum (
  'profile_extraction',
  'job_extraction',
  'alignment',
  'suggestion',
  'assistant'
);

create type public.ai_run_status as enum (
  'pending',
  'success',
  'error',
  'timeout',
  'rate_limited'
);

create type public.export_format as enum ('pdf', 'docx');

create type public.document_kind as enum ('source_cv', 'job_advert');

create type public.skill_kind as enum ('skill', 'system');

create type public.question_status as enum ('pending', 'answered', 'dismissed');

-- ---------------------------------------------------------------------------
-- Helper: updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Authorisation helper: only administratively provisioned users may act.
-- ---------------------------------------------------------------------------

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_authorised()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Master Career Profile
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  first_name text,
  last_name text,
  headline text,
  professional_summary text,
  email text,
  phone text,
  address_line text,
  city text,
  region text,
  postal_code text,
  country text,
  date_of_birth date,
  gender text,
  nationality text,
  drivers_licence text,
  verification_status public.verification_status not null default 'pending_verification',
  source public.record_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.profile_visibility_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  address_mode public.address_visibility not null default 'city_only',
  show_email boolean not null default true,
  show_phone boolean not null default true,
  show_date_of_birth boolean not null default false,
  show_gender boolean not null default false,
  show_nationality boolean not null default false,
  show_drivers_licence boolean not null default false,
  references_mode public.references_visibility not null default 'on_request',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profile_visibility_settings_updated_at
  before update on public.profile_visibility_settings
  for each row execute function public.set_updated_at();

create table public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.document_kind not null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  extracted_text text,
  text_hash text,
  created_at timestamptz not null default now()
);

create index uploaded_documents_user_idx on public.uploaded_documents (user_id);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  title text not null,
  location text,
  employment_type text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  summary text,
  display_order integer not null default 0,
  verification_status public.verification_status not null default 'pending_verification',
  source public.record_source not null default 'manual',
  source_document_id uuid references public.uploaded_documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index experiences_user_idx on public.experiences (user_id, display_order);

create trigger experiences_updated_at
  before update on public.experiences
  for each row execute function public.set_updated_at();

-- Employment responsibilities are individual records, never one text blob.
create table public.experience_bullets (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  display_order integer not null default 0,
  verification_status public.verification_status not null default 'pending_verification',
  source public.record_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index experience_bullets_experience_idx
  on public.experience_bullets (experience_id, display_order);
create index experience_bullets_user_idx on public.experience_bullets (user_id);

create trigger experience_bullets_updated_at
  before update on public.experience_bullets
  for each row execute function public.set_updated_at();

create table public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  qualification text not null,
  field_of_study text,
  start_date date,
  end_date date,
  grade text,
  display_order integer not null default 0,
  verification_status public.verification_status not null default 'pending_verification',
  source public.record_source not null default 'manual',
  source_document_id uuid references public.uploaded_documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index education_user_idx on public.education (user_id, display_order);

create trigger education_updated_at
  before update on public.education
  for each row execute function public.set_updated_at();

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  issuer text,
  issue_date date,
  expiry_date date,
  credential_reference text,
  display_order integer not null default 0,
  verification_status public.verification_status not null default 'pending_verification',
  source public.record_source not null default 'manual',
  source_document_id uuid references public.uploaded_documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index certifications_user_idx on public.certifications (user_id, display_order);

create trigger certifications_updated_at
  before update on public.certifications
  for each row execute function public.set_updated_at();

-- Skills and systems/software share a table, distinguished by kind.
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  kind public.skill_kind not null default 'skill',
  display_order integer not null default 0,
  verification_status public.verification_status not null default 'pending_verification',
  source public.record_source not null default 'manual',
  source_document_id uuid references public.uploaded_documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index skills_user_name_kind_key
  on public.skills (user_id, lower(name), kind);
create index skills_user_idx on public.skills (user_id, kind, display_order);

create trigger skills_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

create table public."references" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  relationship text,
  company text,
  email text,
  phone text,
  notes text,
  display_order integer not null default 0,
  verification_status public.verification_status not null default 'pending_verification',
  source public.record_source not null default 'manual',
  source_document_id uuid references public.uploaded_documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index references_user_idx on public."references" (user_id, display_order);

create trigger references_updated_at
  before update on public."references"
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Job workspace
-- ---------------------------------------------------------------------------

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  job_title text not null,
  location text,
  employment_type text,
  seniority text,
  closing_date date,
  advert_source text,
  advert_text text,
  advert_text_hash text,
  advert_document_id uuid references public.uploaded_documents (id) on delete set null,
  status public.application_status not null default 'considering',
  applied_at timestamptz,
  submitted_cv_version_id uuid, -- FK added after cv_versions exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_applications_user_idx on public.job_applications (user_id, status);

create trigger job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

alter table public.uploaded_documents
  add column job_application_id uuid
    references public.job_applications (id) on delete set null;

create table public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.requirement_kind not null default 'other',
  priority public.requirement_priority not null default 'required',
  description text not null check (length(btrim(description)) > 0),
  alignment public.alignment_status,
  alignment_note text,
  evidence_ids uuid[] not null default '{}',
  source public.record_source not null default 'ai',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_requirements_application_idx
  on public.job_requirements (job_application_id, display_order);
create index job_requirements_user_idx on public.job_requirements (user_id);

create trigger job_requirements_updated_at
  before update on public.job_requirements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AI audit and analysis
-- ---------------------------------------------------------------------------

-- Usage log only: hashes, token counts and status. Never raw personal content.
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.ai_run_kind not null,
  model text not null,
  status public.ai_run_status not null default 'pending',
  input_hash text,
  prompt_tokens integer,
  completion_tokens integer,
  duration_ms integer,
  error_code text,
  created_at timestamptz not null default now()
);

create index ai_runs_user_idx on public.ai_runs (user_id, kind, created_at desc);

create table public.job_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ai_run_id uuid references public.ai_runs (id) on delete set null,
  input_hash text not null,
  alignment_score numeric check (alignment_score >= 0 and alignment_score <= 100),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index job_analysis_runs_application_idx
  on public.job_analysis_runs (job_application_id, created_at desc);
create index job_analysis_runs_user_idx on public.job_analysis_runs (user_id);

-- ---------------------------------------------------------------------------
-- Tailored CVs and immutable versions
-- ---------------------------------------------------------------------------

create table public.tailored_cvs (
  id uuid primary key default gen_random_uuid(),
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Tailored CV',
  status public.cv_status not null default 'draft',
  template text not null default 'ats_classic',
  document jsonb not null default '{}'::jsonb,
  visibility_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tailored_cvs_application_idx on public.tailored_cvs (job_application_id);
create index tailored_cvs_user_idx on public.tailored_cvs (user_id);

create trigger tailored_cvs_updated_at
  before update on public.tailored_cvs
  for each row execute function public.set_updated_at();

create table public.cv_sections (
  id uuid primary key default gen_random_uuid(),
  tailored_cv_id uuid not null references public.tailored_cvs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  section_key text not null,
  title text,
  visible boolean not null default true,
  display_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tailored_cv_id, section_key)
);

create index cv_sections_user_idx on public.cv_sections (user_id);

create trigger cv_sections_updated_at
  before update on public.cv_sections
  for each row execute function public.set_updated_at();

-- Immutable snapshots for historical reproducibility. The active career
-- profile stays relational; versions freeze the full document as JSON.
create table public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  tailored_cv_id uuid not null references public.tailored_cvs (id) on delete cascade,
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version_number integer not null,
  status public.cv_status not null default 'draft',
  template text not null default 'ats_classic',
  document jsonb not null,
  master_snapshot jsonb not null default '{}'::jsonb,
  visibility_settings jsonb not null default '{}'::jsonb,
  advert_text_hash text,
  accepted_suggestion_ids uuid[] not null default '{}',
  locked_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tailored_cv_id, version_number)
);

create index cv_versions_user_idx on public.cv_versions (user_id);
create index cv_versions_application_idx on public.cv_versions (job_application_id);

create trigger cv_versions_updated_at
  before update on public.cv_versions
  for each row execute function public.set_updated_at();

alter table public.job_applications
  add constraint job_applications_submitted_version_fkey
  foreign key (submitted_cv_version_id)
  references public.cv_versions (id) on delete set null;

-- Locked and submitted versions are immutable. The only permitted changes:
-- locked -> submitted (recording submitted_at) and locked/submitted -> archived.
create or replace function public.enforce_cv_version_immutability()
returns trigger
language plpgsql
as $$
declare
  old_body jsonb;
  new_body jsonb;
begin
  if tg_op = 'DELETE' then
    if old.status in ('locked', 'submitted') then
      raise exception 'Locked or submitted CV versions cannot be deleted';
    end if;
    return old;
  end if;

  if old.status in ('locked', 'submitted') then
    old_body := to_jsonb(old) - 'status' - 'submitted_at' - 'updated_at';
    new_body := to_jsonb(new) - 'status' - 'submitted_at' - 'updated_at';
    if old_body <> new_body then
      raise exception 'Locked or submitted CV versions are immutable';
    end if;
    if new.status <> old.status
       and not (old.status = 'locked' and new.status in ('submitted', 'archived'))
       and not (old.status = 'submitted' and new.status = 'archived') then
      raise exception 'Invalid status transition from % to %', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

create trigger cv_versions_immutability
  before update or delete on public.cv_versions
  for each row execute function public.enforce_cv_version_immutability();

-- ---------------------------------------------------------------------------
-- AI suggestions and Truth Lock evidence
-- ---------------------------------------------------------------------------

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tailored_cv_id uuid not null references public.tailored_cvs (id) on delete cascade,
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  ai_run_id uuid references public.ai_runs (id) on delete set null,
  target_section text not null,
  target_record_type text,
  target_record_id uuid,
  original_text text not null default '',
  proposed_text text not null,
  reason text not null default '',
  evidence_ids uuid[] not null default '{}',
  confidence numeric check (confidence >= 0 and confidence <= 1),
  validation_result jsonb not null default '{}'::jsonb,
  validation_passed boolean not null default false,
  status public.suggestion_status not null default 'pending',
  resolved_at timestamptz,
  final_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_suggestions_cv_idx on public.ai_suggestions (tailored_cv_id, status);
create index ai_suggestions_user_idx on public.ai_suggestions (user_id);

create trigger ai_suggestions_updated_at
  before update on public.ai_suggestions
  for each row execute function public.set_updated_at();

create table public.confirmation_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  job_requirement_id uuid references public.job_requirements (id) on delete cascade,
  question text not null,
  answer text,
  status public.question_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index confirmation_questions_application_idx
  on public.confirmation_questions (job_application_id, status);
create index confirmation_questions_user_idx on public.confirmation_questions (user_id);

create trigger confirmation_questions_updated_at
  before update on public.confirmation_questions
  for each row execute function public.set_updated_at();

create table public.user_confirmed_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  confirmation_question_id uuid references public.confirmation_questions (id) on delete set null,
  description text not null check (length(btrim(description)) > 0),
  related_record_type text,
  related_record_id uuid,
  created_at timestamptz not null default now()
);

create index user_confirmed_evidence_user_idx
  on public.user_confirmed_evidence (user_id);

-- ---------------------------------------------------------------------------
-- Exports, notes, preferences
-- ---------------------------------------------------------------------------

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tailored_cv_id uuid references public.tailored_cvs (id) on delete set null,
  cv_version_id uuid references public.cv_versions (id) on delete restrict,
  job_application_id uuid references public.job_applications (id) on delete set null,
  format public.export_format not null,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index exports_user_idx on public.exports (user_id, created_at desc);
create index exports_version_idx on public.exports (cv_version_id);

create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_notes_application_idx
  on public.application_notes (job_application_id, created_at desc);
create index application_notes_user_idx on public.application_notes (user_id);

create trigger application_notes_updated_at
  before update on public.application_notes
  for each row execute function public.set_updated_at();

create table public.template_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  template text not null default 'ats_classic',
  font_family text not null default 'Helvetica',
  font_size numeric not null default 10.5 check (font_size between 8 and 14),
  line_spacing numeric not null default 1.25 check (line_spacing between 1 and 2),
  margin_preset text not null default 'standard'
    check (margin_preset in ('compact', 'standard', 'relaxed')),
  page_size text not null default 'A4' check (page_size in ('A4')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger template_preferences_updated_at
  before update on public.template_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New-user bootstrap: profile shell, role, visibility defaults, preferences.
-- Public signup is disabled; any created user is administratively intended.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'owner')
    on conflict (user_id) do nothing;
  insert into public.profiles (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
  insert into public.profile_visibility_settings (user_id) values (new.id)
    on conflict (user_id) do nothing;
  insert into public.template_preferences (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
