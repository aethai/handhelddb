/**
 * One-time script to generate 5-8 initial articles using Claude Haiku.
 * Takes curated handheld gaming topics and generates full articles.
 *
 * Usage: cd /home/ubuntu/handhelddb && npx tsx scripts/seed-initial-news.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = 'claude-haiku-4-5-20251001';

const VALID_CATEGORIES = [
  'device_launch', 'device_update', 'os_update', 'driver_update',
  'game_patch', 'game_launch', 'sale_event', 'performance_analysis',
  'industry', 'editorial',
] as const;

const KNOWN_DEVICES = [
  'steam-deck-oled', 'steam-deck-lcd', 'rog-ally-x', 'rog-ally',
  'legion-go', 'legion-go-s', 'msi-claw-8-ai-plus', 'ayaneo-2s',
  'gpd-win-4', 'nintendo-switch-2',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 250);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GeneratedArticle {
  title: string;
  lead: string;
  body_html: string;
  category: string;
  tags: string[];
  devices: string[];
  meta_title: string;
  meta_description: string;
}

const SYSTEM_PROMPT = `You are a gaming news editor for HandheldDB (Handheld GameDB), a website dedicated to handheld gaming PC performance. You write authoritative, well-researched articles about handheld gaming devices, games, and the portable gaming ecosystem.

Your audience owns devices like Steam Deck, ROG Ally, Legion Go, GPD Win, AYANEO, MSI Claw, and Nintendo Switch 2.

Given a topic, write a complete news article. Respond with valid JSON only — no markdown fences, no extra text.

JSON structure:
{
  "title": "Concise, engaging headline (max 100 chars)",
  "lead": "2-3 sentence summary that hooks the reader.",
  "body_html": "<h2>...</h2><p>...</p>... (400-600 words of HTML content, well-structured with h2/h3 subheadings, paragraphs, and occasional lists. Write in a professional but accessible tone.)",
  "category": "one of: device_launch, device_update, os_update, driver_update, game_patch, game_launch, sale_event, performance_analysis, industry, editorial",
  "tags": ["tag1", "tag2", "tag3"],
  "devices": ["steam-deck-oled", "rog-ally-x"],
  "meta_title": "SEO-optimized title (max 60 chars)",
  "meta_description": "SEO-optimized description (max 155 chars)"
}

Device slugs to use: steam-deck-oled, steam-deck-lcd, rog-ally-x, rog-ally, legion-go, legion-go-s, msi-claw-8-ai-plus, ayaneo-2s, gpd-win-4, nintendo-switch-2

Important:
- Write as if this is March 2026
- Be factual and cite realistic specifications/details
- Only include devices that are actually relevant to the topic
- body_html should be well-formed HTML fragments (no <html>, <head>, <body> tags)
- Write original, high-quality content`;

const TOPICS = [
  {
    prompt: `Write an article about the rumored Steam Deck OLED 2 (next-gen Steam Deck). Cover expected specs (newer AMD APU, improved display, better battery), anticipated release window, and what it means for the handheld market. This is speculative/rumor-based reporting.`,
    publishOffset: 0,
  },
  {
    prompt: `Write an article about the Lenovo Legion Go S launch and early impressions. Cover its specs (AMD Z1 Extreme, 8-inch screen, SteamOS support), how it competes with Steam Deck and ROG Ally, pricing, and initial reception from the handheld gaming community.`,
    publishOffset: -1,
  },
  {
    prompt: `Write a comprehensive ROG Ally X review roundup article. Summarize the consensus from reviewers: performance (AMD Z1 Extreme), battery life, display quality, ergonomics, Windows vs SteamOS experience, and how it compares to Steam Deck OLED. Include pros and cons.`,
    publishOffset: -2,
  },
  {
    prompt: `Write about the latest SteamOS 3.6 update and what it brings to Steam Deck users. Cover new features like improved game compatibility, performance optimizations, UI improvements, new controller support, and Proton updates. Discuss impact on the broader Linux gaming ecosystem.`,
    publishOffset: -3,
  },
  {
    prompt: `Write a "Best Games for Handheld Gaming PCs in 2026" roundup article. Cover 8-10 games across different genres that run exceptionally well on devices like Steam Deck and ROG Ally. Include brief performance notes for each (FPS, settings, battery life where relevant). Mix indie gems with AAA titles.`,
    publishOffset: -4,
  },
  {
    prompt: `Write a handheld gaming PC market overview for early 2026. Cover the current state of competition (Valve, ASUS, Lenovo, MSI, AYANEO, GPD), market growth trends, the impact of SteamOS going beyond Steam Deck, Windows handheld challenges, and predictions for the rest of the year.`,
    publishOffset: -5,
  },
];

async function callClaude(userMessage: string): Promise<GeneratedArticle> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  let text: string = data.content?.[0]?.text ?? '';

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in Claude response: ${text.slice(0, 200)}`);
  }

  return JSON.parse(jsonMatch[0]) as GeneratedArticle;
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const { data } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!data) return slug;
    slug = `${baseSlug}-${++suffix}`;
  }
}

async function main() {
  console.log('Generating initial articles for HandheldDB...\n');

  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set!');
    process.exit(1);
  }

  let successCount = 0;

  for (let i = 0; i < TOPICS.length; i++) {
    const topic = TOPICS[i];
    console.log(`[${i + 1}/${TOPICS.length}] Generating article...`);

    try {
      const result = await callClaude(topic.prompt);

      // Validate category
      const category = VALID_CATEGORIES.includes(result.category as any)
        ? result.category
        : 'editorial';

      // Filter device slugs
      const devices = (result.devices ?? []).filter((d) =>
        KNOWN_DEVICES.includes(d),
      );

      // Create a published_at date offset by days to create a realistic timeline
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() + topic.publishOffset);
      // Randomize hour for realism
      publishDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

      const slug = await ensureUniqueSlug(slugify(result.title));

      const article = {
        slug,
        title: result.title.slice(0, 500),
        lead: result.lead.slice(0, 1000),
        body: result.body_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        body_html: result.body_html,
        category,
        tags: result.tags ?? [],
        devices,
        status: 'published',
        published_at: publishDate.toISOString(),
        ai_generated: true,
        ai_model: MODEL,
        source_urls: [],
        meta_title: (result.meta_title ?? result.title).slice(0, 200),
        meta_description: (result.meta_description ?? result.lead).slice(0, 300),
        view_count: 0,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('articles')
        .upsert(article, { onConflict: 'slug' })
        .select('id, slug, title')
        .single();

      if (insertErr) {
        console.error(`  FAILED: ${insertErr.message}`);
      } else {
        console.log(`  OK: "${inserted.title}" -> /news/${inserted.slug}`);
        successCount++;
      }

      // Delay between API calls
      await sleep(2000);

    } catch (err: any) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  console.log(`\nDone. ${successCount}/${TOPICS.length} articles created.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
