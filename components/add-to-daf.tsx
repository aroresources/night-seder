'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, inputClasses } from './ui';
import { useToast } from './toast';

export interface Candidate {
  id: string;
  name: string;
}

/**
 * "Add someone to the Daf": either flag a person who is already in the app,
 * or create one on the spot, without leaving the morning's list.
 */
export function AddToDaf({
  label,
  candidates,
  onAddExisting,
  onCreate,
}: {
  label: string;
  candidates: Candidate[];
  onAddExisting: (personId: string) => Promise<void>;
  onCreate: (form: FormData) => Promise<void>;
}) {
  const [mode, setMode] = useState<'closed' | 'existing' | 'new'>('closed');
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('working');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run(work: () => Promise<void>) {
    startTransition(async () => {
      try {
        await work();
        setMode('closed');
        setSelected('');
        setName('');
        router.refresh();
      } catch {
        toast("Couldn't save. Check your connection.");
      }
    });
  }

  if (mode === 'closed') {
    return (
      <div className="px-4 pt-4">
        <Button className="px-0" onClick={() => setMode(candidates.length > 0 ? 'existing' : 'new')}>
          {label}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 rounded-xl bg-surface p-4">
      <div className="mb-3 flex gap-4 text-[15px]">
        <button
          type="button"
          onClick={() => setMode('existing')}
          className={mode === 'existing' ? 'font-semibold text-accent' : 'text-ink-secondary'}
        >
          Someone already here
        </button>
        <button
          type="button"
          onClick={() => setMode('new')}
          className={mode === 'new' ? 'font-semibold text-accent' : 'text-ink-secondary'}
        >
          Someone new
        </button>
      </div>

      {mode === 'existing' ? (
        <div className="flex flex-col gap-3">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={inputClasses}
            aria-label="Person"
          >
            <option value="">Pick a person</option>
            {candidates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              variant="filled"
              disabled={!selected || pending}
              onClick={() => run(() => onAddExisting(selected))}
            >
              {label.replace(/^Add someone to /, 'Add to ')}
            </Button>
            <Button onClick={() => setMode('closed')}>Cancel</Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData();
            form.set('name', name);
            form.set('role', role);
            run(() => onCreate(form));
          }}
          className="flex flex-col gap-3"
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            required
            className={inputClasses}
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={inputClasses}
            aria-label="Role"
          >
            <option value="working">Working</option>
            <option value="rabbi">Rabbi</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="filled" disabled={pending}>
              Add
            </Button>
            <Button type="button" onClick={() => setMode('closed')}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
