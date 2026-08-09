-- ==========================================================================
-- Diagnose the storage upload rejection.
-- Run this whole file and send me BOTH result sets.
-- ==========================================================================

-- 1. Does the bucket exist, and is it public for reads?
--    Expect one row: project-media / true.
select id, name, public
from storage.buckets
where id = 'project-media';

-- 2. Do the write policies exist?
--    Expect three rows: upload / replace / delete project media.
--    ZERO rows means console.sql aborted here, which is the whole problem.
select policyname, cmd, roles::text
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- ==========================================================================
-- ATTEMPTED FIX. Run it; if it errors with "must be owner of table objects"
-- then this project does not allow storage policies from SQL, and the
-- Dashboard route in the chat message is the way. Everything above still
-- tells us what we need either way.
-- ==========================================================================

insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', true)
on conflict (id) do update set public = true;

drop policy if exists "staff upload project media" on storage.objects;
drop policy if exists "staff replace project media" on storage.objects;
drop policy if exists "staff delete project media" on storage.objects;

create policy "staff upload project media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-media' and public.is_staff());

create policy "staff replace project media"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-media' and public.is_staff())
  with check (bucket_id = 'project-media' and public.is_staff());

create policy "staff delete project media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-media' and public.is_staff());

-- 3. Confirm. Expect the three policies listed.
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
