-- ==========================================================================
-- Put the https:// guard back on the 3D tour links.
--
-- add-media-fields.sql constrained `model_url` at the database:
--
--     check (model_url is null or model_url ~ '^https://')
--
-- add-models.sql then replaced that single column with a `models` array and
-- carried no equivalent across, so the guard now covers only the legacy
-- column nothing reads. What actually reaches the page is `models`, and the
-- sole check on it lives in the browser (ProjectEditor.jsx:154) -- which a
-- direct PostgREST PATCH with a staff token goes straight past.
--
-- It matters more here than for an ordinary link: the value lands in an
-- <iframe src> on ProjectDetail.jsx. A frame is not merely a bad link.
--
-- NOTE ON SHAPE: a CHECK constraint may not contain a subquery -- Postgres
-- answers `0A000: cannot use subquery in check constraint` -- and walking a
-- jsonb array needs one. A CHECK may call a FUNCTION, though, and a function
-- that only reads its own argument is exactly the safe kind. Hence the
-- helper below rather than the array walk inline.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. The helper. Immutable and pure: it touches no table, only the value
--    handed to it, which is what makes it sound to use in a constraint.
--
--    Written to be reusable -- `socials` on the site table has the same
--    shape and the same problem, and security-hardening.sql calls this same
--    function for it.
--
--    Every branch matters:
--      empty array  -> bool_and over no rows is null -> coalesce to true
--      missing url  -> ->> gives null -> coalesce to '' -> fails the regex
--      numeric url  -> ->> gives '123' -> fails the regex
--      not an array -> false outright, rather than raising
-- --------------------------------------------------------------------------
create or replace function public.all_https(arr jsonb)
returns boolean language sql immutable as $$
  select jsonb_typeof(arr) = 'array'
     and coalesce(
           (select bool_and(coalesce(m->>'url', '') ~ '^https://')
            from jsonb_array_elements(arr) m),
           true);
$$;

-- --------------------------------------------------------------------------
-- 2. Look before you leap. Expect zero rows. Anything listed here has to be
--    corrected in the console first, or step 3 will refuse to apply.
-- --------------------------------------------------------------------------
select slug, name, models
from public.projects
where not public.all_https(models);

-- --------------------------------------------------------------------------
-- 3. The constraint.
-- --------------------------------------------------------------------------
alter table public.projects drop constraint if exists projects_models_https;
alter table public.projects add constraint projects_models_https
  check (public.all_https(models));

-- --------------------------------------------------------------------------
-- 4. Confirm it took, and prove it bites. The probe must be REJECTED; if it
--    inserts, the constraint is not doing anything. Nothing is left behind
--    either way -- the raise rolls the block back.
-- --------------------------------------------------------------------------
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.projects'::regclass
  and conname in ('projects_models_https', 'projects_model_url_check');

do $$ begin
  begin
    insert into public.projects (slug, name, locality, models)
    values ('constraint-probe-delete-me', 'probe', 'probe',
            '[{"label":"x","url":"javascript:alert(1)"}]'::jsonb);
    raise exception 'THE CONSTRAINT IS NOT WORKING — a javascript: tour was accepted.';
  exception when check_violation then
    raise notice 'Good: a javascript: tour is rejected by the constraint.';
  end;
end $$;
