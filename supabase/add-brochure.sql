-- ==========================================================================
-- Brochure downloads, gated behind the enquiry form.
--
-- "Download brochure" pointed at the contact page and delivered nothing. It
-- now opens the same form as an enquiry, records the lead, and hands over the
-- file — so a download is a lead rather than an anonymous hit.
-- ==========================================================================

alter table public.projects
  add column if not exists brochure_url text;

-- Where the lead came from. Constrained rather than free text: the console
-- filters on it, and 'brochure ' with a trailing space would quietly create a
-- category nobody can see.
alter table public.enquiries
  add column if not exists source text not null default 'contact';

do $$ begin
  alter table public.enquiries add constraint enquiries_source_check
    check (source in ('contact', 'brochure'));
exception when duplicate_object then null; end $$;

create index if not exists enquiries_source_idx on public.enquiries (source);

select
  (select count(*) from public.projects where brochure_url is not null) as projects_with_brochure,
  (select count(*) from public.enquiries where source = 'brochure') as brochure_leads;
