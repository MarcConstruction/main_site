-- ==========================================================================
-- Put is_staff() back on the storage policies.
--
-- fix-storage-2.sql took it off, reasoning that sign-ups are disabled so
-- `authenticated` and `staff` are the same set of people. That is true only
-- for as long as a toggle in the Dashboard stays where it is, and it is one
-- click from being wrong -- at which point anyone who registers an account
-- can overwrite every image on the live site, delete the brochures, and host
-- files of their choosing on our own Supabase domain.
--
-- enquiries.sql already argues this exact point about the same toggle. The
-- storage policies are the one place that stopped listening.
--
-- The reason is_staff() appeared to fail back then was almost certainly the
-- email case mismatch, which fix-staff-match.sql has since fixed. Section 1
-- proves that before section 2 relies on it.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Will is_staff() actually be true for the people who upload?
--    Every row must read true. A false row means that account uploads
--    nothing after this file runs -- fix the staff list FIRST, then continue.
-- --------------------------------------------------------------------------
select
  u.email,
  exists (select 1 from public.staff s where lower(s.email) = lower(u.email))
    as will_be_allowed_to_upload
from auth.users u
order by u.email;

-- --------------------------------------------------------------------------
-- 2. The fix. Both naming generations are dropped, because console.sql and
--    fix-storage-2.sql each left a set behind and only one of them is the
--    one currently in force.
-- --------------------------------------------------------------------------
drop policy if exists "staff upload project media"            on storage.objects;
drop policy if exists "staff replace project media"           on storage.objects;
drop policy if exists "staff delete project media"            on storage.objects;
drop policy if exists "signed-in staff upload project media"  on storage.objects;
drop policy if exists "signed-in staff replace project media" on storage.objects;
drop policy if exists "signed-in staff delete project media"  on storage.objects;

-- And the diagnostic that was never meant to survive. `to public` includes
-- anon, which is the key every visitor's browser already holds.
drop policy if exists "TEMP diagnose upload" on storage.objects;

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

-- --------------------------------------------------------------------------
-- 3. Confirm. Expect exactly three rows, each one mentioning is_staff(),
--    and no policy granted to {public} or {anon}.
-- --------------------------------------------------------------------------
select policyname, cmd, roles::text, coalesce(qual, with_check) as condition
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;

-- ==========================================================================
-- THEN TEST AN UPLOAD in the console, before closing this tab.
--
-- If it now fails with "new row violates row-level security policy", section
-- 1 told you why and the way back is one statement:
--
--   drop policy "staff upload project media" on storage.objects;
--   create policy "staff upload project media"
--     on storage.objects for insert to authenticated
--     with check (bucket_id = 'project-media');
--
-- But fix the staff row rather than living there -- that version is the hole
-- this file exists to close.
-- ==========================================================================
