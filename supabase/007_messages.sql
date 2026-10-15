-- Night Seder — sending text messages to the men.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once.
--
-- Broadcasts are kept apart from the correspondence log on purpose. The
-- Contact screen sorts by who you have gone longest without speaking to, and
-- "last contact" is meant to mean you actually reached out to him. Texting
-- a hundred and seventy men at once would reset every one of those to today
-- and make the whole screen useless. A broadcast is a different thing from a
-- phone call, so it lives in its own log.

alter table people add column if not exists sms_opt_out boolean not null default false;

create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  body       text not null,
  -- What the message was aimed at, in words, for the history list.
  audience   text
);

create index if not exists messages_created_idx on messages (created_at desc);

create table if not exists message_recipients (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message_id uuid not null references messages on delete cascade,
  person_id  uuid not null references people on delete cascade,
  -- The number actually used, as it was sent. Kept because a man's phone
  -- number can change afterwards and the history should still be true.
  phone      text,
  status     text not null check (status in ('sent', 'failed', 'skipped')),
  error      text,
  unique (message_id, person_id)
);

create index if not exists message_recipients_message_idx on message_recipients (message_id);
create index if not exists message_recipients_person_idx on message_recipients (person_id);

-- Row level security, same as every other table.

alter table messages           enable row level security;
alter table message_recipients enable row level security;

drop policy if exists "authenticated full access" on messages;
create policy "authenticated full access" on messages           for all to authenticated using (true) with check (true);
drop policy if exists "authenticated full access" on message_recipients;
create policy "authenticated full access" on message_recipients for all to authenticated using (true) with check (true);
