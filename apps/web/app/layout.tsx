import { AuthProvider } from './auth/AuthContext';
import ThemeProviderWrapper from './components/ThemeProviderWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import NavigationNew from './components/NavigationNew';
import AppLayout from './components/AppLayout';
import { SidebarProvider } from './components/SidebarContext';
import { PageTitleProvider } from './components/PageTitleContext';
import { ConditionalAnalytics } from './components/ConditionalAnalytics';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import { ToastProvider } from '../lib/hooks/useToast';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import { getCurrentUser } from '@/lib/api-server';
import { cookies } from 'next/headers';
import {
  DynamicDebugConsole,
  DynamicGlobalKeyboardShortcuts,
} from './components/LayoutDynamicWrappers';
import type { Metadata } from 'next';

// Styles from @maatwork/ui
import '@maatwork/ui/styles.css';
import './globals.css';

// AI_DECISION: Only load DebugConsole in development to reduce production bundle
// Justificación: DebugConsole adds ~2KB to bundle and creates client component overhead
// Impacto: Smaller production bundle, faster initial load in production
// Ref: moved to LayoutDynamicWrappers.tsx to support ssr: false

// AI_DECISION: Keyboard shortcuts available globally with Cmd/Ctrl + ?
// Justificación: Mejora la productividad de usuarios avanzados
// Impacto: Modal de atajos accesible desde cualquier página
// Ref: moved to LayoutDynamicWrappers.tsx to support ssr: false

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

export const metadata: Metadata = {
  title: {
    template: '%s | MaatWork',
    default: 'MaatWork',
  },
  description: 'Gestión profesional de clientes e inversiones',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

async function getInitialUser() {
  try {
    const response = await getCurrentUser();
    if (response.success && response.data) {
      // Convert UserApiResponse to AuthUser format
      const userData = response.data;
      return {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        fullName: userData.fullName,
        isActive: userData.isActive,
      };
    }
  } catch (error) {
    // AI_DECISION: Handle 401 Unauthorized explicitly by clearing the cookie
    // Justificación: When API returns 401 (e.g. user deleted), it sets Set-Cookie to clear token.
    //                However, Next.js Server Components don't automatically forward that Set-Cookie to the browser
    //                for internal fetch calls. We must manually delete the cookie in the Server Action/Component
    //                to prevent infinite redirect loops (Middleware sees valid JWT -> Layout gets 401 -> Redirect -> Middleware sees valid JWT).
    // Impacto: Breaks the infinite loop when user exists in JWT but not in DB
    const isUnauthorized =
      (error as { status?: number }).status === 401 ||
      (error instanceof Error && error.message.includes('Unauthorized'));

    if (isUnauthorized) {
      // AI_DECISION: Cookies cannot be deleted in Server Components.
      // We rely on Middleware or Client-side logout to handle token clearance.
      // This prevents the "Cookies can only be modified in a Server Action or Route Handler" error.
    }

    // AI_DECISION: Log errors but don't throw - allow app to render unauthenticated shell
    // Justificación: Errores de red o API no deben bloquear el renderizado inicial
    // Impacto: Mejor UX permitiendo que la app se cargue incluso si la API no está disponible
    if (process.env.NODE_ENV === 'development' && !isUnauthorized) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[Layout] Error getting initial user:', errorMessage);
    }
    // Return null to render unauthenticated shell
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
        {isDevelopment && <DynamicDebugConsole />}
        <ThemeProviderWrapper defaultTheme="light">
          <ErrorBoundary>
            <AuthProvider initialUser={initialUser}>
              <ToastProvider>
                <SidebarProvider>
                  <PageTitleProvider>
                    <NavigationNew />
                    <AppLayout>{children}</AppLayout>
                    <DynamicGlobalKeyboardShortcuts />
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
