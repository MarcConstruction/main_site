-- ==========================================================================
-- Per-project video walkthroughs and 3D model.
--
-- Both were global: the same three YouTube videos appeared on every project
-- page, and "Launch 3D model" did nothing at all.
-- ==========================================================================

alter table public.projects
  add column if not exists videos jsonb not null default '[]',
  add column if not exists model_url text;

-- The site is served over https, so an http iframe is blocked by the browser
-- as mixed content -- the panel would simply be blank with an error only in
-- the console. Refuse it here instead.
alter table public.projects drop constraint if exists projects_model_url_check;
alter table public.projects add constraint projects_model_url_check
  check (model_url is null or model_url ~ '^https://');

-- Rainflower's 3D walkthrough, since it already exists.
update public.projects
set model_url = 'https://surbhi-infotech.s3.ap-south-1.amazonaws.com/Rain_Flower/rain_flower_3bhk-1340/index.html'
where slug = 'rainflower';

select slug, name, model_url, jsonb_array_length(videos) as video_count
from public.projects
order by sort_order;
