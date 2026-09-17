'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button, inputClasses } from './ui';
import { useToast } from './toast';

/**
 * "Make tonight a day off". Asks for a reason first — an unexplained gap in
 * the schedule is the thing you can't reconstruct three months later.
 */
export function DayOffButton({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="px-0">
        {label}
      </Button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            await onConfirm(reason);
            setOpen(false);
            setReason('');
            router.refresh();
          } catch {
            toast("Couldn't save the day off.");
          }
        });
      }}
      className="flex flex-col gap-2"
    >
      <input
        autoFocus
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason, for example Sukkos"
        className={inputClasses}
      />
      <div className="flex gap-2">
        <Button type="submit" variant="filled" disabled={pending}>
          {pending ? 'Saving' : 'Add day off'}
        </Button>
        <Button type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
