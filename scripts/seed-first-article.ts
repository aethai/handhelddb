/**
 * Seeds the first article: a launch announcement for HandheldGameDB
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const bodyHtml = `
<h2>Welcome to Handheld GameDB</h2>
<p>We're excited to launch <strong>Handheld GameDB</strong> — the community-driven performance database for handheld gaming PCs. Our goal is simple: help you find the best settings for every game on your device.</p>

<h3>What We Offer</h3>
<p>Unlike generic PC gaming databases, we focus specifically on the unique challenges of handheld gaming:</p>
<ul>
<li><strong>Device-specific settings</strong> — What works on a Steam Deck OLED might not work on a Legion Go</li>
<li><strong>Three TDP profiles</strong> — Battery Saver, Balanced, and Performance presets for every game</li>
<li><strong>Real battery life data</strong> — Know exactly how long you can play before reaching for a charger</li>
<li><strong>Thermal and noise reports</strong> — Because nobody wants a handheld that burns their hands</li>
</ul>

<h3>Supported Devices</h3>
<p>At launch, we support <strong>10 handheld devices</strong>:</p>
<ul>
<li>Steam Deck OLED & LCD</li>
<li>ASUS ROG Ally X & ROG Ally</li>
<li>Lenovo Legion Go & Legion Go S</li>
<li>MSI Claw 8 AI+</li>
<li>AYANEO 2S</li>
<li>GPD Win 4</li>
<li>Nintendo Switch 2</li>
</ul>

<h3>140+ Games Indexed</h3>
<p>We've started with 140 of the most popular PC games, from <em>Baldur's Gate 3</em> and <em>ELDEN RING</em> to <em>Stardew Valley</em> and <em>Hades</em>. Every game includes Steam Deck compatibility status, ProtonDB ratings, Metacritic scores, and genre tags.</p>

<h3>How You Can Help</h3>
<p>This is a community-driven project. Every performance report you submit helps thousands of other handheld gamers. Here's how to contribute:</p>
<ol>
<li><strong>Sign in</strong> with your Google account</li>
<li><strong>Pick a game</strong> from our database</li>
<li><strong>Submit a report</strong> with your FPS, settings, TDP, and battery life data</li>
</ol>

<p>It takes less than 2 minutes and your data directly improves the experience for the entire community.</p>

<h3>What's Coming Next</h3>
<p>We have an ambitious roadmap for the coming weeks:</p>
<ul>
<li>Community voting and consensus on best settings</li>
<li>Faceted search with genre, device, and compatibility filters</li>
<li>Device comparison tool</li>
<li>Steam Library integration</li>
<li>Weekly performance digests and firmware tracking</li>
<li>Shareable performance cards for social media</li>
</ul>

<p>Stay tuned — and thank you for being one of our first users!</p>
`;

async function main() {
  const article = {
    slug: 'welcome-to-handheld-gamedb',
    title: 'Welcome to Handheld GameDB — The Community Performance Database',
    lead: 'We launched Handheld GameDB to solve one problem: finding the best settings for every game on every handheld. Here\'s what we built and where we\'re going.',
    body: bodyHtml.replace(/<[^>]*>/g, ''), // plain text version
    body_html: bodyHtml.trim(),
    cover_image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg?t=1767883716',
    category: 'editorial',
    tags: ['launch', 'announcement', 'community'],
    devices: ['steam-deck-oled', 'rog-ally-x', 'legion-go'],
    status: 'published',
    published_at: new Date().toISOString(),
    ai_generated: false,
    meta_title: 'Welcome to Handheld GameDB',
    meta_description: 'Introducing Handheld GameDB — the community-driven performance database for Steam Deck, ROG Ally, Legion Go and more.',
    view_count: 0,
  };

  const { data, error } = await supabase
    .from('articles')
    .upsert(article, { onConflict: 'slug' })
    .select('id, slug')
    .single();

  if (error) {
    console.error('Failed to create article:', error);
    process.exit(1);
  }

  console.log(`Article created: ${data.slug} (${data.id})`);
}

main();
