-- Seed: the 14 projects currently in src/content/projects.json.
-- Generated from the JSON so nothing is retyped and nothing drifts.
-- Safe to re-run: on conflict (slug) it updates instead of duplicating.

insert into public.projects
  (slug, name, locality, status, type, configs, config_label, rera, towers,
   possession, line, img, coords, plans, sort_order, published)
values
  ('rainflower', 'Rainflower', 'Ahilyanagar', 'Ongoing', 'Residential', array['2 BHK','3 BHK','4 BHK'], '2, 3 & 4 BHK', 'To confirm', '2 wings · G+11', 'To confirm', '2, 3 & 4 BHK · Walkthroughs available', '/assets/rainflower-elevation.png', '19.1223267,74.7473039', '[{"label":"1st floor","img":"/assets/plans/rainflower-floor-1.png"},{"label":"2nd–11th floor","img":"/assets/plans/rainflower-floor-2-11.png"}]'::jsonb, 0, true),
  ('trident', 'Trident', 'Savedi', 'Ongoing', 'Residential', array['2 BHK','3 BHK'], '2 & 3 BHK', 'P52200077919', 'G+11', 'Dec 2027', '2 & 3 BHK · Possession Dec 2027', '/assets/trident-dusk.png', '19.1230232,74.7218829', '[{"label":"2nd–9th floor","img":"/assets/plans/trident-floor-2-9.png"}]'::jsonb, 10, true),
  ('bluebell', 'Bluebell', 'Ahilyanagar', 'Ongoing', 'Residential', array['2 BHK','3 BHK'], '2 & 3 BHK', 'To confirm', 'G+11', 'To confirm', '2 & 3 BHK · Brochure available', '/assets/bluebell-elevation.png', '19.1140017,74.733846', '[{"label":"2nd–7th floor","img":"/assets/plans/bluebell-floor-2-7.png"}]'::jsonb, 20, true),
  ('sierra', 'Sierra', 'Ahilyanagar', 'Ongoing', 'Residential', array['3 BHK'], '3 BHK', 'To confirm', 'G+11', 'To confirm', '3 BHK · Brochure available', '/assets/sierra-elevation.png', '19.1241512,74.7399494', '[{"label":"Typical floor","img":"/assets/plans/sierra-floor-typical.png"}]'::jsonb, 30, true),
  ('snowbell', 'Snowbell', 'Ahilyanagar', 'Ongoing', 'Residential', array['2 BHK','3 BHK'], '2 & 3 BHK', 'To confirm', 'G+11', 'To confirm', '2 & 3 BHK · Brochure available', '/assets/snowbell-elevation.png', '19.1237911,74.7403149', '[{"label":"Typical floor","img":"/assets/plans/snowbell-floor-typical.png"}]'::jsonb, 40, true),
  ('arabella', 'Arabella', 'Nalegaon', 'Ongoing', 'Residential', array['2 BHK','3 BHK'], '2 & 3 BHK', 'P52200048057', 'G+11', 'Mar 2027', '2 & 3 BHK · Possession Mar 2027', '/assets/bluebell-street.png', '19.102931,74.729069', '[]'::jsonb, 50, true),
  ('abhiram', 'Abhiram', 'Bhistabag', 'Ongoing', 'Residential', array['1 BHK','2 BHK'], '1 & 2 BHK', 'P52200049407', 'G+7', 'Jun 2027', '1 & 2 BHK · Possession Jun 2027', '/assets/sierra-street.png', null, '[]'::jsonb, 60, true),
  ('bluestone', 'Bluestone', 'Savedi', 'Ongoing', 'Commercial', array['Shop','Office'], 'Shops & offices', 'P52200052558', 'G+4', 'Sep 2027', 'Shops & offices · Possession Sep 2027', '/assets/trident-day.png', '19.1043047,74.7347696', '[]'::jsonb, 70, true),
  ('the-courtyard-i', 'The Courtyard Phase I', 'Savedi', 'Completed', 'Residential', array['2 BHK','3 BHK'], '2 & 3 BHK', 'P52200000247', 'G+7', 'Handed over', '2 & 3 BHK · Handed over', '/assets/bluebell-aerial.png', '19.1079819,74.7410736', '[]'::jsonb, 80, true),
  ('siya-ram-residency', 'Siya Ram Residency', 'Nalegaon', 'Completed', 'Residential', array['1 BHK','2 BHK'], '1 & 2 BHK', 'P52200018653', 'G+4', 'Handed over', '1 & 2 BHK · Handed over', '/assets/rainflower-day.png', '19.1153991,74.7234548', '[]'::jsonb, 90, true),
  ('utkarsha-iii', 'Utkarsha Phase III', 'Tarakpur', 'Completed', 'Residential', array['2 BHK'], '2 BHK', 'To confirm', 'G+4', 'Handed over', '2 BHK · Handed over', '/assets/trident-aerial.png', '19.1100151,74.7256595', '[]'::jsonb, 100, true),
  ('amrutkalash', 'Amrutkalash', 'Borude Mala', 'Completed', 'Residential', array['1 BHK','2 BHK'], '1 & 2 BHK', 'To confirm', 'G+4', 'Handed over', '1 & 2 BHK · Handed over', '/assets/sierra-aerial-night.png', '19.1101138,74.7271701', '[]'::jsonb, 110, true),
  ('anand-enclave', 'Anand Enclave', 'Bhistabag', 'Completed', 'Mixed-Use', array['2 BHK','Shop'], '2 BHK & shops', 'To confirm', 'G+4', 'Handed over', '2 BHK & shops · Handed over', '/assets/rainflower-aerial.png', '19.1100382,74.7310585', '[]'::jsonb, 120, true),
  ('magnolia', 'Magnolia', 'Savedi', 'Completed', 'Residential', array['3 BHK'], '3 BHK', 'P52200028201', 'G+7', 'Handed over', '3 BHK · Handed over', '/assets/snowbell-elevation.png', '19.1242637,74.7404393', '[]'::jsonb, 130, true)
on conflict (slug) do update set
  name = excluded.name, locality = excluded.locality, status = excluded.status,
  type = excluded.type, configs = excluded.configs,
  config_label = excluded.config_label, rera = excluded.rera,
  towers = excluded.towers, possession = excluded.possession,
  line = excluded.line, img = excluded.img, coords = excluded.coords,
  plans = excluded.plans;
