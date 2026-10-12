-- Night Seder — allow "divorced" as a marital status.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once: the constraint is dropped before it is added.
--
-- Nothing already stored becomes invalid — this only widens what is allowed.

alter table people drop constraint if exists people_marital_status_check;

alter table people
  add constraint people_marital_status_check
  check (marital_status in ('single', 'married', 'divorced'));
