-- 015_sms_opt_in.sql
--
-- Who has agreed to be texted.
--
-- Having a man's number is not permission to text him: most of the chabura
-- would rather have WhatsApp, and the A2P campaign is registered on the
-- footing that each man was asked and said yes. So this starts at false for
-- everybody, including the men whose numbers are already on file, and is
-- ticked as consent is actually collected.
--
-- `sms_opt_in_at` is kept by a trigger rather than by the app: it is the
-- date you would have to produce if a carrier ever asked when he agreed, and
-- it should not depend on which screen did the ticking.
--
-- The last statement prints what was made. Read it before closing the tab.

alter table people add column if not exists sms_opt_in boolean not null default false;
alter table people add column if not exists sms_opt_in_at timestamptz;

create or replace function people_track_sms_opt_in() returns trigger as $$
begin
  if new.sms_opt_in and not coalesce(old.sms_opt_in, false) then
    new.sms_opt_in_at := now();
  elsif not new.sms_opt_in then
    -- Consent withdrawn is not consent with an old date on it.
    new.sms_opt_in_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists people_sms_opt_in_at on people;
create trigger people_sms_opt_in_at
  before insert or update of sms_opt_in on people
  for each row execute function people_track_sms_opt_in();

select
  (select count(*) from people)                              as "people",
  (select count(*) from people where sms_opt_in)             as "opted in (expect 0)",
  (select count(*) from people where sms_opt_in_at is not null)
                                                             as "with a consent date (expect 0)",
  (select count(*) from pg_trigger
    where tgname = 'people_sms_opt_in_at' and not tgisinternal)
                                                             as "trigger in place (expect 1)";
