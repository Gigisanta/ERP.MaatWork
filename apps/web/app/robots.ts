import { MetadataRoute } from 'next';

/**
 * AI_DECISION: Configure robots.txt
 * Justificación: Control which parts of the site are crawled.
 * Impacto: Prevents crawling of internal app routes, focuses juice on landing page.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://maat.work';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/home/',
        '/admin/',
        '/api/',
        '/contacts/',
        '/portfolios/',
        '/teams/',
        '/profile/',
        '/analytics/',
        '/benchmarks/',
        '/capacitaciones/',
        '/pipeline/',
        '/tasks/',
        '/metrics/',
        '/notes/',
        '/tags/',
        '/users/',
        '/automations/',
        '/calendar/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
