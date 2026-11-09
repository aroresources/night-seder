-- 017_unnamed_subscribers.sql
--
-- Night Seder — letting a number get texts without knowing whose it is.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once.
--
-- Until now a number could only receive anything once it was matched to a
-- man, because a recipient was a row in `people` and `people` needs a name.
-- But a fellow who texts JOIN has given real consent whether or not anyone
-- knows who he is, and he was promised he would be added. So a signup can
-- now be subscribed in its own right: a phone number, the words it agreed
-- to, and the date — which is exactly the record the carriers ask for.
--
-- He is deliberately NOT a half-person. He has no name, no programme and no
-- attendance, so he cannot appear in Contact or Reports and cannot be
-- counted absent. He gets messages aimed at everybody and nothing else,
-- because "Night seder" means a list he is not on.
--
-- The last statement prints what changed. Read it before closing the tab.

-- 1. A signup can be subscribed in its own right.

alter table sms_signups add column if not exists subscribed    boolean not null default false;
alter table sms_signups add column if not exists subscribed_at timestamptz;
-- He texted STOP. Kept apart from "not subscribed" so he is never re-added
-- by a later tap: saying stop is a decision, never having started is not.
alter table sms_signups add column if not exists opted_out     boolean not null default false;

-- The date is stamped here rather than by a screen, so it is true however
-- the row was changed. Same arrangement as people.sms_opt_in_at.
create or replace function sms_signups_track_subscribed() returns trigger as $$
begin
  if new.subscribed and not coalesce(old.subscribed, false) then
    new.subscribed_at := now();
  elsif not new.subscribed then
    new.subscribed_at := null;
  end if;
  -- Asking to stop ends the subscription in the same breath.
  if new.opted_out and not coalesce(old.opted_out, false) then
    new.subscribed    := false;
    new.subscribed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sms_signups_track_subscribed on sms_signups;
create trigger sms_signups_track_subscribed
  before insert or update on sms_signups
  for each row execute function sms_signups_track_subscribed();

create index if not exists sms_signups_subscribed_idx on sms_signups (created_at)
  where subscribed;

-- 2. A sent message can now be addressed to a signup instead of a man.
--
-- `person_id` was NOT NULL with a unique (message_id, person_id). Both have
-- to give. The constraint is looked up rather than named from memory: a
-- `drop constraint if exists` on a wrong name succeeds and does nothing,
-- and the rest of this file would then fail in a confusing way.

alter table message_recipients alter column person_id drop not null;

alter table message_recipients
  add column if not exists signup_id uuid references sms_signups (id) on delete cascade;

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
     where conrelid = 'message_recipients'::regclass and contype = 'u'
  loop
    execute format('alter table message_recipients drop constraint %I', constraint_name);
  end loop;
end $$;

-- One row per message per recipient, whichever kind of recipient he is.
create unique index if not exists message_recipients_message_person_idx
  on message_recipients (message_id, person_id) where person_id is not null;
create unique index if not exists message_recipients_message_signup_idx
  on message_recipients (message_id, signup_id) where signup_id is not null;
create index if not exists message_recipients_signup_idx
  on message_recipients (signup_id) where signup_id is not null;

-- A recipient is one or the other, never both and never neither. Without
-- this, dropping NOT NULL would quietly allow a row addressed to nobody.
alter table message_recipients drop constraint if exists message_recipients_one_subject;
alter table message_recipients
  add constraint message_recipients_one_subject
  check (num_nonnulls(person_id, signup_id) = 1);

-- 3. What changed.

select
  (select count(*) from sms_signups)                                   as "signups",
  (select count(*) from sms_signups where subscribed)                  as "subscribed (expect 0)",
  (select count(*) from information_schema.columns
    where table_name = 'sms_signups'
      and column_name in ('subscribed', 'subscribed_at', 'opted_out'))  as "new signup columns (expect 3)",
  (select is_nullable from information_schema.columns
    where table_name = 'message_recipients' and column_name = 'person_id')
                                                                       as "person_id nullable (expect YES)",
  (select count(*) from information_schema.columns
    where table_name = 'message_recipients' and column_name = 'signup_id')
                                                                       as "signup_id added (expect 1)",
  (select count(*) from pg_constraint
    where conrelid = 'message_recipients'::regclass
      and conname = 'message_recipients_one_subject')                  as "one-subject check (expect 1)",
  (select count(*) from pg_trigger
    where tgrelid = 'sms_signups'::regclass
      and tgname = 'sms_signups_track_subscribed')                     as "date trigger (expect 1)";
