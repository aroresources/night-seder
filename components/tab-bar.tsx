'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Tonight' },
  { href: '/daf', label: 'Daf' },
  { href: '/contact', label: 'Contact' },
  { href: '/reports', label: 'Reports' },
  { href: '/more', label: 'More' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas/95 pb-safe backdrop-blur">
      <ul className="mx-auto flex w-full max-w-[480px]">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-[3.25rem] items-center justify-center text-[13px] ${
                  active ? 'font-semibold text-accent' : 'text-ink-secondary'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
