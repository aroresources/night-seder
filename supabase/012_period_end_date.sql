-- 012_period_end_date.sql
--
-- A payment period now has two ends, not just a start.
--
-- The one period that already exists, "Tishri 5787", starts 2026-10-05 and
-- has no end. Tishri 5787 itself ran to 2026-10-11, so that is what it gets.
-- Change it on the period's own screen if the pay period was meant to be a
-- different stretch — nothing else depends on the dates.
--
-- The last statement prints the periods back. Read it before closing the tab.

alter table payment_periods add column if not exists end_date date;

-- Existing rows first: the column cannot be made required while any row is
-- empty. A period with no end is treated as ending the day it started, which
-- is the one reading that cannot overstate it.
update payment_periods
set end_date = date '2026-10-11'
where end_date is null
  and name = 'Tishri 5787'
  and start_date = date '2026-10-05';

update payment_periods
set end_date = start_date
where end_date is null;

alter table payment_periods alter column end_date set not null;

-- A period that finishes before it starts is a typo, not a period.
alter table payment_periods drop constraint if exists payment_periods_span_check;
alter table payment_periods add constraint payment_periods_span_check
  check (end_date >= start_date);

select name, start_date, end_date, (end_date - start_date) + 1 as "days, inclusive"
from payment_periods
order by start_date desc;
