-- ==========================================================================
-- Let a staff member set the name and title shown in the console.
--
-- The rail printed the login email and the word DIRECTOR, hardcoded, for
-- everybody -- so a second person would also have been "Director", and the
-- only name shown was an address.
-- ==========================================================================

alter table public.staff
  add column if not exists role text;

-- Own row only. Reading the staff list is already allowed; being able to
-- rename a colleague is a different thing, and not one the console needs.
drop policy if exists "staff update their own row" on public.staff;
create policy "staff update their own row"
  on public.staff for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));

select email, name, role from public.staff;
