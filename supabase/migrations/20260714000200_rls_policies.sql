-- CV Machine — Row Level Security
-- Every table denies all access by default; explicit policies grant only
-- owner access, and child records verify parent ownership on write so a user
-- can never attach a child to another user's parent.

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_visibility_settings enable row level security;
alter table public.uploaded_documents enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_bullets enable row level security;
alter table public.education enable row level security;
alter table public.certifications enable row level security;
alter table public.skills enable row level security;
alter table public."references" enable row level security;
alter table public.job_applications enable row level security;
alter table public.job_requirements enable row level security;
alter table public.ai_runs enable row level security;
alter table public.job_analysis_runs enable row level security;
alter table public.tailored_cvs enable row level security;
alter table public.cv_sections enable row level security;
alter table public.cv_versions enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.confirmation_questions enable row level security;
alter table public.user_confirmed_evidence enable row level security;
alter table public.exports enable row level security;
alter table public.application_notes enable row level security;
alter table public.template_preferences enable row level security;

-- ---------------------------------------------------------------------------
-- user_roles: readable by the owner, writable only by service role / triggers
-- ---------------------------------------------------------------------------

create policy "user_roles_select_own" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- profiles (pk = user id). Deleting the profile row is not permitted.
-- ---------------------------------------------------------------------------

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id and public.is_authorised());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id and public.is_authorised());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id and public.is_authorised())
  with check (auth.uid() = id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- profile_visibility_settings (pk = user id)
-- ---------------------------------------------------------------------------

create policy "visibility_select_own" on public.profile_visibility_settings
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "visibility_insert_own" on public.profile_visibility_settings
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_authorised());

create policy "visibility_update_own" on public.profile_visibility_settings
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- template_preferences (pk = user id)
-- ---------------------------------------------------------------------------

create policy "template_prefs_select_own" on public.template_preferences
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "template_prefs_insert_own" on public.template_preferences
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_authorised());

create policy "template_prefs_update_own" on public.template_preferences
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- uploaded_documents
-- ---------------------------------------------------------------------------

create policy "documents_select_own" on public.uploaded_documents
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "documents_insert_own" on public.uploaded_documents
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      job_application_id is null
      or exists (
        select 1 from public.job_applications ja
        where ja.id = job_application_id and ja.user_id = auth.uid()
      )
    )
  );

create policy "documents_update_own" on public.uploaded_documents
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      job_application_id is null
      or exists (
        select 1 from public.job_applications ja
        where ja.id = job_application_id and ja.user_id = auth.uid()
      )
    )
  );

create policy "documents_delete_own" on public.uploaded_documents
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- Master Career Profile tables with optional source_document_id
-- ---------------------------------------------------------------------------

-- experiences
create policy "experiences_select_own" on public.experiences
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "experiences_insert_own" on public.experiences
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      source_document_id is null
      or exists (
        select 1 from public.uploaded_documents d
        where d.id = source_document_id and d.user_id = auth.uid()
      )
    )
  );

create policy "experiences_update_own" on public.experiences
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      source_document_id is null
      or exists (
        select 1 from public.uploaded_documents d
        where d.id = source_document_id and d.user_id = auth.uid()
      )
    )
  );

create policy "experiences_delete_own" on public.experiences
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- experience_bullets: child records must belong to the caller's experience
create policy "bullets_select_own" on public.experience_bullets
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "bullets_insert_own" on public.experience_bullets
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.experiences e
      where e.id = experience_id and e.user_id = auth.uid()
    )
  );

create policy "bullets_update_own" on public.experience_bullets
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.experiences e
      where e.id = experience_id and e.user_id = auth.uid()
    )
  );

create policy "bullets_delete_own" on public.experience_bullets
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- education
create policy "education_select_own" on public.education
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "education_insert_own" on public.education
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      source_document_id is null
      or exists (
        select 1 from public.uploaded_documents d
        where d.id = source_document_id and d.user_id = auth.uid()
      )
    )
  );

create policy "education_update_own" on public.education
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "education_delete_own" on public.education
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- certifications
create policy "certifications_select_own" on public.certifications
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "certifications_insert_own" on public.certifications
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      source_document_id is null
      or exists (
        select 1 from public.uploaded_documents d
        where d.id = source_document_id and d.user_id = auth.uid()
      )
    )
  );

create policy "certifications_update_own" on public.certifications
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "certifications_delete_own" on public.certifications
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- skills
create policy "skills_select_own" on public.skills
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "skills_insert_own" on public.skills
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      source_document_id is null
      or exists (
        select 1 from public.uploaded_documents d
        where d.id = source_document_id and d.user_id = auth.uid()
      )
    )
  );

create policy "skills_update_own" on public.skills
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "skills_delete_own" on public.skills
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- references
create policy "references_select_own" on public."references"
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "references_insert_own" on public."references"
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      source_document_id is null
      or exists (
        select 1 from public.uploaded_documents d
        where d.id = source_document_id and d.user_id = auth.uid()
      )
    )
  );

