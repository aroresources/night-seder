import 'server-only';

import { today } from '@/lib/dates';
import type { CalendarDate } from '@/lib/dates';
import { supabaseServer } from '@/lib/supabase/server';
import type {
  Attendance,
  Correspondence,
  DafDayOff,
  Pair,
  PairMember,
  Payment,
  PaymentPeriod,
  Person,
  Settings,
  Zman,
  ZmanDayOff,
} from '@/lib/types';

/** Any Supabase error here is a bug or an outage; neither is worth papering over. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('No data returned');
  return result.data;
}

/**
 * Reads every row of a table, a page at a time.
 *
 * PostgREST caps how many rows one request may return, so a single select can
 * silently come back short. Paging advances by the number of rows actually
 * received, which is correct whatever the cap turns out to be.
 */
async function page<T>(
  fetchRange: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const CHUNK = 1000;
  const MAX = 200_000;
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await fetchRange(from, from + CHUNK - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length === 0 || all.length >= MAX) break;
    from += rows.length;
    if (rows.length < CHUNK) break;
  }

  return all;
}

export async function getSettings(): Promise<Settings> {
  const supabase = await supabaseServer();
  return unwrap(await supabase.from('settings').select('*').eq('id', 1).single());
}

export async function getPeople(): Promise<Person[]> {
  const supabase = await supabaseServer();
  return unwrap(await supabase.from('people').select('*').order('name'));
}

export async function getPerson(id: string): Promise<Person | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('people').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getZmanim(): Promise<Zman[]> {
  const supabase = await supabaseServer();
  return unwrap(await supabase.from('zmanim').select('*').order('start_date', { ascending: false }));
}

export async function getZman(id: string): Promise<Zman | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('zmanim').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** The zman whose range contains the date. If several overlap, the latest wins. */
export async function getZmanForDate(date: CalendarDate): Promise<Zman | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('zmanim')
    .select('*')
    .lte('start_date', date)
    .gte('end_date', date)
    .order('start_date', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

/** The zman covering today, else the most recent one that has already started. */
export async function getCurrentZman(now: CalendarDate = today()): Promise<Zman | null> {
  const covering = await getZmanForDate(now);
  if (covering) return covering;

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('zmanim')
    .select('*')
    .lte('start_date', now)
    .order('start_date', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function getZmanDaysOff(zmanId: string): Promise<ZmanDayOff[]> {
  const supabase = await supabaseServer();
  return unwrap(
    await supabase.from('zman_days_off').select('*').eq('zman_id', zmanId).order('date'),
  );
}

export async function getDafDaysOff(): Promise<DafDayOff[]> {
  const supabase = await supabaseServer();
  return unwrap(await supabase.from('daf_days_off').select('*').order('date', { ascending: false }));
}

export interface PairWithMembers extends Pair {
  members: PairMember[];
}

export async function getPairs(zmanId: string): Promise<PairWithMembers[]> {
  const supabase = await supabaseServer();
  const pairs = unwrap(
    await supabase.from('pairs').select('*').eq('zman_id', zmanId).order('sort_order'),
  );
  if (pairs.length === 0) return [];

  const members = unwrap(
    await supabase
      .from('pair_members')
      .select('*')
      .in(
        'pair_id',
        pairs.map((p) => p.id),
      ),
  );

  return pairs.map((pair) => ({
    ...pair,
    members: members.filter((m) => m.pair_id === pair.id),
  }));
}

/** Attendance rows for one date, for one program. */
export async function getAttendanceOn(
  table: 'night_attendance' | 'daf_attendance',
  date: CalendarDate,
): Promise<Attendance[]> {
  const supabase = await supabaseServer();
  return unwrap(await supabase.from(table).select('*').eq('date', date));
}

/** Every attendance row for a program, optionally bounded by date. */
export async function getAllAttendance(
  table: 'night_attendance' | 'daf_attendance',
  range?: { start: CalendarDate; end: CalendarDate },
): Promise<Attendance[]> {
  const supabase = await supabaseServer();
  return page<Attendance>((from, to) => {
    let query = supabase.from(table).select('*');
    if (range) query = query.gte('date', range.start).lte('date', range.end);
    return query.order('date').range(from, to);
  });
}

// Payments ---------------------------------------------------------------

export async function getPaymentPeriods(): Promise<PaymentPeriod[]> {
  const supabase = await supabaseServer();
  return unwrap(
    await supabase.from('payment_periods').select('*').order('start_date', { ascending: false }),
  );
}

export async function getPaymentPeriod(id: string): Promise<PaymentPeriod | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('payment_periods')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Every payment, or just one period's. Newest first. */
export async function getPayments(periodId?: string): Promise<Payment[]> {
  const supabase = await supabaseServer();
  return page<Payment>((from, to) => {
    let query = supabase.from('payments').select('*');
    if (periodId) query = query.eq('period_id', periodId);
    return query.order('date_paid', { ascending: false }).range(from, to);
  });
}

export async function getCorrespondence(personId?: string): Promise<Correspondence[]> {
  const supabase = await supabaseServer();
  return page<Correspondence>((from, to) => {
    let query = supabase.from('correspondence').select('*');
    if (personId) query = query.eq('person_id', personId);
    return query.order('date', { ascending: false }).order('created_at', { ascending: false }).range(from, to);
  });
}
