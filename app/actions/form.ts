import { isCalendarDate, type CalendarDate } from '@/lib/dates';

/** Small readers for FormData, so the actions stay about intent. */

export function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

export function optionalText(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value === '' ? null : value;
}

export function checkbox(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === 'on' || value === 'true';
}

export function number(form: FormData, key: string, fallback: number): number {
  const value = Number(text(form, key));
  return Number.isFinite(value) ? value : fallback;
}

export function date(form: FormData, key: string): CalendarDate {
  const value = text(form, key);
  if (!isCalendarDate(value)) throw new Error(`${key} must be a calendar date`);
  return value;
}

export function optionalDate(form: FormData, key: string): CalendarDate | null {
  const value = text(form, key);
  if (value === '') return null;
  if (!isCalendarDate(value)) throw new Error(`${key} must be a calendar date`);
  return value;
}
