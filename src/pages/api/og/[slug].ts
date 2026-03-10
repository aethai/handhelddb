import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@lib/db/client';
import { rateLimit, rateLimitResponse } from '@lib/rate-limit';

/**
 * Generate an OG image as SVG for a game page.
 * Usage: /api/og/elden-ring → SVG 1200x630
 * Can optionally include device: /api/og/elden-ring?device=steam-deck-oled
 */
export const GET: APIRoute = async ({ params, url, request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`og:${ip}`, 60, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const { slug } = params;
  const deviceSlug = url.searchParams.get('device');

  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  // Fetch game (include id for consensus lookup)
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id, name, header_image, genres, deck_compatibility, metacritic_score, developers')
    .eq('slug', slug)
    .single();

  if (!game) {
    return new Response('Game not found', { status: 404 });
  }

  // Optionally fetch device + consensus
  let deviceName = '';
  let consensusFps: number | null = null;
  let consensusPreset = '';
  let consensusVerdict = '';

  if (deviceSlug) {
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('id, name')
      .eq('slug', deviceSlug)
      .single();

    if (device) {
      deviceName = device.name;

      const { data: consensus } = await supabaseAdmin
        .from('consensus_ratings')
        .select('fps_avg, recommended_preset, overall_verdict')
        .eq('game_id', game.id)
        .eq('device_id', device.id)
        .single();

      if (consensus) {
        consensusFps = consensus.fps_avg;
        consensusPreset = consensus.recommended_preset ?? '';
        consensusVerdict = consensus.overall_verdict ?? '';
      }
    }
  }

  const genres = ((game.genres as string[]) ?? []).slice(0, 3).join(' · ');
  const developer = ((game.developers as string[]) ?? [])[0] ?? '';

  // Deck badge color
  const deckColors: Record<string, { bg: string; text: string; label: string }> = {
    verified: { bg: '#22c55e', text: '#ffffff', label: 'Verified' },
    playable: { bg: '#eab308', text: '#000000', label: 'Playable' },
    unsupported: { bg: '#ef4444', text: '#ffffff', label: 'Unsupported' },
    unknown: { bg: '#55555e', text: '#ffffff', label: 'Unknown' },
  };
  const deck = deckColors[game.deck_compatibility ?? 'unknown'] ?? deckColors.unknown;

  // Verdict color
  const verdictColors: Record<string, string> = {
    excellent: '#10b981',
    good: '#22c55e',
    fair: '#eab308',
    poor: '#f97316',
    unplayable: '#ef4444',
  };
  const verdictColor = verdictColors[consensusVerdict] ?? '#8a8a94';

  // Escape XML
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Top accent bar -->
  <rect width="1200" height="4" fill="url(#accent)"/>

  <!-- Game image placeholder (dark rectangle) -->
  <rect x="60" y="60" width="380" height="178" rx="12" fill="#1f2937"/>
  ${game.header_image ? `<image x="60" y="60" width="380" height="178" href="${esc(game.header_image)}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 12px)"/>` : ''}

  <!-- Game title -->
  <text x="60" y="290" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="bold">
    ${esc(game.name.length > 35 ? game.name.slice(0, 32) + '...' : game.name)}
  </text>

  <!-- Developer + genres -->
  <text x="60" y="325" fill="#8a8a94" font-family="system-ui, sans-serif" font-size="18">
    ${esc(developer)}${developer && genres ? ' · ' : ''}${esc(genres)}
  </text>

  <!-- Deck compatibility badge -->
  <rect x="60" y="350" width="${60 + deck.label.length * 10}" height="32" rx="8" fill="${deck.bg}" opacity="0.9"/>
  <text x="${60 + (60 + deck.label.length * 10) / 2}" y="371" fill="${deck.text}" font-family="system-ui, sans-serif" font-size="14" font-weight="600" text-anchor="middle">
    Deck ${esc(deck.label)}
  </text>

  <!-- Metacritic score -->
  ${game.metacritic_score ? `
  <rect x="${140 + deck.label.length * 10}" y="350" width="60" height="32" rx="8" fill="${game.metacritic_score >= 75 ? '#22c55e' : game.metacritic_score >= 50 ? '#eab308' : '#ef4444'}" opacity="0.2"/>
  <text x="${170 + deck.label.length * 10}" y="371" fill="${game.metacritic_score >= 75 ? '#4ade80' : game.metacritic_score >= 50 ? '#facc15' : '#f87171'}" font-family="system-ui, sans-serif" font-size="14" font-weight="700" text-anchor="middle">
    ${game.metacritic_score}
  </text>
  ` : ''}

  ${deviceName ? `
  <!-- Device performance section -->
  <rect x="60" y="410" width="1080" height="1" fill="#374151"/>

  <text x="60" y="458" fill="#8a8a94" font-family="system-ui, sans-serif" font-size="14" text-transform="uppercase" letter-spacing="2">
    PERFORMANCE ON
  </text>
  <text x="60" y="490" fill="#ffffff" font-family="system-ui, sans-serif" font-size="28" font-weight="bold">
    ${esc(deviceName)}
  </text>

  ${consensusFps ? `
  <!-- FPS display -->
  <text x="700" y="480" fill="${verdictColor}" font-family="system-ui, sans-serif" font-size="64" font-weight="bold" text-anchor="middle">
    ${Math.round(consensusFps)}
  </text>
  <text x="700" y="510" fill="#8a8a94" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">
    AVG FPS
  </text>
  ` : ''}

  ${consensusPreset ? `
  <text x="900" y="480" fill="#d1d5db" font-family="system-ui, sans-serif" font-size="28" font-weight="600" text-anchor="middle">
    ${esc(consensusPreset.charAt(0).toUpperCase() + consensusPreset.slice(1).replace('_', ' '))}
  </text>
  <text x="900" y="510" fill="#8a8a94" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">
    PRESET
  </text>
  ` : ''}

  ${consensusVerdict ? `
  <text x="1080" y="480" fill="${verdictColor}" font-family="system-ui, sans-serif" font-size="28" font-weight="600" text-anchor="middle" text-transform="capitalize">
    ${esc(consensusVerdict.charAt(0).toUpperCase() + consensusVerdict.slice(1))}
  </text>
  <text x="1080" y="510" fill="#8a8a94" font-family="system-ui, sans-serif" font-size="18" text-anchor="middle">
    VERDICT
  </text>
  ` : ''}
  ` : `
  <!-- No device — show general card -->
  <rect x="60" y="410" width="1080" height="1" fill="#374151"/>
  <text x="60" y="458" fill="#55555e" font-family="system-ui, sans-serif" font-size="16">
    Check performance data for Steam Deck, ROG Ally, Legion Go &amp; more
  </text>
  `}

  <!-- Branding -->
  <rect x="60" y="560" width="1080" height="1" fill="#1f2937"/>
  <text x="60" y="595" fill="#4ade80" font-family="system-ui, sans-serif" font-size="20" font-weight="bold">
    Handheld GameDB
  </text>
  <text x="280" y="595" fill="#55555e" font-family="system-ui, sans-serif" font-size="16">
    handheldgamedb.com
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
