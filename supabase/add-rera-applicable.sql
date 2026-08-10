-- ==========================================================================
-- Not every project is a MahaRERA project.
--
-- Registration came in with the Act in 2017, and small plots fall under the
-- threshold, so a completed 2010 building has no number and never will. The
-- page still demanded one and showed "Updating soon" forever, which reads as
-- a builder who has not got round to it rather than a rule that does not
-- apply.
--
-- Default true: the safe direction is to assume it IS required, so a new
-- project has to be deliberately marked otherwise rather than quietly
-- escaping the check.
-- ==========================================================================

alter table public.projects
  add column if not exists rera_applicable boolean not null default true;

-- The publish rule still holds wherever registration applies. Turning it off
-- is the only way past it, which is a decision someone makes on purpose.
alter table public.projects drop constraint if exists rera_required_to_publish;
alter table public.projects add constraint rera_required_to_publish check (
  not published
  or not rera_applicable
  or (rera is not null and btrim(rera) <> '')
);

select name, rera_applicable, coalesce(nullif(rera, ''), '(none)') as rera, published
from public.projects
order by sort_order;
