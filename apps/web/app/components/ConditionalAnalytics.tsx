'use client';

import { Analytics } from '@vercel/analytics/react';

/**
 * AI_DECISION: Componente cliente para cargar Analytics condicionalmente
 * Justificación: Vercel Analytics requiere carga dinámica y feature flag
 * Impacto: Solo carga Analytics cuando está habilitado, reduce bundle en desarrollo
 */
export function ConditionalAnalytics() {
  // AI_DECISION: Deshabilitar Analytics por defecto en desarrollo para mejorar rendimiento
  // Justificación: Analytics agrega overhead innecesario en desarrollo, solo necesario en producción
  // Impacto: Reduce bundle size y overhead de tracking en desarrollo
  const isProduction = process.env.NODE_ENV === 'production';
  const analyticsEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
  const analyticsDisabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'false';

  // Solo cargar Analytics si está explícitamente habilitado o en producción (y no deshabilitado)
  const shouldLoadAnalytics = analyticsEnabled || (isProduction && !analyticsDisabled);

  if (!shouldLoadAnalytics) {
    return null;
  }

  return <Analytics />;
}
