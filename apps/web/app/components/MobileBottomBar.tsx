'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Layers, Briefcase, Menu } from 'lucide-react';
import { cn } from '@maatwork/ui';

interface MobileBottomBarProps {
  onMenuClick: () => void;
}

/**
 * MobileBottomBar - Fixed bottom navigation for mobile devices.
 * AI_DECISION: Using a bottom navigation bar for mobile is a UX best practice
 * Justificación: Improves thumb reachability and follows iOS/Android patterns
 * Impacto: Better mobile UX, faster navigation, modern feel
 */
export function MobileBottomBar({ onMenuClick }: MobileBottomBarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/home', label: 'Inicio', icon: Home },
    { href: '/contacts', label: 'Contactos', icon: Users },
    { href: '/pipeline', label: 'Pipeline', icon: Layers },
    { href: '/portfolios', label: 'Carteras', icon: Briefcase },
  ];

  // Don't render on public routes
  const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/register';
  if (isPublicRoute) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom"
      aria-label="Navegación móvil"
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-[#0c0a09]/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]" />

      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center justify-center gap-0.5 p-2 min-w-[60px] rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary scale-105'
                  : 'text-muted-foreground hover:text-foreground active:scale-95',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={[
                    'w-6 h-6 transition-transform duration-300',
                    isActive ? 'stroke-[2.5px] -translate-y-1' : 'stroke-[1.5px]',
                  ].join(' ')}
                />
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_2px_rgba(var(--primary-rgb),0.6)] animate-pulse" />
                )}
              </div>
              <span
                className={[
                  'text-[10px] font-medium transition-all duration-300',
                  isActive ? 'font-semibold text-primary' : 'text-muted-foreground',
                ].join(' ')}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Menu button to open drawer */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 p-2 min-w-[60px] rounded-xl text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6 stroke-[1.5px]" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </div>
    </nav>
  );
}

export default MobileBottomBar;
