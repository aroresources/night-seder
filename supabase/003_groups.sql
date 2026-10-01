-- Night Seder — groups, for tagging the men who learn a particular topic.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once.
--
-- A person can be in any number of groups, so this is a join table rather
-- than a column on `people`. Groups are only a label and a filter: they do
-- not affect pairs, schedules or who is expected at a session.

create table if not exists groups (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null
);

-- Case-insensitive, so "Gemara" and "gemara" can't both exist.
create unique index if not exists groups_name_idx on groups (lower(name));

create table if not exists person_groups (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  person_id  uuid not null references people on delete cascade,
  group_id   uuid not null references groups on delete cascade,
  unique (person_id, group_id)
);

create index if not exists person_groups_group_idx on person_groups (group_id);
create index if not exists person_groups_person_idx on person_groups (person_id);

-- Row level security, same as every other table.

alter table groups        enable row level security;
alter table person_groups enable row level security;

drop policy if exists "authenticated full access" on groups;
create policy "authenticated full access" on groups        for all to authenticated using (true) with check (true);
drop policy if exists "authenticated full access" on person_groups;
create policy "authenticated full access" on person_groups for all to authenticated using (true) with check (true);
