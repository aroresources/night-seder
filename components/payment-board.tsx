'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deletePayment, recordPayment, updatePayment } from '@/app/actions/payments';
import { formatShortDate, today } from '@/lib/dates';
import { centsToInput, formatCents } from '@/lib/money';
import {
  PAYMENT_METHODS,
  paymentMethodLabel,
  type Payment,
  type PaymentMethod,
  type Role,
} from '@/lib/types';

import { Button, Chip, inputClasses } from './ui';
import { useToast } from './toast';

export interface PaymentPersonRow {
  id: string;
  name: string;
  role: Role;
  /** His usual monthly amount, or null if he hasn't got one set. */
  expectedCents: number | null;
  paidCents: number;
  payments: Payment[];
}

/**
 * One period's ledger: every paid man, what he usually gets, what he actually
 * got, and the payments themselves. A row with nothing against it is simply
 * unpaid — there is no "unpaid" record to create.
 */
export function PaymentBoard({
  periodId,
  rows,
}: {
  periodId: string;
  rows: PaymentPersonRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-[15px] text-ink-secondary">
        Nobody is marked as getting paid yet. Tick &ldquo;Gets paid&rdquo; on a person under
        People.
      </p>
    );
  }

  const unpaid = rows.filter((row) => row.payments.length === 0);
  const paid = rows.filter((row) => row.payments.length > 0);

  return (
    <>
      <Section title={`Not paid yet (${unpaid.length})`} rows={unpaid} periodId={periodId} />
      <Section title={`Paid (${paid.length})`} rows={paid} periodId={periodId} />
    </>
  );
}

function Section({
  title,
  rows,
  periodId,
}: {
  title: string;
  rows: PaymentPersonRow[];
  periodId: string;
}) {
  return (
    <section className="px-4">
      <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">{title}</h2>
      <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-[15px] text-ink-secondary">Nobody.</p>
        ) : (
          rows.map((row) => <PersonRow key={row.id} row={row} periodId={periodId} />)
        )}
      </div>
    </section>
  );
}

function PersonRow({ row, periodId }: { row: PaymentPersonRow; periodId: string }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const short = row.expectedCents !== null && row.paidCents !== row.expectedCents;

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deletePayment(id);
        router.refresh();
      } catch {
        toast("Couldn't delete that payment.");
      }
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[17px]">{row.name}</span>
            <span className="shrink-0 text-[13px] text-ink-tertiary">
              {row.role === 'rabbi' ? 'R' : 'W'}
            </span>
          </div>
          <p className="text-[13px] text-ink-secondary">
            {row.expectedCents !== null
              ? `Usually ${formatCents(row.expectedCents)}`
              : 'No usual amount set'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[17px] tabular-nums">{formatCents(row.paidCents)}</p>
          {row.payments.length > 0 && short ? (
            <Chip>
              {row.paidCents > (row.expectedCents ?? 0) ? 'over' : 'short'}
            </Chip>
          ) : null}
        </div>
      </div>

      {row.payments.map((payment) =>
        editing === payment.id ? (
          <PaymentForm
            key={payment.id}
            payment={payment}
            onSubmit={(form) => updatePayment(payment.id, form)}
            onDone={() => setEditing(null)}
          />
        ) : (
          <div key={payment.id} className="mt-2 flex items-baseline gap-2 border-t border-hairline pt-2">
            <span className="text-[15px] tabular-nums">{formatCents(payment.amount_cents)}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-secondary">
              {formatShortDate(payment.date_paid)} · {paymentMethodLabel(payment.method)}
              {payment.note ? ` · ${payment.note}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setEditing(payment.id)}
              className="shrink-0 text-[13px] text-accent"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => remove(payment.id)}
              disabled={pending}
              className="shrink-0 text-[13px] text-danger"
            >
              Delete
            </button>
          </div>
        ),
      )}

      {adding ? (
        <PaymentForm
          defaultAmountCents={row.expectedCents}
          onSubmit={(form) => recordPayment(periodId, row.id, form)}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 min-h-[2.75rem] text-[15px] text-accent"
        >
          {row.payments.length > 0 ? 'Add another payment' : 'Record payment'}
        </button>
      )}
    </div>
  );
}

function PaymentForm({
  payment,
  defaultAmountCents,
  onSubmit,
  onDone,
}: {
  payment?: Payment;
  defaultAmountCents?: number | null;
  onSubmit: (form: FormData) => Promise<void>;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(
    payment
      ? centsToInput(payment.amount_cents)
      : defaultAmountCents != null
        ? centsToInput(defaultAmountCents)
        : '',
  );
  const [datePaid, setDatePaid] = useState(payment?.date_paid ?? today());
  const [method, setMethod] = useState<PaymentMethod>(payment?.method ?? 'check');
  const [note, setNote] = useState(payment?.note ?? '');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData();
        form.set('amount', amount);
        form.set('date_paid', datePaid);
        form.set('method', method);
        form.set('note', note);
        startTransition(async () => {
          try {
            await onSubmit(form);
            router.refresh();
            onDone();
          } catch (error) {
            toast(error instanceof Error ? error.message : "Couldn't save the payment.");
          }
        });
      }}
      className="mt-2 flex flex-col gap-3 border-t border-hairline pt-3"
    >
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[13px] text-ink-secondary">Amount</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="180"
            required
            autoFocus
            className={inputClasses}
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[13px] text-ink-secondary">Date paid</span>
          <input
            type="date"
            value={datePaid}
            onChange={(event) => setDatePaid(event.target.value)}
            className={inputClasses}
          />
        </label>
      </div>

      <div>
        <span className="mb-1 block text-[13px] text-ink-secondary">How</span>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMethod(option.value)}
              aria-pressed={method === option.value}
              className={`min-h-[2.75rem] rounded-xl px-3 text-[15px] ${
                method === option.value
                  ? 'bg-accent text-on-accent'
                  : 'bg-canvas text-ink-secondary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-[13px] text-ink-secondary">Note (optional)</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="For example covers two months"
          className={inputClasses}
        />
      </label>

      <div className="flex gap-2">
        <Button type="submit" variant="filled" disabled={pending}>
          {pending ? 'Saving' : payment ? 'Save changes' : 'Record payment'}
        </Button>
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
