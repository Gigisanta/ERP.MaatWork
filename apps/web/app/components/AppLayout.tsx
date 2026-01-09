'use client';
import { useSidebar } from './SidebarContext';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Routes that should render without the app layout wrapper (full-screen pages).
 * These pages handle their own layout and don't need sidebar margins/padding.
 */
const FULL_SCREEN_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * App Layout component with smooth page transitions.
 * Handles sidebar state and provides animated content container.
 *
 * AI_DECISION: Auth pages render without wrapper for full-screen backgrounds
 * Justificación: Login/register pages need full viewport control without sidebar interference
 * Impacto: Auth pages display correctly, other pages maintain proper sidebar layout
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const previousPathname = useRef(pathname);

  // Check if current route should use full-screen layout (no wrapper)
  const isFullScreenRoute =
    pathname === '/' || FULL_SCREEN_ROUTES.some((route) => pathname.startsWith(route));

  // Handle page transitions
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      // Start exit animation
      setIsTransitioning(true);

      // After brief fade out, update content and start enter animation
      const timeout = setTimeout(() => {
        setDisplayedChildren(children);
        setIsTransitioning(false);
        previousPathname.current = pathname;
      }, 150);

      return () => clearTimeout(timeout);
    } else {
      // No transition needed, just update children
      setDisplayedChildren(children);
    }
  }, [pathname, children]);

  // Full-screen routes render without any wrapper
  if (isFullScreenRoute) {
    return <>{children}</>;
  }

  return (
    <main
      className={[
        // Base styles - transparent to show body gradient
        'min-h-screen',
        // Smooth transition for sidebar changes
        'transition-all duration-300 ease-in-out',
        // Responsive margin for sidebar
        // Mobile: no margin (sidebar is drawer)
        // Desktop: margin based on collapsed state
        collapsed ? 'lg:ml-16' : 'lg:ml-52',
        // Responsive padding
        // Mobile: small padding with safe areas
        // Tablet/Desktop: more generous padding
        'px-3 xs:px-4 sm:px-6 lg:px-8',
        // Top padding - more on desktop for visual balance
        'pt-3 sm:pt-4 lg:pt-6',
        // Bottom padding with safe area for mobile
        // Mobile: extra padding for fixed bottom navigation bar (~80px)
        // Tablet/Desktop: normal padding
        'pb-24 sm:pb-28 lg:pb-8',
        'safe-area-bottom',
      ].join(' ')}
    >
      <div
        className={[
          'transition-opacity duration-150 ease-out',
          isTransitioning ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100',
        ].join(' ')}
      >
        <div className="animate-fade-in max-w-[1600px] mx-auto">{displayedChildren}</div>
      </div>
    </main>
  );
}
