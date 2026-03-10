import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data: articles } = await sb
  .from('articles')
  .select('id, title, tags, category')
  .eq('status', 'published')
  .is('cover_image', null);

if (!articles || articles.length === 0) {
  console.log('No articles need cover images');
  process.exit(0);
}

console.log('Articles to backfill:', articles.length);

// Extract candidate game names from article title and tags
function extractGameCandidates(title, tags) {
  const candidates = [];

  // From title: try to extract game name (often before ":", "–", "-", "Gets", "Launches", etc.)
  const titleSplitters = /\s*(?::|–|—|\bgets\b|\blaunches\b|\breaches\b|\bbreaks\b|\bpasses\b|\bconfirmed\b|\bachieve|\bafter\b|\bcoming\b|\bbrings\b|\bdev\b)/i;
  const parts = title.split(titleSplitters);
  if (parts[0] && parts[0].trim().length > 3) {
    candidates.push(parts[0].trim());
  }

  // From tags: convert "resident-evil-4-remake" -> "resident evil 4 remake"
  for (const tag of tags || []) {
    const cleaned = tag.replace(/-/g, ' ').trim();
    if (cleaned.length > 3 && !['steam deck', 'handheld gaming', 'linux gaming', 'mods', 'combat', 'indie', 'roguelike', 'deckbuilder', 'strategy', 'proton', 'steamos', 'co op gaming', 'demo', 'early access'].includes(cleaned.toLowerCase())) {
      candidates.push(cleaned);
    }
  }

  return candidates;
}

let updated = 0;
for (const art of articles) {
  const candidates = extractGameCandidates(art.title, art.tags);
  let coverImage = null;

  for (const candidate of candidates) {
    if (coverImage) break;

    // Try exact ilike match
    const { data: matches } = await sb
      .from('games')
      .select('name, header_image')
      .ilike('name', candidate)
      .not('header_image', 'is', null)
      .limit(1);

    if (matches && matches.length > 0) {
      coverImage = matches[0].header_image;
      continue;
    }

    // Try partial match (candidate in game name or game name in candidate)
    const { data: partials } = await sb
      .from('games')
      .select('name, header_image')
      .ilike('name', `%${candidate}%`)
      .not('header_image', 'is', null)
      .order('name')
      .limit(1);

    if (partials && partials.length > 0) {
      coverImage = partials[0].header_image;
    }
  }

  if (coverImage) {
    const { error } = await sb
      .from('articles')
      .update({ cover_image: coverImage })
      .eq('id', art.id);

    if (!error) {
      updated++;
      console.log('  OK:', art.title.substring(0, 60), '->', coverImage.substring(0, 80));
    } else {
      console.error('  FAIL:', art.title, error.message);
    }
  } else {
    console.log('  NO MATCH:', art.title);
  }
}

console.log(`\nDone. Updated ${updated} of ${articles.length} articles.`);
