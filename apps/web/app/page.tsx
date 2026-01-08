/**
 * Home Page - Server Component
 *
 * AI_DECISION: Convert to Server Component with Client Islands pattern
 * Justificación: Server-side data fetching reduces First Load JS by ~400KB
 * Impacto: Static content rendered server-side, interactivity isolated to client islands
 */

import { Suspense } from 'react';
import { HomePageClient } from './components/home/HomePageClient';
import { LandingPage } from './components/landing/LandingPage';
import {
  getCurrentUser,
  getContactsMetricsServer,
  getMonthlyGoalsServer,
  getTeamsServer,
} from '@/lib/api-server-helpers';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import { Card, CardContent, Spinner, Stack, Text } from '@maatwork/ui';
import type { Metadata } from 'next';

// AI_DECISION: Metadata optimizada para SEO en la Landing Page
// Justificación: La landing page (/) es la entrada principal pública y necesita máxima visibilidad.
// Impacto: Mejora posicionamiento en Google y preview en redes sociales.
export const metadata: Metadata = {
  title: 'MaatWork | Gestión Patrimonial Profesional',
  description:
    'Potencia tu patrimonio con MaatWork. Asesoramiento financiero experto, Cash Management, Capitalización y Administración Patrimonial. Operá de forma ágil y segura.',
  keywords: [
    'Gestión Patrimonial',
    'Inversiones',
    'Asesoramiento Financiero',
    'Cash Management',
    'Capitalización',
    'Wealth Management',
    'Argentina',
    'Finanzas Corporativas',
    'Asesor financiero Buenos Aires',
    'Inversiones en Argentina',
    'Planificación financiera personal',
    'Administración de patrimonio familiar',
    'Inversiones en dólares Argentina',
    'CRM para asesores financieros',
    'Gestión de portafolios de inversión',
  ],
  openGraph: {
    title: 'MaatWork | Gestión Patrimonial Profesional',
    description:
      'Expertos en gestión patrimonial y mercado de capitales. Soluciones financieras a medida para individuos y empresas.',
    url: 'https://maat.work',
    siteName: 'MaatWork',
    images: [
      {
        url: 'https://maat.work/og-image.jpg', // Reemplazar con URL real cuando exista
        width: 1200,
        height: 630,
        alt: 'MaatWork - Soluciones Financieras',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MaatWork | Gestión Patrimonial Profesional',
    description:
      'Expertos en gestión patrimonial y mercado de capitales. Soluciones financieras a medida.',
    // images: ['https://maat.work/twitter-image.jpg'], // Reemplazar con URL real
  },
  alternates: {
    canonical: 'https://maat.work',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

/**
 * Loading component for home page
 */
function HomePageLoading() {
  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Card>
        <CardContent>
          <Stack direction="row" gap="sm" align="center" justify="center" className="py-8">
            <Spinner size="sm" />
            <Text color="secondary">Cargando...</Text>
          </Stack>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Fetch home page data
 */
async function getHomePageData() {
  try {
    // Fetch all data in parallel
    const [userResponse, metricsResponse, goalsResponse, teamsResponse] = await Promise.all([
      getCurrentUser().catch(() => ({ success: false, data: null })),
      getContactsMetricsServer().catch(() => ({ success: false, data: null })),
      getMonthlyGoalsServer().catch(() => ({ success: false, data: null })),
      getTeamsServer().catch(() => ({ success: false, data: null })),
    ]);

    const user = userResponse.success && userResponse.data ? userResponse.data : null;

    // If user is authenticated, fetch metrics and goals
    let metricsData: MonthlyMetrics | null = null;
    let goalsData: MonthlyGoal | null = null;
    let teamCalendarUrl: string | null = null;
    let teamId: string | null = null;
    let metricsError: string | null = null;

    if (user) {
      if (metricsResponse.success && metricsResponse.data) {
        metricsData = metricsResponse.data.currentMonth;
      } else {
        metricsError = 'No pudimos cargar las métricas del mes.';
      }

      if (goalsResponse.success && goalsResponse.data) {
        goalsData = goalsResponse.data;
      }

      // Get team calendar URL - find first team where user is a member that has calendarUrl configured
      // AI_DECISION: getTeamsServer() already returns only teams where user is a member/manager
      // Justificación: Since getTeamsServer() filters to user's teams, we just need to find first with calendarUrl
      // Impacto: Calendar will show for any team the user belongs to that has calendarUrl configured
      if (teamsResponse.success && teamsResponse.data && teamsResponse.data.length > 0) {
        const teamWithCalendar = teamsResponse.data.find((team) => team.calendarUrl);
        teamCalendarUrl = teamWithCalendar?.calendarUrl || null;
        teamId = teamWithCalendar?.id || null;
      }
    }

    return {
      user,
      metricsData,
      goalsData,
      teamCalendarUrl,
      teamId,
      metricsError,
    };
  } catch (error) {
    // Return null user on error (will show unauthenticated state)
    return {
      user: null,
      metricsData: null,
      goalsData: null,
      teamCalendarUrl: null,
      teamId: null,
      metricsError: 'No pudimos cargar las métricas del mes.',
    };
  }
}

/**
 * Home page component
 */
export default async function HomePage() {
  const { user, metricsData, goalsData, teamCalendarUrl, teamId, metricsError } =
    await getHomePageData();

  // If no user, show unauthenticated state
  if (!user) {
    // AI_DECISION: JSON-LD Structured Data para SEO
    // Justificación: Ayuda a Google a entender que esto es una Organización Financiera.
    // Impacto: Rich snippets en resultados de búsqueda.
    // FinancialService Schema
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FinancialService',
      name: 'MaatWork',
      image: 'https://maat.work/icon.png',
      description:
        'Gestión profesional de clientes e inversiones. Soluciones financieras a medida.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Av. del Libertador 6430, Piso 14',
        addressLocality: 'Buenos Aires',
        addressRegion: 'CABA',
        postalCode: '1428',
        addressCountry: 'AR',
      },
      telephone: '+5491134600296',
      url: 'https://maat.work',
      priceRange: '$$',
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '18:00',
        },
      ],
    };

    // FAQ Schema for rich snippets in Google
    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Qué servicios ofrece MaatWork?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Ofrecemos Cash Management para gestión de liquidez, Capitalización para crecimiento a largo plazo, y Administración Patrimonial para protección y gestión integral del patrimonio.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Cómo puedo agendar una asesoría financiera gratuita?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Podés completar el formulario de contacto en nuestra web o escribirnos por WhatsApp al +54 9 11 3460-0296. Un asesor se pondrá en contacto a la brevedad.',
          },
        },
        {
          '@type': 'Question',
          name: '¿MaatWork opera en toda Argentina?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sí, brindamos servicios en todo el país. Nuestras oficinas están en Buenos Aires pero atendemos clientes de todas las provincias de forma virtual.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Cuál es el monto mínimo para invertir?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No hay monto mínimo fijo. Analizamos cada caso de forma personalizada para ofrecerte las mejores opciones según tu situación financiera.',
          },
        },
      ],
    };

    return (
      <Suspense fallback={<HomePageLoading />}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <LandingPage />
      </Suspense>
    );
  }

  // Show authenticated home page
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageClient metricsData={metricsData} goalsData={goalsData} metricsError={metricsError} />
    </Suspense>
  );
}
