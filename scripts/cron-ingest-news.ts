/**
 * Cron job: Ingest RSS feeds from news_sources into news_ingested.
 * Fetches each active source, deduplicates by external_id, and inserts new items.
 * Rate-limits at 2 seconds between sources.
 *
 * Schedule: every 2 hours (0 *​/2 * * *)
 * Usage: cd /home/ubuntu/handhelddb && npx tsx scripts/cron-ingest-news.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import RssParser from 'rss-parser';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const parser = new RssParser({
  timeout: 15_000,
  headers: {
    'User-Agent': 'HandheldGameDB/1.0 (news aggregator)',
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strips HTML tags and truncates to a maximum length.
 */
function cleanContent(raw: string | undefined, maxLen = 5000): string {
  if (!raw) return '';
  const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

async function main() {
  console.log(`[${new Date().toISOString()}] Starting news ingestion...`);

  // 1. Fetch all active sources
  const { data: sources, error: srcErr } = await supabase
    .from('news_sources')
    .select('*')
    .eq('is_active', true);

  if (srcErr || !sources) {
    console.error('Failed to fetch sources:', srcErr?.message);
    process.exit(1);
  }

  console.log(`Found ${sources.length} active source(s).`);

  let totalNew = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const source of sources) {
    console.log(`\n--- ${source.name} (${source.url}) ---`);

    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items ?? [];
      console.log(`  Fetched ${items.length} item(s) from feed.`);

      let newCount = 0;
      let skipCount = 0;

      for (const item of items) {
        const externalId = item.guid || item.link || '';
        if (!externalId) {
          console.log('  Skipping item with no guid/link.');
          skipCount++;
          continue;
        }

        // Check if already ingested
        const { data: existing } = await supabase
          .from('news_ingested')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) {
          skipCount++;
          continue;
        }

        // Insert new item
        const { error: insertErr } = await supabase
          .from('news_ingested')
          .insert({
            source_id: source.id,
            external_id: externalId,
            title: (item.title ?? 'Untitled').slice(0, 500),
            url: item.link ?? '',
            content: cleanContent(item.contentSnippet || item.content || item.summary),
            processed: false,
            discarded: false,
          });

        if (insertErr) {
          console.error(`  Failed to insert "${item.title}": ${insertErr.message}`);
          totalErrors++;
        } else {
          newCount++;
        }
      }

      console.log(`  Result: ${newCount} new, ${skipCount} skipped.`);
      totalNew += newCount;
      totalSkipped += skipCount;

      // Update last_checked on the source
      await supabase
        .from('news_sources')
        .update({ last_checked: new Date().toISOString() })
        .eq('id', source.id);

    } catch (err: any) {
      console.error(`  Error fetching ${source.name}: ${err.message}`);
      totalErrors++;
    }

    // Rate limit: wait 2s between sources
    await sleep(2000);
  }

  console.log(`\n[${new Date().toISOString()}] Ingestion complete.`);
  console.log(`  Total new: ${totalNew}`);
  console.log(`  Total skipped: ${totalSkipped}`);
  console.log(`  Total errors: ${totalErrors}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
