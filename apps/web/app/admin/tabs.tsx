"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Tabs() {
  const pathname = usePathname();
  const tabs = [
    { href: '/admin/users', label: 'Usuarios y cuentas' },
    { href: '/admin/aum', label: 'AUM y Brokers' }
  ];
  return (
    <div className="border-b border-gray-200 mb-4">
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {tabs.map((t) => {
          const active = pathname?.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                active
                  ? 'border-indigo-500 text-indigo-600 whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium'
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}






