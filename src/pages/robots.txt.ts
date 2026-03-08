import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const baseUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'https://handhelddb.com').replace(/\/+$/, '');

  const robotsTxt = `User-agent: *
Allow: /

Disallow: /api/
Disallow: /auth/
Disallow: /profile

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
