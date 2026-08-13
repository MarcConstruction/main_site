-- ==========================================================================
-- Security review — the three database changes that were left over.
--
-- Run fix-models-https.sql FIRST: section 3 below calls public.all_https(),
-- which that file creates.
--
-- Each section stands alone; run the whole thing or one part at a time.
-- ==========================================================================


-- ==========================================================================
-- 1. The media bucket accepts anything, at any size.
--
-- `accept="image/*"` on the file inputs (ProjectEditor.jsx) is a hint to the
-- file picker and nothing more -- it never reaches Supabase, and the uploader
-- posts whatever it is handed. The bucket was created plainly in console.sql
-- with neither a type list nor a size cap, so today an HTML file can be put
-- in a PUBLIC bucket and served from our own Supabase domain: a phishing page
-- on our hostname. The size gap is duller but real -- storage is billed.
--
-- image/svg+xml is deliberately absent. An SVG is a script file, and nothing
-- on this site ever uploads one.
--
-- The heic/heif entries are not padding: an iPhone photograph is heic, the
-- browser-side shrink() in api.js gives up on formats it cannot decode, and
-- the original then goes up untouched.
-- ==========================================================================
update storage.buckets
set allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'image/heic', 'image/heif', 'image/avif',
      'application/pdf'
    ],
    file_size_limit = 52428800   -- 50 MB, matching what the drop zone promises
where id = 'project-media';

-- Expect one row, with both columns now populated.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'project-media';

-- If a legitimate upload is ever refused after this, the message names the
-- type, and the fix is to add that one type above -- not to empty the list.
-- A .glb 3D model would need 'model/gltf-binary'; today's tours are external
-- links rather than uploads, so it is left out.


-- ==========================================================================
-- 2. The public can write any column of an enquiry, not just their own.
--
-- enquiries.sql grants anon INSERT with `with check (true)`, which is right
-- about rows and silent about columns. A bot can therefore post
-- {"status":"Closed"} or a back-dated created_at, and the lead never appears
-- in the console's default New / This month views. Burying real enquiries
-- under invisible ones is a cheaper attack than flooding.
--
-- RLS decides WHICH ROWS may be written; column grants decide WHICH COLUMNS.
-- The policy stays exactly as it is; this is the other half.
-- ==========================================================================
revoke insert on public.enquiries from anon;
grant insert (name, phone, project, message, source) on public.enquiries to anon;

-- `id` is generated always, `created_at` and `status` keep their defaults --
-- which is the point: they can no longer be supplied by the sender.
-- The contact form writes exactly the five columns above, so nothing changes
-- for a real visitor. Verify by sending a test enquiry from /contact.html.

select grantee, string_agg(privilege_type || ' ' || column_name, ', ' order by column_name)
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'enquiries' and grantee = 'anon'
group by grantee;


-- ==========================================================================
-- 3. Social links have no scheme check.
--
-- Settings.jsx trims the value and stores it; Chrome.jsx renders it as
-- <a href> in the footer of every page. One mistyped paste, or one staff
-- account in the wrong hands, puts a javascript: link site-wide.
--
-- Same shape and same fix as `models`, so the same helper does the work.
-- ==========================================================================

-- Look first. Anything listed here must be corrected on the Contact & social
-- screen before the constraint will apply -- a bare "instagram.com/marc" with
-- no scheme counts, and is a broken link today anyway.
select jsonb_pretty(socials) as socials_needing_a_scheme
from public.site
where not public.all_https(socials);

alter table public.site drop constraint if exists site_socials_https;
alter table public.site add constraint site_socials_https
  check (public.all_https(socials));

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.site'::regclass and conname = 'site_socials_https';


-- ==========================================================================
-- Undo, should any of it get in the way:
--
--   update storage.buckets set allowed_mime_types = null, file_size_limit = null
--     where id = 'project-media';
--   grant insert on public.enquiries to anon;
--   alter table public.site drop constraint site_socials_https;
--
-- Section 2 is the one to reach for first if the contact form starts
-- failing -- though it should not, and a test enquiry proves it either way.
-- ==========================================================================
