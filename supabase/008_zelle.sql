-- Night Seder — allow Zelle as a way a payment was made.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run more than once.
--
-- Nothing already stored becomes invalid: this only widens what is allowed.
--
-- The old constraint is found by looking it up rather than by assuming its
-- name. An inline `check (...)` gets an auto-generated name, and dropping a
-- name that doesn't exist succeeds quietly — which would leave the original
-- constraint in place, still rejecting 'zelle', while the script reported
-- success. That is exactly how 006 appeared to work and didn't.

do $$
declare
  existing record;
begin
  for existing in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'payments'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%method%'
  loop
    execute format('alter table payments drop constraint %I', existing.conname);
  end loop;
end $$;

alter table payments
  add constraint payments_method_check
  check (method in ('cash', 'check', 'zelle', 'transfer', 'other'));

-- Check it actually took. This should list 'zelle'.
select pg_get_constraintdef(oid) as constraint_now
from pg_constraint
where conname = 'payments_method_check';
