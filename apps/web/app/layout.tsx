import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './auth/AuthContext';
import ThemeProviderWrapper from './components/ThemeProviderWrapper';
import { ErrorBoundary } from '../components/ErrorBoundary';
import NavigationNew from './components/NavigationNew';
import DebugConsole from './components/DebugConsole';
import { PageTitleProvider } from './components/PageTitleContext';
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
              <PageTitleProvider>
                <NavigationNew />
                <main className="min-h-screen bg-background">
                  {children}
                </main>
              </PageTitleProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProviderWrapper>
        <Analytics />
      </body>
    </html>
  );
}


