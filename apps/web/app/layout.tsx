import { AuthProvider } from './auth/AuthContext';
import ThemeProviderWrapper from './components/ThemeProviderWrapper';
import { ErrorBoundary } from '../components/ErrorBoundary';
import NavigationNew from './components/NavigationNew';
import AppLayout from './components/AppLayout';
import { SidebarProvider } from './components/SidebarContext';
import { PageTitleProvider } from './components/PageTitleContext';
import { ConditionalAnalytics } from './components/ConditionalAnalytics';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import { ToastProvider } from '../lib/hooks/useToast';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import dynamic from 'next/dynamic';
import { getCurrentUser } from '@/lib/api-server';
// Styles from @cactus/ui - copied to local styles folder during build
import '../styles/ui-styles.css';
import './globals.css';

// AI_DECISION: Only load DebugConsole in development to reduce production bundle
// Justificación: DebugConsole adds ~2KB to bundle and creates client component overhead
// Impacto: Smaller production bundle, faster initial load in production
const DebugConsole = dynamic(() => import('./components/DebugConsole'), { ssr: false });

// AI_DECISION: Keyboard shortcuts available globally with Cmd/Ctrl + ?
// Justificación: Mejora la productividad de usuarios avanzados
// Impacto: Modal de atajos accesible desde cualquier página
const GlobalKeyboardShortcuts = dynamic(() => import('./components/GlobalKeyboardShortcuts'), {
  ssr: false,
});

// AI_DECISION: Typography Refresh - Modern Geometric Sans
// Justificación: 'Outfit' provides a friendly, modern, geometric look for headings.
// 'Plus Jakarta Sans' offers excellent readability with a modern geometric touch for body text.
// Impacto: "Fresh" and modern aesthetic requested by user.

// Outfit - Display font for headings (Modern, Geometric, Friendly)
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
  preload: true,
});

// Plus Jakarta Sans - Body font (High readability, Modern)
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
  preload: true,
});

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

async function getInitialUser() {
  try {
    const response = await getCurrentUser();
    if (response.success && response.data) {
      return response.data;
    }
  } catch {
    // swallow errors, render unauthenticated shell
  }
  return null;
}

// AI_DECISION: Convert root layout to server component for 200-500ms FCP/LCP improvement
// Justificación: 'use client' forces entire app to CSR, increasing hydration JS by ~40KB
// Impacto: Server-side rendering for static content, client JS only where needed
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getInitialUser();

  return (
    <html lang="es" className={`${outfit.variable} ${plusJakarta.variable}`}>
      <body className={plusJakarta.className}>
        {isDevelopment && <DebugConsole />}
        <ThemeProviderWrapper defaultTheme="light">
          <ErrorBoundary>
            <AuthProvider initialUser={initialUser}>
              <ToastProvider>
                <SidebarProvider>
                  <PageTitleProvider>
                    <NavigationNew />
                    <AppLayout>{children}</AppLayout>
                    <GlobalKeyboardShortcuts />
                  </PageTitleProvider>
                </SidebarProvider>
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProviderWrapper>
        <ConditionalAnalytics />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
