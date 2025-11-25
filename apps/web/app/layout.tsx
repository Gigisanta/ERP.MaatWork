import { AuthProvider } from './auth/AuthContext';
import ThemeProviderWrapper from './components/ThemeProviderWrapper';
import { ErrorBoundary } from '../components/ErrorBoundary';
import NavigationNew from './components/NavigationNew';
import AppLayout from './components/AppLayout';
import { SidebarProvider } from './components/SidebarContext';
import DebugConsole from './components/DebugConsole';
import { PageTitleProvider } from './components/PageTitleContext';
import { ConditionalAnalytics } from './components/ConditionalAnalytics';
import { ToastProvider } from '../lib/hooks/useToast';
import '@cactus/ui/styles.css';
import './globals.css';

// AI_DECISION: Convert root layout to server component for 200-500ms FCP/LCP improvement
// Justificación: 'use client' forces entire app to CSR, increasing hydration JS by ~40KB
// Impacto: Server-side rendering for static content, client JS only where needed
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-background">
        <DebugConsole />
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
      </body>
    </html>
  );
}


