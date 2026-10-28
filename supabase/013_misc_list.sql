-- 013_misc_list.sql
--
-- The Misc list: men who turn up now and again without being on anybody's
-- list. They are marked when they come and never chased when they don't, so
-- this gets an attendance table like the others but no days-off table — a
-- programme with no schedule has no day that could be off, and nothing to be
-- absent from.
--
-- The last statement prints what was made. Read it before closing the tab.

alter table people add column if not exists in_misc boolean not null default false;

create table if not exists misc_attendance (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date       date not null,
  person_id  uuid not null references people (id) on delete cascade,
  unique (date, person_id)
);

create index if not exists misc_attendance_date_idx on misc_attendance (date);
create index if not exists misc_attendance_person_idx on misc_attendance (person_id);

alter table misc_attendance enable row level security;

-- Same as every other table: the signed-in user, and nothing for `anon`.
drop policy if exists "authenticated full access" on misc_attendance;
create policy "authenticated full access" on misc_attendance
  for all to authenticated using (true) with check (true);

select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'people' and column_name = 'in_misc')
                                                        as "people.in_misc exists",
  (select count(*) from misc_attendance)                as "misc attendance rows",
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'misc_attendance')
                                                        as "policies on misc_attendance",
  (select relrowsecurity from pg_class where relname = 'misc_attendance')
                                                        as "row level security on";
