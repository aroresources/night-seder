-- Night Seder — initial schema.
-- Paste this whole file into the Supabase SQL editor and run it once.
--
-- Conventions used throughout:
--   * Every table has `id uuid primary key default gen_random_uuid()` and
--     `created_at timestamptz default now()`.
--   * Calendar dates are `date` columns holding a New York calendar date.
--     They are never timestamps: the night program starts at 8:30 pm Eastern,
--     which is already the next day in UTC.
--   * Weekdays are 0 = Sunday .. 6 = Saturday, matching JS getDay() and
--     Postgres extract(dow).

create extension if not exists pgcrypto;

-- People ---------------------------------------------------------------

create table if not exists people (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  name             text not null,
  role             text not null check (role in ('rabbi', 'working')),
  phone            text,
  notes            text,
  active           boolean not null default true,
  in_night_seder   boolean not null default true,
  in_daf           boolean not null default false,
  start_date       date not null default current_date,
  end_date         date,
  track_contact    boolean not null default true,
  snoozed_until    date,
  -- Some of the men are paid. `monthly_amount_cents` is what he usually gets
  -- for a month; an individual payment can be more or less.
  gets_paid            boolean not null default false,
  monthly_amount_cents int
);

create index if not exists people_active_idx on people (active);
create index if not exists people_name_idx on people (name);

-- Zmanim ---------------------------------------------------------------

create table if not exists zmanim (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  start_date   date not null,
  end_date     date not null,
  off_weekdays int[] not null default '{5,6}'
);

create index if not exists zmanim_range_idx on zmanim (start_date, end_date);

create table if not exists zman_days_off (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  zman_id    uuid not null references zmanim on delete cascade,
  date       date not null,
  reason     text,
  unique (zman_id, date)
);

-- Pairs ----------------------------------------------------------------

create table if not exists pairs (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  zman_id    uuid not null references zmanim on delete cascade,
  label      text,
  sort_order int not null default 0
);

create index if not exists pairs_zman_idx on pairs (zman_id, sort_order);

create table if not exists pair_members (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pair_id    uuid not null references pairs on delete cascade,
  person_id  uuid not null references people on delete cascade,
  unique (pair_id, person_id)
);

create index if not exists pair_members_person_idx on pair_members (person_id);

-- Attendance -----------------------------------------------------------
-- Rows record presence only. There is no "absent" row: absence is a held
-- session with no row for that person.

create table if not exists night_attendance (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date       date not null,
  person_id  uuid not null references people on delete cascade,
  unique (date, person_id)
);

create index if not exists night_attendance_date_idx on night_attendance (date);
create index if not exists night_attendance_person_idx on night_attendance (person_id);

create table if not exists daf_days_off (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date       date not null unique,
  reason     text
);

create table if not exists daf_attendance (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date       date not null,
  person_id  uuid not null references people on delete cascade,
  unique (date, person_id)
);

create index if not exists daf_attendance_date_idx on daf_attendance (date);
create index if not exists daf_attendance_person_idx on daf_attendance (person_id);

-- Correspondence -------------------------------------------------------

create table if not exists correspondence (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  person_id      uuid not null references people on delete cascade,
  date           date not null default current_date,
  channel        text not null check (channel in ('call', 'text', 'whatsapp', 'email', 'in_person')),
  note           text,
  follow_up_date date
);

create index if not exists correspondence_person_date_idx on correspondence (person_id, date desc);

-- Payments -------------------------------------------------------------
-- Periods are added by hand and are usually a Jewish month. `start_date` is
-- any civil date inside that month: it orders the list and suggests the name.
-- Money is a whole number of cents, never a float.

create table if not exists payment_periods (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  start_date date not null,
  note       text
);

create index if not exists payment_periods_start_idx on payment_periods (start_date desc);

create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  period_id    uuid not null references payment_periods on delete cascade,
  person_id    uuid not null references people on delete cascade,
  amount_cents int not null check (amount_cents >= 0),
  date_paid    date not null default current_date,
  method       text not null check (method in ('cash', 'check', 'transfer', 'other')),
  note         text
);

-- Deliberately not unique on (period_id, person_id): a month can be settled
-- in two instalments, or topped up later.
create index if not exists payments_period_idx on payments (period_id);
create index if not exists payments_person_idx on payments (person_id, date_paid desc);

-- Settings -------------------------------------------------------------
-- Exactly one row, id = 1.

create table if not exists settings (
  id                      int primary key default 1 check (id = 1),
  created_at              timestamptz not null default now(),
  night_absence_threshold int not null default 3,
  daf_absence_threshold   int not null default 3
);

insert into settings (id) values (1) on conflict (id) do nothing;

-- Row level security ---------------------------------------------------
-- Sign-ups are disabled and there is exactly one user, so any signed-in
-- request is that user. Nothing is granted to `anon`.

alter table people           enable row level security;
alter table zmanim           enable row level security;
alter table zman_days_off    enable row level security;
alter table pairs            enable row level security;
alter table pair_members     enable row level security;
alter table night_attendance enable row level security;
alter table daf_days_off     enable row level security;
alter table daf_attendance   enable row level security;
alter table correspondence   enable row level security;
alter table payment_periods  enable row level security;
alter table payments         enable row level security;
alter table settings         enable row level security;

create policy "authenticated full access" on people           for all to authenticated using (true) with check (true);
create policy "authenticated full access" on zmanim           for all to authenticated using (true) with check (true);
create policy "authenticated full access" on zman_days_off    for all to authenticated using (true) with check (true);
create policy "authenticated full access" on pairs            for all to authenticated using (true) with check (true);
create policy "authenticated full access" on pair_members     for all to authenticated using (true) with check (true);
create policy "authenticated full access" on night_attendance for all to authenticated using (true) with check (true);
create policy "authenticated full access" on daf_days_off     for all to authenticated using (true) with check (true);
create policy "authenticated full access" on daf_attendance   for all to authenticated using (true) with check (true);
create policy "authenticated full access" on correspondence   for all to authenticated using (true) with check (true);
create policy "authenticated full access" on payment_periods  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on payments         for all to authenticated using (true) with check (true);
create policy "authenticated full access" on settings         for all to authenticated using (true) with check (true);
