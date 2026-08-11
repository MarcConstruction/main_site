-- The seed in add-site-settings.sql is `on conflict do nothing`, so the row that
-- already exists still carries the old CIN. Drop it and name the memberships.
update public.site
set legal = 'MEMBER OF MAREDCO AND MBVA · MAHARERA REGISTERED · GST 27AAECM1234A1Z5 · © 2026 MARC CONSTRUCTION'
where id = 1;
