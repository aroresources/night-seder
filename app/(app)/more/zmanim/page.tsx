import Link from 'next/link';

import { ButtonLink, Empty, ScreenHeader } from '@/components/ui';
import { formatShortDate, today, withinWindow } from '@/lib/dates';
import { getZmanim } from '@/lib/queries';

export default async function ZmanimPage() {
  const zmanim = await getZmanim();
  const now = today();

  return (
    <>
      <ScreenHeader
        title="Zmanim"
        action={
          <Link href="/more/zmanim/new" className="text-[17px] text-accent">
            Add
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        {zmanim.length === 0 ? (
          <Empty
            action={
              <ButtonLink href="/more/zmanim/new" variant="filled">
                Create one
              </ButtonLink>
            }
          >
            No zman yet. Create one for this winter.
          </Empty>
        ) : (
          <section className="px-4 pt-4">
            <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
              {zmanim.map((zman) => {
                const current = withinWindow(now, zman.start_date, zman.end_date);
                return (
                  <Link
                    key={zman.id}
                    href={`/more/zmanim/${zman.id}`}
                    className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5 active:bg-surface-pressed"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[17px] ${current ? 'font-semibold' : ''}`}>
                        {zman.name}
                        {current ? <span className="text-accent"> · now</span> : null}
                      </p>
                      <p className="truncate text-[13px] text-ink-secondary">
                        {formatShortDate(zman.start_date)} – {formatShortDate(zman.end_date)}
                      </p>
                    </div>
                    <span aria-hidden className="text-[17px] leading-none text-ink-tertiary">
                      &rsaquo;
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
