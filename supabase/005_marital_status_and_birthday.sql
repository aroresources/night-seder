-- Night Seder — whether a man is single or married, and his birthday.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once.
--
-- marital_status is deliberately nullable rather than a boolean. There are
-- already a hundred men in here, and a boolean would have to default to
-- something — quietly asserting that every one of them is single until
-- somebody goes through and says otherwise. Null means "not said yet", which
-- is the truth, and the People filter only matches men you have actually
-- marked.
--
-- Age is not stored. It is worked out from the birthday whenever it is shown,
-- because a stored age is wrong within a year of writing it down.

alter table people add column if not exists marital_status text;
alter table people add column if not exists birthday date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'people_marital_status_check'
  ) then
    alter table people
      add constraint people_marital_status_check
      check (marital_status in ('single', 'married'));
  end if;
end $$;
