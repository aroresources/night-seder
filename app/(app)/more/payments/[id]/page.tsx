import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deletePaymentPeriod, updatePaymentPeriod } from '@/app/actions/payments';
import { PaymentBoard, type PaymentPersonRow } from '@/components/payment-board';
import { Button, Group, ScreenHeader, inputClasses } from '@/components/ui';
import { formatShortDate } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { getPaymentPeriod, getPayments, getPeople } from '@/lib/queries';

export default async function PaymentPeriodPage(props: PageProps<'/more/payments/[id]'>) {
  const { id } = await props.params;

  const [period, payments, people] = await Promise.all([
    getPaymentPeriod(id),
    getPayments(id),
    getPeople(),
  ]);
  if (!period) notFound();

  // Anyone who gets paid, plus anyone already paid in this period even if the
  // checkbox has since come off — the money still happened.
  const paidIds = new Set(payments.map((payment) => payment.person_id));
  const rows: PaymentPersonRow[] = people
    .filter((person) => person.gets_paid || paidIds.has(person.id))
    .map((person) => {
      const theirs = payments
        .filter((payment) => payment.person_id === person.id)
        .sort((a, b) => (a.date_paid < b.date_paid ? 1 : a.date_paid > b.date_paid ? -1 : 0));
      return {
        id: person.id,
        name: person.name,
        role: person.role,
        expectedCents: person.monthly_amount_cents,
        paidCents: theirs.reduce((sum, payment) => sum + payment.amount_cents, 0),
        payments: theirs,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPaid = rows.reduce((sum, row) => sum + row.paidCents, 0);
  const totalExpected = rows.reduce((sum, row) => sum + (row.expectedCents ?? 0), 0);

  return (
    <>
      <ScreenHeader
        title={period.name}
        subtitle={`${formatCents(totalPaid)} of ${formatCents(totalExpected)} · ${formatShortDate(period.start_date)}`}
        action={
          <Link href="/more/payments" className="text-[17px] text-accent">
            Payments
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <PaymentBoard periodId={id} rows={rows} />

        <section className="px-4">
          <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">
            This period
          </h2>
          <form
            action={updatePaymentPeriod.bind(null, id)}
            className="flex flex-col gap-3 rounded-xl bg-surface p-4"
          >
            <label className="block">
              <span className="mb-1 block text-[13px] text-ink-secondary">Name</span>
              <input name="name" defaultValue={period.name} required className={inputClasses} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] text-ink-secondary">A date in the month</span>
              <input
                type="date"
                name="start_date"
                defaultValue={period.start_date}
                required
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] text-ink-secondary">Note (optional)</span>
              <input name="note" defaultValue={period.note ?? ''} className={inputClasses} />
            </label>
            <div>
              <Button type="submit" variant="filled">
                Save
              </Button>
            </div>
          </form>
        </section>

        <Group
          title="Danger"
          footer={
            payments.length > 0
              ? `Deleting this period also deletes its ${payments.length} ${payments.length === 1 ? 'payment' : 'payments'}.`
              : undefined
          }
        >
          <form action={deletePaymentPeriod.bind(null, id)}>
            <button
              type="submit"
              className="flex min-h-[2.75rem] w-full items-center px-4 py-2.5 text-left text-[17px] text-danger active:bg-surface-pressed"
            >
              Delete this period
            </button>
          </form>
        </Group>
      </div>
    </>
  );
}
