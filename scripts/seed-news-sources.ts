/**
 * Seeds RSS news sources into the news_sources table.
 * Upserts by URL so it's safe to run multiple times.
 *
 * Usage: cd /home/ubuntu/handhelddb && npx tsx scripts/seed-news-sources.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const sources = [
  {
    name: 'Steam Deck HQ',
    type: 'rss',
    url: 'https://steamdeckhq.com/feed/',
    is_active: true,
    check_interval_minutes: 60,
  },
  {
    name: 'GamingOnLinux',
    type: 'rss',
    url: 'https://www.gamingonlinux.com/article_rss.php',
    is_active: true,
    check_interval_minutes: 60,
  },
  {
    name: 'PC Gamer',
    type: 'rss',
    url: 'https://www.pcgamer.com/rss/',
    is_active: true,
    check_interval_minutes: 60,
  },
  {
    name: 'Eurogamer',
    type: 'rss',
    url: 'https://www.eurogamer.net/feed',
    is_active: true,
    check_interval_minutes: 60,
  },
  {
    name: 'Rock Paper Shotgun',
    type: 'rss',
    url: 'https://www.rockpapershotgun.com/feed',
    is_active: true,
    check_interval_minutes: 60,
  },
  {
    name: 'Ars Technica Gaming',
    type: 'rss',
    url: 'https://feeds.arstechnica.com/arstechnica/gaming',
    is_active: true,
    check_interval_minutes: 60,
  },
  {
    name: 'The Verge Gaming',
    type: 'rss',
    url: 'https://www.theverge.com/rss/games/index.xml',
    is_active: true,
    check_interval_minutes: 60,
  },
];

async function main() {
  console.log('Seeding news sources...');

  for (const source of sources) {
    // Check if source already exists by URL
    const { data: existing } = await supabase
      .from('news_sources')
      .select('id, name')
      .eq('url', source.url)
      .maybeSingle();

    if (existing) {
      // Update existing source
      const { data, error } = await supabase
        .from('news_sources')
        .update({ name: source.name, type: source.type, is_active: source.is_active, check_interval_minutes: source.check_interval_minutes })
        .eq('id', existing.id)
        .select('id, name, url')
        .single();

      if (error) {
        console.error(`  FAILED (update): ${source.name} — ${error.message}`);
      } else {
        console.log(`  UPDATED: ${data.name} (${data.id})`);
      }
    } else {
      // Insert new source
      const { data, error } = await supabase
        .from('news_sources')
        .insert(source)
        .select('id, name, url')
        .single();

      if (error) {
        console.error(`  FAILED (insert): ${source.name} — ${error.message}`);
      } else {
        console.log(`  CREATED: ${data.name} (${data.id})`);
      }
    }
  }

  console.log(`\nDone. ${sources.length} sources seeded.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
