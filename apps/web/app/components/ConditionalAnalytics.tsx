"use client";

import { Analytics } from '@vercel/analytics/react';

/**
 * AI_DECISION: Componente cliente para cargar Analytics condicionalmente
 * Justificación: Vercel Analytics requiere carga dinámica y feature flag
 * Impacto: Solo carga Analytics cuando está habilitado, reduce bundle en desarrollo
 */
export function ConditionalAnalytics() {
  // Solo cargar Analytics si está habilitado explícitamente o en producción
  // Por defecto, Analytics se carga en producción a menos que se deshabilite explícitamente
  const isProduction = process.env.NODE_ENV === 'production';
  const analyticsEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
  const analyticsDisabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'false';
  
  const shouldLoadAnalytics = analyticsEnabled || (isProduction && !analyticsDisabled);

  if (!shouldLoadAnalytics) {
    return null;
  }

  return <Analytics />;
}
