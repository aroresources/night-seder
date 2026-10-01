import Link from 'next/link';

import { AddPeriodForm } from '@/components/add-period-form';
import { Empty, ScreenHeader } from '@/components/ui';
import { formatShortDate } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { getPaymentPeriods, getPayments, getPeople } from '@/lib/queries';

export default async function PaymentsPage() {
  const [periods, payments, people] = await Promise.all([
    getPaymentPeriods(),
    getPayments(),
    getPeople(),
  ]);

  const paidPeople = people.filter((person) => person.gets_paid);
  const expectedPerPeriod = paidPeople.reduce(
    (sum, person) => sum + (person.monthly_amount_cents ?? 0),
    0,
  );

  const totals = new Map<string, { paid: number; count: number }>();
  for (const payment of payments) {
    const current = totals.get(payment.period_id) ?? { paid: 0, count: 0 };
    current.paid += payment.amount_cents;
    current.count += 1;
    totals.set(payment.period_id, current);
  }

  return (
    <>
      <ScreenHeader
        title="Payments"
        subtitle={`${paidPeople.length} ${paidPeople.length === 1 ? 'person gets' : 'people get'} paid`}
        action={
          <Link href="/more" className="text-[17px] text-accent">
            More
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <AddPeriodForm />

        <section className="px-4">
          <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">Periods</h2>
          <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
            {periods.length === 0 ? (
              <p className="px-4 py-3 text-[15px] text-ink-secondary">
                No periods yet. Add this month to start.
              </p>
            ) : (
              periods.map((period) => {
                const total = totals.get(period.id) ?? { paid: 0, count: 0 };
                return (
                  <Link
                    key={period.id}
                    href={`/more/payments/${period.id}`}
                    className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5 active:bg-surface-pressed"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px]">{period.name}</p>
                      <p className="truncate text-[13px] text-ink-secondary">
                        {formatShortDate(period.start_date)}
                        {period.note ? ` · ${period.note}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[15px] tabular-nums">{formatCents(total.paid)}</p>
                      <p className="text-[13px] tabular-nums text-ink-secondary">
                        of {formatCents(expectedPerPeriod)}
                      </p>
                    </div>
                    <span aria-hidden className="text-[17px] leading-none text-ink-tertiary">
                      &rsaquo;
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {paidPeople.length === 0 ? (
          <Empty>
            Nobody is marked as getting paid. Tick &ldquo;Gets paid&rdquo; on a person under
            People, and give him a usual monthly amount.
          </Empty>
        ) : null}
      </div>
    </>
  );
}
