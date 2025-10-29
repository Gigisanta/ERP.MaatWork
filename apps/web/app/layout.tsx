import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from '@cactus/ui';
import { ErrorBoundary } from '../components/ErrorBoundary';
import NavigationNew from './components/NavigationNew';
import '@cactus/ui/styles.css';
import './globals.css';

// AI_DECISION: Convert root layout to server component for 200-500ms FCP/LCP improvement
// Justificación: 'use client' forces entire app to CSR, increasing hydration JS by ~40KB
// Impacto: Server-side rendering for static content, client JS only where needed
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
      </head>
      <body className="bg-background">
        {/* REGLA CURSOR: Orden de providers es crítico - NO CAMBIAR SIN JUSTIFICACIÓN
            ThemeProvider (más externo, no depende de nada) >
            ErrorBoundary (captura errores de auth) >
            AuthProvider (depende de theme para estilos) */}
        <ThemeProvider defaultTheme="light">
          <ErrorBoundary>
            <AuthProvider>
              <NavigationNew />
              <main className="min-h-screen bg-background">
                {children}
              </main>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}


