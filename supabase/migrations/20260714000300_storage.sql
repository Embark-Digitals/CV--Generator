-- CV Machine — private storage buckets and user-scoped object policies.
-- Paths are always {user_id}/... and downloads use authenticated/signed URLs.
-- No bucket is ever public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'source-cvs',
    'source-cvs',
    false,
    20971520, -- 20 MB
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'job-adverts',
    'job-adverts',
    false,
    20971520,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  ),
  (
    'exports',
    'exports',
    false,
    20971520,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
on conflict (id) do nothing;

-- Object access: authorised users may act only inside their own
-- {user_id}/ folder within the app's private buckets.

create policy "private_objects_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('source-cvs', 'job-adverts', 'exports')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_authorised()
  );

create policy "private_objects_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('source-cvs', 'job-adverts', 'exports')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_authorised()
  );

create policy "private_objects_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('source-cvs', 'job-adverts', 'exports')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_authorised()
  )
  with check (
    bucket_id in ('source-cvs', 'job-adverts', 'exports')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_authorised()
  );

create policy "private_objects_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('source-cvs', 'job-adverts', 'exports')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_authorised()
  );
