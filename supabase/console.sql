-- ==========================================================================
-- Owner Console — schema
-- Run once in the Supabase SQL editor, after enquiries.sql.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Who counts as staff.
--
-- A table rather than a list of addresses baked into the function, so this
-- whole file runs verbatim with nothing to edit first, and adding a colleague
-- later is one INSERT instead of a migration. The single line you must run
-- with your own address is at the very bottom of this file.
-- --------------------------------------------------------------------------
create table if not exists public.staff (
  email    text primary key,
  name     text,
  added_at timestamptz not null default now()
);

alter table public.staff enable row level security;

/* SECURITY DEFINER matters here: the function runs as its owner, which owns
   `staff` and therefore bypasses RLS on it. Without that, a policy that calls
   is_staff() to read a table would recurse into the policy on `staff`. */
/* Compared case-insensitively on purpose. Supabase lowercases the address on
   the account, but a human typing the staff row writes it however the address
   is normally written -- "Info@marcconstruction.in". An exact match then
   silently fails, and the symptom is not a login error but empty lists and
   storage uploads rejected for violating row-level security. */
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

create policy "staff read the staff list"
  on public.staff for select to authenticated using (public.is_staff());

-- --------------------------------------------------------------------------
-- Projects
-- --------------------------------------------------------------------------
create table if not exists public.projects (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  name         text not null,
  locality     text not null,
  status       text not null default 'Ongoing'
                 check (status in ('Ongoing', 'Completed', 'Upcoming')),
  type         text not null default 'Residential'
                 check (type in ('Residential', 'Commercial', 'Mixed-Use')),
  configs      text[] not null default '{}',
  config_label text,
  rera         text,
  qr_url       text,
  towers       text,
  possession   text,
  line         text,
  img          text,
  coords       text check (coords is null or coords ~ '^-?\d+\.\d+,-?\d+\.\d+$'),
  description  text,
  price_band   text,
  specs        text,
  amenities    text[] not null default '{}',
  plans        jsonb not null default '[]',
  media        jsonb not null default '[]',
  sort_order   int not null default 0,
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A published row must carry a RERA value. "To confirm" counts: it is a real
  -- state on the live site today, not a blank waiting to be filled, and seven
  -- of the fourteen projects use it.
  --
  -- ponytail: the QR code is NOT enforced here, though the console shows it as
  -- pending exactly as designed. No project has a QR image yet, so a database
  -- rule requiring one would take half the portfolio off the live site the
  -- moment it ran. Once every project has its QR uploaded, add
  -- `and qr_url is not null and btrim(qr_url) <> ''` to this check and the
  -- law's requirement becomes unbypassable rather than merely discouraged.
  constraint rera_required_to_publish check (
    not published or (rera is not null and btrim(rera) <> '')
  )
);

create index if not exists projects_sort_idx on public.projects (sort_order, id);
create index if not exists projects_published_idx on public.projects (published);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;

-- The site is public, so published rows are public. Drafts are not: an
-- unpublished project is commercially sensitive until Marc says otherwise.
create policy "anyone can read published projects"
  on public.projects for select to anon
  using (published = true);

create policy "staff read every project"
  on public.projects for select to authenticated using (public.is_staff());
create policy "staff insert projects"
  on public.projects for insert to authenticated with check (public.is_staff());
create policy "staff update projects"
  on public.projects for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "staff delete projects"
  on public.projects for delete to authenticated using (public.is_staff());

-- --------------------------------------------------------------------------
-- Enquiries: the status workflow from the console
-- --------------------------------------------------------------------------
alter table public.enquiries
  add column if not exists status text not null default 'New';

do $$ begin
  alter table public.enquiries add constraint enquiries_status_check
    check (status in ('New', 'Called', 'Site visit', 'Booked', 'Closed'));
exception when duplicate_object then null; end $$;

create index if not exists enquiries_status_idx on public.enquiries (status);

-- Replaces the email-list policy from enquiries.sql with the shared function.
drop policy if exists "only marc staff can read enquiries" on public.enquiries;
drop policy if exists "signed-in staff can read enquiries" on public.enquiries;

create policy "staff read enquiries"
  on public.enquiries for select to authenticated using (public.is_staff());

-- Marking an enquiry Called is the whole point of the list. Deliberately no
-- delete policy: a lead is never removed by hand, only aged out.
create policy "staff update enquiry status"
  on public.enquiries for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- --------------------------------------------------------------------------
-- Activity feed — the "Recent activity" panel on the dashboard
-- --------------------------------------------------------------------------
create table if not exists public.activity (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      text,
  summary    text not null
);

create index if not exists activity_at_idx on public.activity (at desc);
alter table public.activity enable row level security;

create policy "staff read activity"
  on public.activity for select to authenticated using (public.is_staff());
create policy "staff write activity"
  on public.activity for insert to authenticated with check (public.is_staff());

-- --------------------------------------------------------------------------
-- Media bucket. Public read because every file here ends up on the public
-- site anyway; writes are staff only.
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', true)
on conflict (id) do nothing;

create policy "staff upload project media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-media' and public.is_staff());

create policy "staff replace project media"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-media' and public.is_staff());

create policy "staff delete project media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-media' and public.is_staff());

-- ==========================================================================
-- THE ONE LINE TO EDIT. Put the email you sign in with, then run it.
-- Until this row exists, is_staff() is false for everyone and the console
-- shows empty lists -- which is the safe direction to fail in.
-- ==========================================================================
insert into public.staff (email, name)
values ('rmk@marcconstruction.in', 'Marc — Director')
on conflict (email) do nothing;
