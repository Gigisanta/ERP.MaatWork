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
import { Poppins, Open_Sans } from 'next/font/google';
import dynamic from 'next/dynamic';
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
const GlobalKeyboardShortcuts = dynamic(() => import('./components/GlobalKeyboardShortcuts'), { ssr: false });

// AI_DECISION: Use Poppins for display/headings and Open Sans for body text
// Justificación: Brand typography requires Poppins (contemporary, strong) for headings
// and Open Sans (clean, readable) for body text - professional financial CRM aesthetic
// Impacto: Consistent brand identity across the application

// Poppins - Display font for headings and titles
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
  preload: true,
});

// Open Sans - Body font for text and UI elements
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
  preload: true,
});

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// AI_DECISION: Convert root layout to server component for 200-500ms FCP/LCP improvement
// Justificación: 'use client' forces entire app to CSR, increasing hydration JS by ~40KB
// Impacto: Server-side rendering for static content, client JS only where needed
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} ${openSans.variable}`}>
      <body className={openSans.className}>
        {isDevelopment && <DebugConsole />}
        <ThemeProviderWrapper defaultTheme="light">
          <ErrorBoundary>
            <AuthProvider>
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
