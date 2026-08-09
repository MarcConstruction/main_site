-- ==========================================================================
-- Diagnose and fix "new row violates row-level security policy" on upload.
-- Run the whole thing in the Supabase SQL editor; read the two result sets,
-- then the fix at the bottom applies regardless.
-- ==========================================================================

-- 1. Do the two addresses actually match?
--    The left column is who can sign in, the right is who counts as staff.
--    A blank right-hand side, or a case difference, is the whole problem.
select
  u.email                                   as account_email,
  s.email                                   as staff_email,
  (s.email is not null)                     as matches_exactly,
  (lower(u.email) = lower(coalesce(s.email, '')))
                                            as matches_ignoring_case
from auth.users u
left join public.staff s on s.email = u.email;

-- 2. Are the storage policies actually there? Expect three rows.
select policyname
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- --------------------------------------------------------------------------
-- 3. The fix: match on lowercase, so how the address was typed stops
--    mattering. Safe to run more than once.
-- --------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- 4. And make sure every signed-up account is on the staff list. Sign-ups are
--    disabled, so auth.users only contains people you created by hand.
insert into public.staff (email, name)
select u.email, coalesce(s.name, 'Marc — Director')
from auth.users u
left join public.staff s on lower(s.email) = lower(u.email)
where s.email is null
on conflict (email) do nothing;

-- 5. Confirm. Every row should now read true.
select
  u.email,
  exists (select 1 from public.staff s where lower(s.email) = lower(u.email)) as is_staff_now
from auth.users u;
