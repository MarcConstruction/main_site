-- ==========================================================================
-- Carpet range.
--
-- The project page has a CARPET RANGE cell that was hardcoded to the pending
-- label, so every project claimed its carpet areas were still being worked
-- out — including the ones whose floor plans print the areas on the sheet.
--
-- Free text, not a pair of numbers: "620 – 1,180 sq ft" and "As printed on
-- the sheet" are both real answers, and a builder should be able to write
-- either without a form arguing about units.
-- ==========================================================================

alter table public.projects
  add column if not exists carpet text;

select name, coalesce(nullif(carpet, ''), '(not set)') as carpet
from public.projects
order by sort_order;
