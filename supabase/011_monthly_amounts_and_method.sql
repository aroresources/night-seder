-- 011_monthly_amounts_and_method.sql
--
-- Two things: a column for how a man is usually paid, and the amounts
-- themselves off the spreadsheet.
--
-- Unlike the contacts import, this one OVERWRITES. The spreadsheet is the
-- statement of who gets paid, how much, and by what — so a man marked "no"
-- has his amount and method cleared, and Shaya Spegal goes from 2000 to 500.
-- Anything typed into the app since the sheet was made is overwritten.
--
-- The last statement prints what happened. Read it before closing the tab.

alter table people add column if not exists usual_payment_method text;

-- The same five ways a payment can be made, plus null for "nobody has said".
alter table people drop constraint if exists people_usual_payment_method_check;
alter table people add constraint people_usual_payment_method_check
  check (usual_payment_method in ('cash', 'check', 'zelle', 'transfer', 'other'));

-- Two men with the same name cannot be told apart, and both would get the
-- same amount. Stop before touching anything if that is the case.
do $$
declare clashing text;
begin
  select string_agg(name, ', ')
    into clashing
    from (select name from people group by name having count(*) > 1) d;
  if clashing is not null then
    raise exception
      'These names belong to more than one person: %. Tell them apart before setting amounts.',
      clashing;
  end if;
end $$;

with imported (name, gets_paid, amount_cents, method) as (
  values
    ('Yerhuchem Altusky'::text, false::boolean, null::integer, null::text),
    ('Ezra Berger', false, null, null),
    ('Tzvi Bloch', false, null, null),
    ('Yitzchok El-Harar', false, null, null),
    ('Nechemia Elezary', true, 30000, 'zelle'),
    ('Shloime Epstein', true, 40000, 'zelle'),
    ('R Lazer Feldberger', false, null, null),
    ('Baruch Dovid Fogel', true, 40000, 'zelle'),
    ('Yaakov Yosef Frank', true, 40000, 'zelle'),
    ('Ahron Freidman', true, 40000, 'zelle'),
    ('Menachem Freund', true, 30000, 'zelle'),
    ('Chesky Friedman', true, 30000, 'zelle'),
    ('Meir Giberer', true, 40000, 'zelle'),
    ('Eliezer Gluck', true, 30000, 'zelle'),
    ('Ahron Goldblatt', true, 40000, 'zelle'),
    ('Moshe Goldzweig', true, 40000, 'zelle'),
    ('Shmully Green', true, 100000, 'zelle'),
    ('Leiby Grunfeld', true, 30000, 'zelle'),
    ('Moshe Gutfruend', true, 50000, 'zelle'),
    ('Chumsh Herz', true, 35000, 'zelle'),
    ('Yanky Herzog', true, 40000, 'zelle'),
    ('Yehudah Israelian', true, 40000, 'zelle'),
    ('Eli Jacobowitz', true, 40000, 'zelle'),
    ('Ahron Juni', true, 45000, 'zelle'),
    ('Tuvia Kessler', true, 30000, 'zelle'),
    ('Ari Krohn', false, null, null),
    ('Asher Kushner', true, 40000, 'zelle'),
    ('Yeruchum Levine', false, null, null),
    ('Ezzy Levy', false, null, null),
    ('Shmuel Lew', false, null, null),
    ('Yakov Lichtenstein', true, 40000, 'zelle'),
    ('Yosef Mordechai Marizan', true, 30000, 'zelle'),
    ('Meir Don Mark', true, 40000, 'check'),
    ('Shmuel Matzliach', false, null, null),
    ('Aryeh Neuman', false, null, null),
    ('Avi Newhouse', false, null, null),
    ('Shmuel Yitzchok Newman', true, 40000, 'check'),
    ('Yehudah Newman', true, 40000, 'zelle'),
    ('Yossi Noble', true, 40000, 'zelle'),
    ('Yitzchok Nussbaum', true, 50000, 'zelle'),
    ('Yehoshua Obermeister', true, 30000, 'zelle'),
    ('Moche Paperman', true, 40000, 'zelle'),
    ('Ahron Pekier', true, 40000, 'zelle'),
    ('Meir Peppard', true, 30000, 'zelle'),
    ('Ezriel Rappaport', true, 40000, 'zelle'),
    ('Efi Reich', true, 40000, 'zelle'),
    ('Naftali Rozansky', false, null, null),
    ('Dov Safrin', true, 30000, 'zelle'),
    ('Yehudah Salb', true, 50000, 'zelle'),
    ('R Schorr', false, null, null),
    ('Dovi Schwed', true, 30000, 'zelle'),
    ('Menachem Shalom', false, null, null),
    ('Yehudah Singer', true, 40000, 'zelle'),
    ('Shaya Spegal', true, 50000, 'zelle'),
    ('Yosef Dov Stern', false, null, null),
    ('Menachem Tepper', true, 30000, 'zelle'),
    ('Elimelech Trenk', true, 125000, 'zelle'),
    ('Gershon Ullman', true, 40000, 'zelle'),
    ('R Weinberger', true, 40000, 'zelle'),
    ('Chezkel Wenger', true, 40000, 'zelle'),
    ('Meir Willman', false, null, null),
    ('Yakov Wolf', true, 45000, 'zelle'),
    ('Shmuel Yoslofsky', true, 40000, 'zelle'),
    ('Shmuel Zelasko', true, 40000, 'zelle')
),
updated as (
  update people p
  set gets_paid            = i.gets_paid,
      monthly_amount_cents = i.amount_cents,
      usual_payment_method = i.method
  from imported i
  where p.name = i.name
  returning p.name, p.gets_paid, p.monthly_amount_cents, p.usual_payment_method
)
select
  (select count(*) from imported)                           as "names on the list",
  (select count(*) from updated)                            as "matched a person",
  (select count(*) from updated where gets_paid)            as "now marked paid",
  (select to_char(coalesce(sum(monthly_amount_cents), 0) / 100.0, 'FM999999990.00')
     from updated)                                          as "a month, in total",
  (select string_agg(m.usual_payment_method || ' ' || m.n, ', ' order by m.n desc)
     from (select usual_payment_method, count(*) as n
             from updated
            where usual_payment_method is not null
            group by usual_payment_method) m)               as "paid by",
  (select coalesce(string_agg(i.name, ', ' order by i.name), 'none')
     from imported i
    where not exists (select 1 from updated u where u.name = i.name))
                                                            as "matched nobody";
