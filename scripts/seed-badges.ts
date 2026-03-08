/**
 * Seed initial badges into the badges table.
 *
 * Run: npx tsx scripts/seed-badges.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

interface BadgeSeed {
  name: string;
  description: string;
  icon: string;
  category: string;
}

const BADGES: BadgeSeed[] = [
  // ── Reporting ──
  {
    name: 'First Report',
    description: 'Submit your first performance report',
    icon: '📝',
    category: 'reporting',
  },
  {
    name: 'Reporter',
    description: 'Submit 10 performance reports',
    icon: '📊',
    category: 'reporting',
  },
  {
    name: 'Veteran Reporter',
    description: 'Submit 50 performance reports',
    icon: '🏅',
    category: 'reporting',
  },
  {
    name: 'Centurion',
    description: 'Submit 100 performance reports',
    icon: '🏆',
    category: 'reporting',
  },

  // ── Device ──
  {
    name: 'Deck Explorer',
    description: 'Submit a report on the Steam Deck',
    icon: '🎮',
    category: 'device',
  },
  {
    name: 'Ally Pioneer',
    description: 'Submit a report on the ROG Ally',
    icon: '⚡',
    category: 'device',
  },
  {
    name: 'Legion Warrior',
    description: 'Submit a report on the Legion Go',
    icon: '⚔️',
    category: 'device',
  },

  // ── Community ──
  {
    name: 'Helpful',
    description: 'Receive 10 upvotes on your reports',
    icon: '👍',
    category: 'community',
  },
  {
    name: 'Trusted Voice',
    description: 'Receive 50 upvotes on your reports',
    icon: '🌟',
    category: 'community',
  },
  {
    name: 'Community Pillar',
    description: 'Receive 100 upvotes on your reports',
    icon: '🏛️',
    category: 'community',
  },

  // ── Special ──
  {
    name: 'Multi-Device',
    description: 'Submit reports on 3 or more different devices',
    icon: '📱',
    category: 'special',
  },
  {
    name: 'Genre Explorer',
    description: 'Submit reports on games from 5 or more genres',
    icon: '🎭',
    category: 'special',
  },
  {
    name: 'Early Adopter',
    description: 'Among the first 100 users to join',
    icon: '🚀',
    category: 'special',
  },
];

async function seed() {
  console.log('Seeding badges...');

  for (const badge of BADGES) {
    const { error } = await supabase
      .from('badges')
      .upsert(badge, { onConflict: 'name' });

    if (error) {
      console.error(`  Failed: ${badge.name} — ${error.message}`);
    } else {
      console.log(`  Seeded: ${badge.name} (${badge.icon})`);
    }
  }

  console.log(`\nDone! ${BADGES.length} badges seeded.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
