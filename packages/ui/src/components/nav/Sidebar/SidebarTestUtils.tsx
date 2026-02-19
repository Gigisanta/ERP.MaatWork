import React from 'react';
import type { SidebarSection } from '../Sidebar.js';

export const mockSections: SidebarSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'Home', badge: 3 },
      { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Profile', href: '/profile', icon: 'User' },
      { label: 'Preferences', href: '/preferences' },
    ],
  },
];

export const MockLink = ({
  href,
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a href={href} className={className} {...props}>
    {children}
  </a>
);

export const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();
