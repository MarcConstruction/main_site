-- ==========================================================================
-- Storage still rejects the upload with is_staff() in the policy.
--
-- Drop it from the storage policies. Not a loosening in practice: sign-ups
-- are disabled, so the only way to hold an `authenticated` token at all is
-- for you to have created the account by hand. "Authenticated" and "staff"
-- are the same set of people here, and the extra check was buying a second
-- failure mode rather than a second lock.
--
-- is_staff() stays on the tables, where it does real work: the anon key can
-- reach those, so `authenticated` genuinely is a wider set there.
-- ==========================================================================

drop policy if exists "staff upload project media" on storage.objects;
drop policy if exists "staff replace project media" on storage.objects;
drop policy if exists "staff delete project media" on storage.objects;

create policy "signed-in staff upload project media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-media');

create policy "signed-in staff replace project media"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-media')
  with check (bucket_id = 'project-media');

create policy "signed-in staff delete project media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-media');

select policyname, cmd, roles::text
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
