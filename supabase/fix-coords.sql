-- ==========================================================================
-- Fix: saving a project with no map coordinates violated projects_coords_check.
--
-- The column allowed null or "lat,lng". A form field the user never touches
-- sends "" -- neither of those -- so every project without a pin was
-- unsaveable, and the error named the coords constraint while the user was
-- looking at the Compliance tab.
--
-- Normalising in a trigger rather than trusting the client: "" is the sort of
-- thing that arrives from any form, ever, and the database is the one place
-- it can be dealt with once.
-- ==========================================================================

create or replace function public.normalise_project()
returns trigger language plpgsql as $$
begin
  -- "" and "   " become null; "19.12, 74.74" loses its space
  new.coords := nullif(btrim(replace(coalesce(new.coords, ''), ' ', '')), '');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  before insert or update on public.projects
  for each row execute function public.normalise_project();

-- Tidy anything already stored as blank.
update public.projects set coords = null where btrim(coalesce(coords, '')) = '';

-- Accept whole numbers too. "19,74" is a legitimate if imprecise pin, and
-- rejecting it taught the owner nothing except that the form was broken.
alter table public.projects drop constraint if exists projects_coords_check;
alter table public.projects add constraint projects_coords_check
  check (coords is null or coords ~ '^-?\d+(\.\d+)?,-?\d+(\.\d+)?$');

select id, name, coords from public.projects order by sort_order;
