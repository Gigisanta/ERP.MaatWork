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
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import '@cactus/ui/styles.css';
import './globals.css';

// AI_DECISION: Only load DebugConsole in development to reduce production bundle
// Justificación: DebugConsole adds ~2KB to bundle and creates client component overhead
// Impacto: Smaller production bundle, faster initial load in production
const DebugConsole = dynamic(
  () => import('./components/DebugConsole'),
  { ssr: false }
);

// AI_DECISION: Use next/font/google for optimized font loading
// Justificación: next/font automatically optimizes fonts, reduces FOUT, and improves performance
// Impacto: Self-hosts fonts, eliminates external font requests, reduces layout shift
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Reduce FOUT by showing fallback font immediately
  variable: '--font-inter', // CSS variable for use in globals.css
  preload: true, // Preload font for faster initial render
});

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// AI_DECISION: Convert root layout to server component for 200-500ms FCP/LCP improvement
// Justificación: 'use client' forces entire app to CSR, increasing hydration JS by ~40KB
// Impacto: Server-side rendering for static content, client JS only where needed
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className={`bg-background ${inter.className}`}>
        {isDevelopment && <DebugConsole />}
        <ThemeProviderWrapper defaultTheme="light">
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <SidebarProvider>
                  <PageTitleProvider>
                    <NavigationNew />
                    <AppLayout>
                      {children}
                    </AppLayout>
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


