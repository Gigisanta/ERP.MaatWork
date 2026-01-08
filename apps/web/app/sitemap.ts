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
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/legal/privacy-policy.html`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms-of-service.html`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
