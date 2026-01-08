import { MetadataRoute } from 'next';

/**
 * AI_DECISION: Web App Manifest for PWA and mobile experience
 * Justificación: Improves mobile experience and enables "Add to Home Screen"
 * Impacto: Better branding on mobile, PWA capabilities, SEO boost
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MaatWork - Gestión Patrimonial Profesional',
    short_name: 'MaatWork',
    description:
      'Potencia tu patrimonio con MaatWork. Asesoramiento financiero experto, Cash Management, Capitalización y Administración Patrimonial.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#8b5cf6',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['finance', 'business', 'productivity'],
    lang: 'es-AR',
  };
}
