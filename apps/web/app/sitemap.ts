import { MetadataRoute } from 'next';

/**
 * AI_DECISION: Generate dynamic sitemap
 * Justificación: Helps search engines index the landing page and discoverable routes.
 * Impacto: Better SEO visibility for public pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://maat.work';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Add other public routes here if needed
  ];
}
