import Link from 'next/link';

import type { Role } from '@/lib/types';

/**
 * The shared furniture: headers, grouped lists, buttons, banners.
 * Flat lists with hairline dividers, no card-inside-card, no shadows.
 */

export function Screen({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[480px] pb-tabbar">{children}</div>;
}

export function ScreenHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** A way back up, on the left, iOS style. */
  back?: { href: string; label: string };
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/95 pt-safe backdrop-blur">
      <div className="mx-auto flex min-h-[3.25rem] w-full max-w-[480px] items-center gap-3 px-4 py-2">
        {back ? (
          <Link
            href={back.href}
            className="-ml-2 flex min-h-[2.75rem] shrink-0 items-center gap-0.5 pr-1 pl-2 text-[17px] text-accent active:opacity-60"
          >
            <span aria-hidden className="text-[20px] leading-none">
              &lsaquo;
            </span>
            <span className="max-w-[7rem] truncate">{back.label}</span>
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold">{title}</h1>
          {subtitle ? (
            <p className="truncate text-[13px] text-ink-secondary">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

/** A grouped list, iOS style: one rounded surface, hairlines between rows. */
export function Group({
  title,
  footer,
  children,
  className = '',
}: {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-4 ${className}`}>
      {title ? (
        <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">{title}</h2>
      ) : null}
      <div className="divide-hairline overflow-hidden rounded-xl bg-surface">{children}</div>
      {footer ? <p className="px-1 pt-2 text-[13px] text-ink-secondary">{footer}</p> : null}
    </section>
  );
}

export function Row({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5 ${className}`}>
      {children}
    </div>
  );
}

export function LinkRow({
  href,
  children,
  detail,
}: {
  href: string;
  children: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5 active:bg-surface-pressed"
    >
      <div className="min-w-0 flex-1">{children}</div>
      {detail ? <span className="text-[15px] text-ink-secondary">{detail}</span> : null}
      <Chevron />
    </Link>
  );
}

export function Chevron() {
  return (
    <span aria-hidden className="text-[17px] leading-none text-ink-tertiary">
      &rsaquo;
    </span>
  );
}

export function Banner({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-4 mt-3 rounded-xl bg-surface px-4 py-3">
      <p className="text-[15px] text-ink-secondary">{children}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Empty({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[15px] text-ink-secondary">{children}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

type ButtonVariant = 'plain' | 'filled' | 'danger';

const buttonClasses: Record<ButtonVariant, string> = {
  plain: 'text-accent active:opacity-60',
  filled: 'bg-accent text-on-accent active:bg-accent-pressed',
  danger: 'text-danger active:opacity-60',
};

export function Button({
  variant = 'plain',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-[2.75rem] items-center justify-center rounded-xl px-4 text-[17px] disabled:opacity-40 ${buttonClasses[variant]} ${className}`}
    />
  );
}

export function ButtonLink({
  href,
  variant = 'plain',
  className = '',
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[2.75rem] items-center justify-center rounded-xl px-4 text-[17px] ${buttonClasses[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

/** The small R / W marker next to a name. */
export function RoleMark({ role }: { role: Role }) {
  return (
    <span
      className="shrink-0 text-[13px] text-ink-tertiary"
      title={role === 'rabbi' ? 'Rabbi' : 'Working'}
    >
      {role === 'rabbi' ? 'R' : 'W'}
    </span>
  );
}

export function Chip({
  children,
  tone = 'plain',
}: {
  children: React.ReactNode;
  tone?: 'plain' | 'accent';
}) {
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 text-[12px] ${
        tone === 'accent' ? 'bg-accent text-on-accent' : 'bg-surface-pressed text-ink-secondary'
      }`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block px-4 py-2.5">
      <span className="mb-1 block text-[13px] text-ink-secondary">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[13px] text-ink-tertiary">{hint}</span> : null}
    </label>
  );
}

export const inputClasses =
  'w-full rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-[16px] text-ink placeholder:text-ink-tertiary';
