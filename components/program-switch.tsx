'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { MORNING_PROGRAMS, type MorningProgram } from '@/lib/types';

/** Daf or Shachris, at the top of the Morning screen. Keeps the date you're on. */
export function ProgramSwitch({ current }: { current: MorningProgram }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(program: MorningProgram) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('event', program);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex gap-2 px-4 pt-3">
      {MORNING_PROGRAMS.map((program) => (
        <button
          key={program.value}
          type="button"
          onClick={() => go(program.value)}
          aria-pressed={current === program.value}
          className={`min-h-[2.25rem] flex-1 rounded-full px-3 text-[15px] ${
            current === program.value
              ? 'bg-accent text-on-accent'
              : 'bg-surface text-ink-secondary'
          }`}
        >
          {program.label}
        </button>
      ))}
    </div>
  );
}
