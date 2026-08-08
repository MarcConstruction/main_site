-- Incoming enquiries from the contact form.
-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create table if not exists public.enquiries (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text check (char_length(name) <= 120),
  phone      text not null check (phone ~ '^[0-9]{10}$'),
  project    text check (char_length(project) <= 80),
  message    text check (char_length(message) <= 2000)
);

-- The browser posts with the anon key, which is public by design, so anyone
-- can craft their own request. The form's `pattern` attribute is decoration
-- to an attacker -- these CHECK constraints are the real validation, because
-- they sit where a request cannot go around them.

alter table public.enquiries enable row level security;

-- Insert only. There is deliberately no select/update/delete policy, so the
-- anon key can write an enquiry but can never read anybody else's back out.
-- Staff read them in the Supabase dashboard, which uses the service role and
-- bypasses RLS entirely.
create policy "public can submit an enquiry"
  on public.enquiries for insert to anon
  with check (true);

-- Staff read the list at /enquiries.html, which signs in with Supabase Auth.
--
-- Named accounts rather than `using (true)`. A policy open to any
-- `authenticated` user is only as tight as the sign-up toggle in
-- Project Settings -> Authentication -> User Signups, and a setting somebody
-- can flip back on is a bad place to keep the only lock on customers' phone
-- numbers. This grants read to listed addresses and nobody else, so an
-- unexpected account still sees an empty list.
--
-- REPLACE the address below before running, and add more the same way.
create policy "only marc staff can read enquiries"
  on public.enquiries for select to authenticated
  using ( (auth.jwt() ->> 'email') in ('you@marcconstruction.in') );

create index if not exists enquiries_created_at_idx
  on public.enquiries (created_at desc);

-- ponytail: no rate limiting. A honeypot field in the form catches ordinary
-- bots; a determined flooder could still fill this table. Add Cloudflare
-- Turnstile or a pg_cron cleanup if that actually happens, not before.
