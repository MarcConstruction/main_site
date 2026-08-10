-- ==========================================================================
-- Construction progress, per project.
--
-- It was five lines of markup on the project page -- "Wing B, 7 of 11 slabs"
-- and the rest -- rendered identically for every project. True of one site,
-- and a statement about somebody else's building on the other thirteen.
--
-- Each entry is { "stage": "Wing A, 11 slabs", "state": "Complete" }.
-- `state` is free text on purpose: "Complete" and "In progress" colour
-- themselves on the page, and anything else ("Mar 2027") reads as a target.
-- ==========================================================================

alter table public.projects
  add column if not exists progress jsonb not null default '[]';

-- The existing five, given to Rainflower, which is the site they describe.
update public.projects
set progress = '[
  {"stage": "Excavation & footing",     "state": "Complete"},
  {"stage": "Wing A, 11 slabs",         "state": "Complete"},
  {"stage": "Wing B, 7 of 11 slabs",    "state": "In progress"},
  {"stage": "Blockwork & plaster",      "state": "In progress"},
  {"stage": "Finishing & handover",     "state": "Mar 2027"}
]'::jsonb
where slug = 'rainflower' and progress = '[]'::jsonb;

select name, jsonb_array_length(progress) as stages
from public.projects
order by sort_order;
