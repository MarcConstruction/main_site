-- ==========================================================================
-- More than one 3D tour per project.
--
-- model_url held exactly one, which is wrong for the same reason one floor
-- plan would be: a project has a 2 BHK tour and a 3 BHK tour, or a tower and
-- a clubhouse.
--
-- Each entry is { "label": "3 BHK", "url": "https://…/index.html" }.
-- ==========================================================================

alter table public.projects
  add column if not exists models jsonb not null default '[]';

-- Carry the single tour over, labelled by the project's configuration so it
-- is not left as an unnamed tab.
update public.projects
set models = jsonb_build_array(
      jsonb_build_object('label', coalesce(nullif(config_label, ''), '3D walkthrough'),
                         'url', model_url))
where model_url is not null and btrim(model_url) <> '' and models = '[]'::jsonb;

-- model_url is deliberately kept, holding the first tour. The site reads
-- `models`; this stays so an older deployment mid-rollout still shows
-- something rather than nothing, and its https CHECK still guards that value.

select name, model_url is not null as had_one, jsonb_array_length(models) as tours
from public.projects
order by sort_order;
