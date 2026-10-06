-- Night Seder — track Shachris alongside Daf.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once.
--
-- Shachris is a third thing to take attendance at, run on the same rule as
-- Daf: every morning except Shabbos, minus its own days off. It gets its own
-- attendance table, its own membership flag and its own days off, because the
-- men who come to Shachris are not the men who come to the shiur.

alter table people   add column if not exists in_shachris boolean not null default false;
alter table settings add column if not exists shachris_absence_threshold int not null default 3;

create table if not exists shachris_attendance (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date       date not null,
  person_id  uuid not null references people on delete cascade,
  unique (date, person_id)
);

create index if not exists shachris_attendance_date_idx on shachris_attendance (date);
create index if not exists shachris_attendance_person_idx on shachris_attendance (person_id);

create table if not exists shachris_days_off (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date       date not null unique,
  reason     text
);

-- Row level security, same as every other table.

alter table shachris_attendance enable row level security;
alter table shachris_days_off   enable row level security;

drop policy if exists "authenticated full access" on shachris_attendance;
create policy "authenticated full access" on shachris_attendance for all to authenticated using (true) with check (true);
drop policy if exists "authenticated full access" on shachris_days_off;
create policy "authenticated full access" on shachris_days_off   for all to authenticated using (true) with check (true);
