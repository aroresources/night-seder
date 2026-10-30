-- 016_text_signups.sql
--
-- The public opt-in form at /texts writes here.
--
-- This is the only table anything unauthenticated may touch, and it may only
-- INSERT: no select, no update, no delete. A stranger can leave his name and
-- number, and can read nothing back — not this table, and not the members.
--
-- Signing up does NOT tick anybody for texts. A form on the open internet
-- that could set `people.sms_opt_in` by guessing a phone number would let
-- anyone opt a man in. A signup sits here until it is matched to a man in
-- the app, by hand, and the tick happens there.
--
-- The last statement prints what was made. Read it before closing the tab.

create table if not exists sms_signups (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  first_name  text,
  last_name   text not null,
  /** As typed. Normalised when it is matched, not before. */
  phone       text not null,
  /** The exact words he agreed to, kept as the record of what was consented to. */
  consent_text text not null,
  /** Set when it has been dealt with, matched or not. */
  handled_at  timestamptz,
  /** The man it turned out to be, once matched. */
  person_id   uuid references people (id) on delete set null
);

create index if not exists sms_signups_unhandled_idx on sms_signups (created_at)
  where handled_at is null;

alter table sms_signups enable row level security;

-- The signed-in user: everything, as with every other table.
drop policy if exists "authenticated full access" on sms_signups;
create policy "authenticated full access" on sms_signups
  for all to authenticated using (true) with check (true);

-- The public form: insert and nothing else. There is deliberately no select
-- policy, so a row cannot be read back by whoever wrote it.
drop policy if exists "anyone may sign up" on sms_signups;
create policy "anyone may sign up" on sms_signups
  for insert to anon with check (true);

select
  (select count(*) from sms_signups)                        as "signups so far",
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'sms_signups')
                                                            as "policies (expect 2)",
  (select string_agg(cmd, ', ' order by cmd) from pg_policies
    where schemaname = 'public' and tablename = 'sms_signups' and 'anon' = any(roles))
                                                            as "what anon may do (expect INSERT)",
  (select relrowsecurity from pg_class where relname = 'sms_signups')
                                                            as "row level security on";