create policy "references_update_own" on public."references"
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "references_delete_own" on public."references"
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- Job workspace
-- ---------------------------------------------------------------------------

create policy "applications_select_own" on public.job_applications
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "applications_insert_own" on public.job_applications
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_authorised());

create policy "applications_update_own" on public.job_applications
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      submitted_cv_version_id is null
      or exists (
        select 1 from public.cv_versions v
        where v.id = submitted_cv_version_id and v.user_id = auth.uid()
      )
    )
    and (
      advert_document_id is null
      or exists (
        select 1 from public.uploaded_documents d
        where d.id = advert_document_id and d.user_id = auth.uid()
      )
    )
  );

create policy "applications_delete_own" on public.job_applications
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- job_requirements
create policy "requirements_select_own" on public.job_requirements
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "requirements_insert_own" on public.job_requirements
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
  );

create policy "requirements_update_own" on public.job_requirements
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
  );

create policy "requirements_delete_own" on public.job_requirements
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- AI audit
-- ---------------------------------------------------------------------------

create policy "ai_runs_select_own" on public.ai_runs
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "ai_runs_insert_own" on public.ai_runs
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_authorised());

create policy "ai_runs_update_own" on public.ai_runs
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "analysis_select_own" on public.job_analysis_runs
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "analysis_insert_own" on public.job_analysis_runs
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
  );

create policy "analysis_delete_own" on public.job_analysis_runs
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- Tailored CVs, sections, versions
-- ---------------------------------------------------------------------------

create policy "tailored_select_own" on public.tailored_cvs
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "tailored_insert_own" on public.tailored_cvs
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
  );

create policy "tailored_update_own" on public.tailored_cvs
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
  );

create policy "tailored_delete_own" on public.tailored_cvs
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "sections_select_own" on public.cv_sections
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "sections_insert_own" on public.cv_sections
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.tailored_cvs t
      where t.id = tailored_cv_id and t.user_id = auth.uid()
    )
  );

create policy "sections_update_own" on public.cv_sections
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.tailored_cvs t
      where t.id = tailored_cv_id and t.user_id = auth.uid()
    )
  );

create policy "sections_delete_own" on public.cv_sections
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "versions_select_own" on public.cv_versions
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "versions_insert_own" on public.cv_versions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.tailored_cvs t
      where t.id = tailored_cv_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
  );

-- Updates permitted only within immutability rules (enforced by trigger).
create policy "versions_update_own" on public.cv_versions
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

-- Deletes blocked for locked/submitted by trigger.
create policy "versions_delete_own" on public.cv_versions
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- Suggestions, questions, confirmed evidence
-- ---------------------------------------------------------------------------

create policy "suggestions_select_own" on public.ai_suggestions
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "suggestions_insert_own" on public.ai_suggestions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.tailored_cvs t
      where t.id = tailored_cv_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
  );

create policy "suggestions_update_own" on public.ai_suggestions
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "suggestions_delete_own" on public.ai_suggestions
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "questions_select_own" on public.confirmation_questions
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "questions_insert_own" on public.confirmation_questions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
    and (
      job_requirement_id is null
      or exists (
        select 1 from public.job_requirements r
        where r.id = job_requirement_id and r.user_id = auth.uid()
      )
    )
  );

create policy "questions_update_own" on public.confirmation_questions
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "questions_delete_own" on public.confirmation_questions
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "evidence_select_own" on public.user_confirmed_evidence
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "evidence_insert_own" on public.user_confirmed_evidence
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      confirmation_question_id is null
      or exists (
        select 1 from public.confirmation_questions q
        where q.id = confirmation_question_id and q.user_id = auth.uid()
      )
    )
  );

create policy "evidence_update_own" on public.user_confirmed_evidence
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "evidence_delete_own" on public.user_confirmed_evidence
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

-- ---------------------------------------------------------------------------
-- Exports and notes
-- ---------------------------------------------------------------------------

create policy "exports_select_own" on public.exports
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "exports_insert_own" on public.exports
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and (
      tailored_cv_id is null
      or exists (
        select 1 from public.tailored_cvs t
        where t.id = tailored_cv_id and t.user_id = auth.uid()
      )
    )
    and (
      cv_version_id is null
      or exists (
        select 1 from public.cv_versions v
        where v.id = cv_version_id and v.user_id = auth.uid()
      )
    )
  );

create policy "exports_delete_own" on public.exports
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "notes_select_own" on public.application_notes
  for select to authenticated
  using (auth.uid() = user_id and public.is_authorised());

create policy "notes_insert_own" on public.application_notes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_authorised()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = job_application_id and ja.user_id = auth.uid()
    )
  );

create policy "notes_update_own" on public.application_notes
  for update to authenticated
  using (auth.uid() = user_id and public.is_authorised())
  with check (auth.uid() = user_id and public.is_authorised());

create policy "notes_delete_own" on public.application_notes
  for delete to authenticated
  using (auth.uid() = user_id and public.is_authorised());
