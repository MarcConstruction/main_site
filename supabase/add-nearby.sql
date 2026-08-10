-- ==========================================================================
-- Nearby landmarks, per project.
--
-- Six were written into the page and drawn on every project. Measured against
-- Rainflower's own map pin they were not even right for the project they
-- described: nearest bus stop 750 m, not 400; nearest hospital 400 m, not the
-- 2.4 km quoted for a different one.
--
-- Each entry is { "place": "Sanjivani English School", "distance": "1.1 KM" }.
-- The console suggests them from OpenStreetMap using the project's pin, and a
-- human corrects them before publishing — those are straight-line distances,
-- and a distance on a builder's page is a claim a buyer acts on.
-- ==========================================================================

alter table public.projects
  add column if not exists nearby jsonb not null default '[]';

select name, jsonb_array_length(nearby) as landmarks
from public.projects
order by sort_order;
