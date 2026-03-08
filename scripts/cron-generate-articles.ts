/**
 * Cron job: Generate articles from ingested news using Claude Haiku.
 * Processes unprocessed, non-discarded items from news_ingested (limit 10).
 * For each item, determines relevance to handheld gaming.
 * If relevant, generates a full article and inserts into articles table.
 *
 * Schedule: every 3 hours offset by 30 min (30 *​/3 * * *)
 * Usage: cd /home/ubuntu/handhelddb && npx tsx scripts/cron-generate-articles.ts
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
const BATCH_LIMIT = 10;

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

interface ArticleGeneration {
  relevant: boolean;
  title?: string;
  lead?: string;
  body_html?: string;
  category?: string;
  tags?: string[];
  devices?: string[];
  meta_title?: string;
  meta_description?: string;
}

const SYSTEM_PROMPT = `You are a gaming news editor for HandheldDB (Handheld GameDB), a website dedicated to handheld gaming PC performance. Your audience cares about devices like Steam Deck, ROG Ally, Legion Go, GPD Win, AYANEO, MSI Claw, and Nintendo Switch 2.

Your job is to evaluate whether a news item is relevant to handheld gaming, and if so, write a polished article about it.

A news item is RELEVANT if it covers:
- Handheld gaming devices (Steam Deck, ROG Ally, Legion Go, GPD Win, AYANEO, MSI Claw, Nintendo Switch, etc.)
- SteamOS, Proton, Linux gaming, compatibility layers
- Games that are popular on handhelds (especially Steam Deck verified/playable titles)
- Game performance, optimization, or settings relevant to portable play
- Sales on games commonly played on handhelds
- Handheld accessories, docks, controllers
- Portable/mobile gaming industry trends

A news item is NOT relevant if it covers:
- Desktop PC hardware only (GPUs, CPUs, motherboards with no handheld angle)
- Console exclusives with no PC port
- eSports / competitive gaming news
- VR/AR gaming only
- Mobile phone games only
- General tech industry news unrelated to gaming

You MUST respond with valid JSON only — no markdown fences, no extra text.

If NOT relevant, respond:
{"relevant": false}

If relevant, respond with this exact JSON structure:
{
  "relevant": true,
  "title": "Concise, engaging headline (max 100 chars)",
  "lead": "2-3 sentence summary of the news and why handheld gamers should care.",
  "body_html": "<h2>...</h2><p>...</p>... (300-600 words of HTML content, well-structured with h2/h3 subheadings, paragraphs, and occasional lists. Write in a professional but accessible tone. Focus on the handheld gaming angle.)",
  "category": "one of: device_launch, device_update, os_update, driver_update, game_patch, game_launch, sale_event, performance_analysis, industry, editorial",
  "tags": ["tag1", "tag2", "tag3"],
  "devices": ["steam-deck-oled", "rog-ally-x"],
  "meta_title": "SEO-optimized title (max 60 chars)",
  "meta_description": "SEO-optimized description (max 155 chars)"
}

Device slugs to use: steam-deck-oled, steam-deck-lcd, rog-ally-x, rog-ally, legion-go, legion-go-s, msi-claw-8-ai-plus, ayaneo-2s, gpd-win-4, nintendo-switch-2

Important:
- Only include devices that are actually mentioned or directly relevant
- Use specific, descriptive tags (not generic ones like "gaming" or "news")
- body_html should be well-formed HTML fragments (no <html>, <head>, <body> tags)
- Write original content — do not copy the source verbatim`;

async function callClaude(userMessage: string): Promise<ArticleGeneration> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
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

  return JSON.parse(jsonMatch[0]) as ArticleGeneration;
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
  console.log(`[${new Date().toISOString()}] Starting article generation...`);

  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set!');
    process.exit(1);
  }

  // Fetch unprocessed, non-discarded items
  const { data: items, error: fetchErr } = await supabase
    .from('news_ingested')
    .select('*, news_sources(name)')
    .eq('processed', false)
    .eq('discarded', false)
    .order('ingested_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchErr) {
    console.error('Failed to fetch ingested items:', fetchErr.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('No unprocessed items found. Exiting.');
    return;
  }

  console.log(`Processing ${items.length} item(s)...`);

  let generated = 0;
  let discarded = 0;
  let errors = 0;

  for (const item of items) {
    const sourceName = (item as any).news_sources?.name ?? 'Unknown';
    console.log(`\n--- [${sourceName}] ${item.title} ---`);

    try {
      const prompt = `Evaluate this news item for handheld gaming relevance and generate an article if relevant.

SOURCE: ${sourceName}
TITLE: ${item.title}
URL: ${item.url}
CONTENT:
${(item.content ?? '').slice(0, 3000)}`;

      const result = await callClaude(prompt);

      if (!result.relevant) {
        console.log('  -> Not relevant. Discarding.');
        await supabase
          .from('news_ingested')
          .update({ processed: true, discarded: true })
          .eq('id', item.id);
        discarded++;
        continue;
      }

      // Validate category
      const category = VALID_CATEGORIES.includes(result.category as any)
        ? result.category!
        : 'industry';

      // Filter device slugs to known ones
      const devices = (result.devices ?? []).filter((d) =>
        KNOWN_DEVICES.includes(d),
      );

      const slug = await ensureUniqueSlug(slugify(result.title ?? item.title));

      const article = {
        slug,
        title: (result.title ?? item.title).slice(0, 500),
        lead: (result.lead ?? '').slice(0, 1000),
        body: (result.body_html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        body_html: result.body_html ?? '',
        category,
        tags: result.tags ?? [],
        devices,
        status: 'published',
        published_at: new Date().toISOString(),
        ai_generated: true,
        ai_model: MODEL,
        source_urls: [item.url],
        meta_title: (result.meta_title ?? (result.title ?? item.title)).slice(0, 200),
        meta_description: (result.meta_description ?? (result.lead ?? '')).slice(0, 300),
        view_count: 0,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('articles')
        .insert(article)
        .select('id, slug')
        .single();

      if (insertErr) {
        console.error(`  Failed to insert article: ${insertErr.message}`);
        // Still mark as processed to avoid infinite retries
        await supabase
          .from('news_ingested')
          .update({ processed: true })
          .eq('id', item.id);
        errors++;
        continue;
      }

      console.log(`  -> Article created: ${inserted.slug} (${inserted.id})`);

      // Update news_ingested
      await supabase
        .from('news_ingested')
        .update({ processed: true, article_id: inserted.id })
        .eq('id', item.id);

      generated++;

      // Small delay between API calls
      await sleep(1000);

    } catch (err: any) {
      console.error(`  Error processing item: ${err.message}`);
      // Mark as processed to avoid retrying indefinitely on bad items
      await supabase
        .from('news_ingested')
        .update({ processed: true })
        .eq('id', item.id);
      errors++;
    }
  }

  console.log(`\n[${new Date().toISOString()}] Article generation complete.`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Discarded: ${discarded}`);
  console.log(`  Errors: ${errors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
