-- ==========================================================================
-- Isolate the storage rejection. One experiment, one answer.
--
-- Established already, so not re-tested here:
--   * the token is valid and reaches Supabase as `authenticated`
--   * is_staff() is true in request context
--   (both proven by the Enquiries screen, whose policy requires exactly that)
--
-- So the fault is inside storage-api. Two things it could still be:
--   A. the request is not arriving as role `authenticated` at storage
--   B. something other than the policy is rejecting the row
--
-- Section 3 tells A and B apart. Read 1 and 2 first; they may answer it
-- outright.
-- ==========================================================================

-- 1. Bucket configuration. A file_size_limit or an allowed_mime_types list
--    that excludes image/jpeg would reject the upload -- with a different
--    message, but worth ruling out in one glance.
select id, public, file_size_limit, allowed_mime_types, type
from storage.buckets
where id = 'project-media';

-- 2. Every policy on storage.objects, and whether RLS is FORCED.
--    Policies are OR-ed, so extra ones cannot cause a rejection -- but a
--    RESTRICTIVE policy (permissive = 'RESTRICTIVE') is AND-ed and can.
select policyname, cmd, permissive, roles::text, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;

select relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
from pg_class
where relname = 'objects' and relnamespace = 'storage'::regnamespace;

-- ==========================================================================
-- 3. THE EXPERIMENT
--    A policy granted to PUBLIC applies to every role, including anon. If
--    the upload succeeds with this in place, the row itself is acceptable
--    and the request simply was not arriving as `authenticated` (cause A).
--    If it still fails, no policy would ever have let it through and the
--    rejection is coming from somewhere else entirely (cause B).
--
--    Run this, retry the upload, then report which happened.
--    Section 4 removes it again -- do not leave it in place.
-- ==========================================================================

create policy "TEMP diagnose upload" on storage.objects
  for insert to public
  with check (bucket_id = 'project-media');

-- ==========================================================================
-- 4. AFTERWARDS, whichever way it went, remove the temporary policy:
--
--    drop policy "TEMP diagnose upload" on storage.objects;
--
-- Leaving it lets anyone with the public anon key write files into the
-- bucket, which is a bill and a defacement risk, not a theoretical one.
-- ==========================================================================
