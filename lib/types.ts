/**
 * Row types for the tables in `supabase/001_schema.sql`, plus the `Database`
 * shape that gives every Supabase query its result type.
 *
 * Hand-written rather than generated, so it stays readable and reviewable.
 * If you add a numbered migration, mirror it here.
 */

import type { CalendarDate } from './dates.ts';

export type Role = 'rabbi' | 'working';

export type Channel = 'call' | 'text' | 'whatsapp' | 'email' | 'in_person';

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In person' },
];

export function channelLabel(channel: Channel): string {
  return CHANNELS.find((c) => c.value === channel)?.label ?? channel;
}

export type Person = {
  id: string;
  created_at: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  /**
   * The three parts joined up. The database generates this, so it can never
   * drift from them — never write to it.
   */
  name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  in_night_seder: boolean;
  in_daf: boolean;
  start_date: CalendarDate;
  end_date: CalendarDate | null;
  track_contact: boolean;
  snoozed_until: CalendarDate | null;
  /** Some of the men are paid; this is the checkbox on his page. */
  gets_paid: boolean;
  /** What he usually gets for a month. A single payment can be more or less. */
  monthly_amount_cents: number | null;
};

export type Zman = {
  id: string;
  created_at: string;
  name: string;
  start_date: CalendarDate;
  end_date: CalendarDate;
  off_weekdays: number[];
};

export type ZmanDayOff = {
  id: string;
  created_at: string;
  zman_id: string;
  date: CalendarDate;
  reason: string | null;
};

export type Pair = {
  id: string;
  created_at: string;
  zman_id: string;
  label: string | null;
  sort_order: number;
};

export type PairMember = {
  id: string;
  created_at: string;
  pair_id: string;
  person_id: string;
};

export type Attendance = {
  id: string;
  created_at: string;
  date: CalendarDate;
  person_id: string;
};

export type DafDayOff = {
  id: string;
  created_at: string;
  date: CalendarDate;
  reason: string | null;
};

export type Correspondence = {
  id: string;
  created_at: string;
  person_id: string;
  date: CalendarDate;
  channel: Channel;
  note: string | null;
  follow_up_date: CalendarDate | null;
};

export type PaymentMethod = 'cash' | 'check' | 'transfer' | 'other';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

/** Usually a Jewish month. Added by hand; `start_date` orders and names it. */
export type PaymentPeriod = {
  id: string;
  created_at: string;
  name: string;
  start_date: CalendarDate;
  note: string | null;
};

export type Payment = {
  id: string;
  created_at: string;
  period_id: string;
  person_id: string;
  amount_cents: number;
  date_paid: CalendarDate;
  method: PaymentMethod;
  note: string | null;
};

export type Settings = {
  id: number;
  created_at: string;
  night_absence_threshold: number;
  daf_absence_threshold: number;
};

/**
 * `id` and `created_at` always have defaults, so they are never required on an
 * insert; `Required` names the columns that have no default, and `Generated`
 * names the ones the database computes, which cannot be written at all.
 */
type TableDef<
  Row extends object,
  Required extends keyof Row,
  Generated extends keyof Row = never,
> = {
  Row: Row;
  Insert: Partial<Omit<Row, 'id' | 'created_at' | Generated>> & Pick<Row, Required>;
  Update: Partial<Omit<Row, 'id' | 'created_at' | Generated>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      people: TableDef<Person, 'first_name' | 'role', 'name'>;
      zmanim: TableDef<Zman, 'name' | 'start_date' | 'end_date'>;
      zman_days_off: TableDef<ZmanDayOff, 'zman_id' | 'date'>;
      pairs: TableDef<Pair, 'zman_id'>;
      pair_members: TableDef<PairMember, 'pair_id' | 'person_id'>;
      night_attendance: TableDef<Attendance, 'date' | 'person_id'>;
      daf_attendance: TableDef<Attendance, 'date' | 'person_id'>;
      daf_days_off: TableDef<DafDayOff, 'date'>;
      correspondence: TableDef<Correspondence, 'person_id' | 'channel'>;
      payment_periods: TableDef<PaymentPeriod, 'name' | 'start_date'>;
      payments: TableDef<Payment, 'period_id' | 'person_id' | 'amount_cents' | 'method'>;
      settings: TableDef<Settings, 'id'>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

/** The two attendance tables share a shape; this names which one to write to. */
export type AttendanceTable = 'night_attendance' | 'daf_attendance';
