-- Night Seder — names in three parts, plus an email address.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once.
--
-- `people.name` stops being something the app writes and becomes a column the
-- database computes from the three parts, so it can never drift out of step
-- with them. Everything that reads a person's name — sorting, search, pair
-- labels, CSV exports — keeps working untouched.

-- 1. The new columns ----------------------------------------------------

alter table people add column if not exists first_name  text;
alter table people add column if not exists middle_name text;
alter table people add column if not exists last_name   text;
alter table people add column if not exists email       text;

-- 2. Split any existing names --------------------------------------------
-- First word is the first name, last word is the surname, anything between is
-- the middle. A guess, and editable afterwards.

update people as p
set first_name  = coalesce(nullif(parts.words[1], ''), 'Unknown'),
    middle_name = case
                    when array_length(parts.words, 1) > 2
                    then array_to_string(parts.words[2:array_length(parts.words, 1) - 1], ' ')
                  end,
    last_name   = case
                    when array_length(parts.words, 1) > 1
                    then parts.words[array_length(parts.words, 1)]
                  end
from (
  select id,
         string_to_array(btrim(regexp_replace(name, '\s+', ' ', 'g')), ' ') as words
  from people
) as parts
where parts.id = p.id
  and p.first_name is null;

-- Anyone whose name was blank still needs something to show.
update people set first_name = 'Unknown' where first_name is null or btrim(first_name) = '';

alter table people alter column first_name set not null;

-- 3. Hand `name` over to the database -------------------------------------
-- Guarded so a second run is a no-op: is_generated is 'NEVER' only while the
-- column is still a plain one the app writes.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'people'
      and column_name = 'name'
      and is_generated = 'NEVER'
  ) then
    alter table people drop column name;

    alter table people
      add column name text generated always as (
        btrim(
          first_name
          || coalesce(' ' || nullif(btrim(middle_name), ''), '')
          || coalesce(' ' || nullif(btrim(last_name), ''), '')
        )
      ) stored;
  end if;
end $$;

-- Dropping the column dropped its index with it.
create index if not exists people_name_idx on people (name);
create index if not exists people_last_name_idx on people (last_name);
