/* eslint-disable */
/**
 * Next.js Development and Linting Configuration
 */

module.exports = {
  // AI_DECISION: Deshabilitar logging de fetches en desarrollo para mejorar rendimiento
  // Justificación: El logging de fetches agrega overhead innecesario en desarrollo
  // Impacto: Reduce tiempo de compilación y uso de memoria en dev mode
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'production',
    },
  },

  typescript: {
    // Re-enable TypeScript checks now that errors are fixed
    ignoreBuildErrors: false,
  },
};
