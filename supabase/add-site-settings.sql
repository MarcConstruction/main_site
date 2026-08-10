-- ==========================================================================
-- Contact details and social links, editable in the console.
--
-- These lived in src/content/site.json, which only a developer could change --
-- so a new WhatsApp number meant a code edit and a deploy.
--
-- One row, id fixed at 1. A settings table with one row is duller than a
-- key/value store and reads as a form, which is what it is.
-- ==========================================================================

create table if not exists public.site (
  id            int primary key default 1 check (id = 1),
  phone         text not null default '',
  phone_display text not null default '',
  whatsapp      text not null default '',
  email         text not null default '',
  address       text not null default '',
  socials       jsonb not null default '[]',
  legal         text not null default '',
  updated_at    timestamptz not null default now()
);

insert into public.site (id, phone, phone_display, whatsapp, email, address, legal)
values (
  1,
  '+919552555621',
  '+91 95525 55621',
  'https://wa.me/919552555621',
  'info@marcconstruction.in',
  'Marc House, Opp. Datta Mandir, Nagar–Manmad Road, Savedi, Ahilyanagar 414003',
  'CIN U45202MH1996PTC100650 · MAHARERA REGISTERED · GST 27AAECM1234A1Z5 · © 2026 MARC CONSTRUCTION'
)
on conflict (id) do nothing;

alter table public.site enable row level security;

-- The footer is public, so these details are public. Writing is staff only.
create policy "anyone can read site details"
  on public.site for select to anon using (true);
create policy "staff read site details"
  on public.site for select to authenticated using (public.is_staff());
create policy "staff update site details"
  on public.site for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop trigger if exists site_touch on public.site;
create trigger site_touch before update on public.site
  for each row execute function public.touch_updated_at();

select * from public.site;
