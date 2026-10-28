-- 014_shidduch.sql
--
-- The shidduch side of a person: what he does, who he learns under, what he
-- is looking for, a photo, and his resume.
--
-- Marital status and birthday already exist (005, 006) and are not touched —
-- the app just shows them under this heading instead of with his attendance.
--
-- Files live in a PRIVATE storage bucket. Nothing here is readable without a
-- signed-in session, and the app hands out links that expire, so a resume
-- cannot be passed around by URL.
--
-- The last statement prints what was made. Read it before closing the tab.

alter table people add column if not exists job text;
alter table people add column if not exists rebbe text;
alter table people add column if not exists looking_for text;
-- The object's path inside the bucket, not a URL: URLs here expire.
alter table people add column if not exists photo_path text;

create table if not exists person_files (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  person_id    uuid not null references people (id) on delete cascade,
  -- Unique so the same object can never be listed twice.
  path         text not null unique,
  name         text not null,
  content_type text,
  size_bytes   bigint
);

create index if not exists person_files_person_idx on person_files (person_id);

alter table person_files enable row level security;

drop policy if exists "authenticated full access" on person_files;
create policy "authenticated full access" on person_files
  for all to authenticated using (true) with check (true);

-- Storage ----------------------------------------------------------------

-- Private: `public` false means no object is served without a signed link.
insert into storage.buckets (id, name, public)
values ('person-files', 'person-files', false)
on conflict (id) do nothing;

drop policy if exists "authenticated reads person files" on storage.objects;
drop policy if exists "authenticated writes person files" on storage.objects;
create policy "authenticated reads person files" on storage.objects
  for select to authenticated using (bucket_id = 'person-files');
create policy "authenticated writes person files" on storage.objects
  for all to authenticated
  using (bucket_id = 'person-files')
  with check (bucket_id = 'person-files');

select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'people'
      and column_name in ('job', 'rebbe', 'looking_for', 'photo_path'))
                                                      as "new columns on people, of 4",
  (select count(*) from person_files)                 as "files recorded",
  (select public from storage.buckets where id = 'person-files')
                                                      as "bucket is public (want false)",
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like '%person files%')           as "storage policies, of 2";
