import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';

export const GET: APIRoute = async () => {
  const baseUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'https://handhelddb.com').replace(/\/+$/, '');

  // Fetch all data in parallel
  const [gamesResult, devicesResult, articlesResult, consensusResult] = await Promise.all([
    supabaseAdmin
      .from('games')
      .select('slug, updated_at')
      .order('name'),
    supabaseAdmin
      .from('devices')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('name'),
    supabaseAdmin
      .from('articles')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabaseAdmin
      .from('consensus_ratings')
      .select('game_id, device_id, games(slug), devices(slug)')
      .limit(50000),
  ]);

  const games = gamesResult.data ?? [];
  const devices = devicesResult.data ?? [];
  const articles = articlesResult.data ?? [];
  const consensusCombos = consensusResult.data ?? [];

  const today = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { loc: '/',         changefreq: 'daily',   priority: '1.0' },
    { loc: '/games',    changefreq: 'daily',   priority: '0.9' },
    { loc: '/devices',  changefreq: 'weekly',  priority: '0.9' },
    { loc: '/discover', changefreq: 'daily',   priority: '0.8' },
    { loc: '/news',     changefreq: 'daily',   priority: '0.8' },
    { loc: '/compare',  changefreq: 'weekly',  priority: '0.8' },
  ];

  const urlEntries: string[] = [];

  // Static pages
  for (const page of staticPages) {
    urlEntries.push(`  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  // Game pages
  for (const game of games) {
    const lastmod = game.updated_at
      ? new Date(game.updated_at).toISOString().split('T')[0]
      : today;
    urlEntries.push(`  <url>
    <loc>${baseUrl}/games/${game.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Device pages
  for (const device of devices) {
    const lastmod = device.updated_at
      ? new Date(device.updated_at).toISOString().split('T')[0]
      : today;
    urlEntries.push(`  <url>
    <loc>${baseUrl}/devices/${device.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // News articles
  for (const article of articles) {
    const lastmod = article.updated_at
      ? new Date(article.updated_at).toISOString().split('T')[0]
      : article.published_at
        ? new Date(article.published_at).toISOString().split('T')[0]
        : today;
    urlEntries.push(`  <url>
    <loc>${baseUrl}/news/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`);
  }

  // Game × Device pages (only combos with actual consensus data)
  for (const combo of consensusCombos) {
    const gameSlug = (combo.games as any)?.slug;
    const deviceSlug = (combo.devices as any)?.slug;
    if (!gameSlug || !deviceSlug) continue;
    urlEntries.push(`  <url>
    <loc>${baseUrl}/games/${gameSlug}/${deviceSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
