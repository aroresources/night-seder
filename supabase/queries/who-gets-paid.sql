-- Who gets paid, as a spreadsheet to fill in.
--
-- Not a migration: this only reads. Run it in the SQL editor, then use
-- "Download CSV" above the results, put a number in the last column for
-- each man, and send the file back.
--
-- It lists the rabbis, plus anyone already ticked "gets paid" who isn't a
-- rabbi, so nobody being paid falls off the list.

select
  p.name                                                      as "name",
  p.role                                                      as "role",
  case when p.gets_paid then 'yes' else 'no' end              as "ticked gets paid",
  case
    when p.monthly_amount_cents is null then ''
    else to_char(p.monthly_amount_cents / 100.0, 'FM999999990.00')
  end                                                         as "amount on file",
  ''                                                          as "monthly amount"
from people p
where p.active
  and (p.role = 'rabbi' or p.gets_paid)
order by p.last_name, p.first_name nulls first;
