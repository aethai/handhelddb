import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const baseUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'https://handhelddb.com').replace(/\/+$/, '');

  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('slug, title, lead, cover_image, category, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(30);

  const items = (articles ?? []).map((a) => {
    const pubDate = a.published_at ? new Date(a.published_at).toUTCString() : new Date().toUTCString();
    const description = a.lead ? escapeXml(a.lead) : '';
    const imageTag = a.cover_image
      ? `<enclosure url="${escapeXml(a.cover_image)}" type="image/jpeg" length="0" />`
      : '';

    return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${baseUrl}/news/${a.slug}</link>
      <guid isPermaLink="true">${baseUrl}/news/${a.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      ${a.category ? `<category>${escapeXml(a.category)}</category>` : ''}
      ${imageTag}
    </item>`;
  });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HandheldDB News</title>
    <link>${baseUrl}/news</link>
    <description>Latest handheld gaming news, performance updates, and device reviews from HandheldDB.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
