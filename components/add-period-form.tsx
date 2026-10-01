'use client';

import { useState } from 'react';

import { createPaymentPeriod } from '@/app/actions/payments';
import { hebrewMonthYear, today } from '@/lib/dates';

import { Button, inputClasses } from './ui';

/**
 * Adding a period. Pick any date inside the month and the name fills itself in
 * from the Hebrew calendar — "Tishri 5787" — which is what you'd have typed.
 * Still editable, because a period isn't always a clean month.
 */
export function AddPeriodForm() {
  const [startDate, setStartDate] = useState(today());
  const [name, setName] = useState(hebrewMonthYear(today()));
  const [touchedName, setTouchedName] = useState(false);

  function changeDate(value: string) {
    setStartDate(value);
    if (!touchedName && value) setName(hebrewMonthYear(value));
  }

  return (
    <form action={createPaymentPeriod} className="px-4 pt-4">
      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-secondary">A date in the month</span>
          <input
            type="date"
            name="start_date"
            value={startDate}
            onChange={(event) => changeDate(event.target.value)}
            required
            className={inputClasses}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-secondary">Name</span>
          <input
            name="name"
            value={name}
            onChange={(event) => {
              setTouchedName(true);
              setName(event.target.value);
            }}
            required
            className={inputClasses}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-secondary">Note (optional)</span>
          <input name="note" className={inputClasses} />
        </label>

        <div>
          <Button type="submit" variant="filled">
            Add period
          </Button>
        </div>
      </div>
    </form>
  );
}
