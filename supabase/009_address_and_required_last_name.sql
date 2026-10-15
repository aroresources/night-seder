-- Night Seder — an address for each man, and the surname becomes the required
-- part of a name instead of the given name.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once.
--
-- `people.name` is generated from the three parts, and in SQL `null || ' '`
-- is null — so simply allowing a null first name would have turned the whole
-- display name null for anyone without one. The expression is rebuilt to skip
-- the parts that aren't there. A generated column's expression cannot be
-- altered in place, so it is dropped and re-added, which is why its index is
-- recreated below.

alter table people add column if not exists address text;

-- Anyone recorded under a single name: that name is now his surname, since
-- that is the part the app insists on. Nobody is in this state today; this is
-- here so the NOT NULL below cannot fail on somebody added in the meantime.
update people
set last_name = first_name,
    first_name = null
where (last_name is null or btrim(last_name) = '')
  and first_name is not null
  and btrim(first_name) <> '';

alter table people alter column first_name drop not null;
alter table people alter column last_name set not null;

-- Rebuild the display name so a missing given name or middle name is simply
-- skipped rather than wiping the whole thing.
alter table people drop column if exists name;

alter table people
  add column name text generated always as (
    btrim(
      coalesce(nullif(btrim(first_name), '') || ' ', '')
      || coalesce(nullif(btrim(middle_name), '') || ' ', '')
      || coalesce(nullif(btrim(last_name), ''), '')
    )
  ) stored;

create index if not exists people_name_idx on people (name);
create index if not exists people_last_name_idx on people (last_name);

-- Check it took: name should be generated, first_name nullable, last_name not.
select column_name, is_nullable, is_generated, generation_expression
from information_schema.columns
where table_schema = 'public'
  and table_name = 'people'
  and column_name in ('first_name', 'last_name', 'name', 'address')
order by column_name;
