'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/events', label: '행사', icon: '📅' },
  { href: '/my-events', label: '내 일정', icon: '✓' },
  { href: '/residents', label: '이웃', icon: '👥' },
  { href: '/me', label: '내 정보', icon: '⚙️' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line z-40">
      <div className="max-w-md mx-auto grid grid-cols-4 safe-bottom">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center min-h-touch-lg py-2 transition-colors ${
                active ? 'text-primary' : 'text-muted'
              }`}
            >
              <span className="text-2xl mb-0.5" aria-hidden>{tab.icon}</span>
              <span className={`text-sm ${active ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
