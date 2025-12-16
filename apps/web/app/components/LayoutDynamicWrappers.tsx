'use client';

import dynamic from 'next/dynamic';

// AI_DECISION: Wrappers for dynamic imports with ssr: false
// Justificación: Next.js disallows ssr: false in Server Components (RootLayout).
// We must define these dynamic imports within a Client Component boundary.

export const DynamicDebugConsole = dynamic(() => import('./DebugConsole'), {
  ssr: false,
});

export const DynamicGlobalKeyboardShortcuts = dynamic(() => import('./GlobalKeyboardShortcuts'), {
  ssr: false,
});
