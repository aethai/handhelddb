/**
 * Cron: Check and award badges + update user points/levels.
 *
 * For each user, counts reports, upvotes received, unique devices,
 * unique genres, then awards any qualifying badges they don't already have.
 * Also updates points and level.
 *
 * Schedule: every 30 minutes (or on-demand)
 * Run: npx tsx scripts/cron-award-badges.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

// ── Level thresholds ──
const LEVEL_THRESHOLDS: { minPoints: number; level: string }[] = [
  { minPoints: 1000, level: 'elite' },
  { minPoints: 500, level: 'expert' },
  { minPoints: 200, level: 'regular' },
  { minPoints: 50, level: 'contributor' },
  { minPoints: 0, level: 'new_tester' },
];

function getLevel(points: number): string {
  for (const tier of LEVEL_THRESHOLDS) {
    if (points >= tier.minPoints) return tier.level;
  }
  return 'new_tester';
}

// ── Badge definitions with check functions ──
interface BadgeCheck {
  badgeName: string;
  check: (stats: UserStats) => boolean;
}

interface UserStats {
  reportCount: number;
  totalUpvotes: number;
  uniqueDeviceCount: number;
  uniqueGenreCount: number;
  userRank: number; // position among all users by created_at
  deviceSlugs: string[];
}

const BADGE_CHECKS: BadgeCheck[] = [
  // Reporting milestones
  { badgeName: 'First Report', check: (s) => s.reportCount >= 1 },
  { badgeName: 'Reporter', check: (s) => s.reportCount >= 10 },
  { badgeName: 'Veteran Reporter', check: (s) => s.reportCount >= 50 },
  { badgeName: 'Centurion', check: (s) => s.reportCount >= 100 },

  // Device badges
  {
    badgeName: 'Deck Explorer',
    check: (s) =>
      s.deviceSlugs.some(
        (slug) => slug.includes('steam-deck'),
      ),
  },
  {
    badgeName: 'Ally Pioneer',
    check: (s) =>
      s.deviceSlugs.some(
        (slug) => slug.includes('rog-ally'),
      ),
  },
  {
    badgeName: 'Legion Warrior',
    check: (s) =>
      s.deviceSlugs.some(
        (slug) => slug.includes('legion-go'),
      ),
  },

  // Community
  { badgeName: 'Helpful', check: (s) => s.totalUpvotes >= 10 },
  { badgeName: 'Trusted Voice', check: (s) => s.totalUpvotes >= 50 },
  { badgeName: 'Community Pillar', check: (s) => s.totalUpvotes >= 100 },

  // Special
  { badgeName: 'Multi-Device', check: (s) => s.uniqueDeviceCount >= 3 },
  { badgeName: 'Genre Explorer', check: (s) => s.uniqueGenreCount >= 5 },
  { badgeName: 'Early Adopter', check: (s) => s.userRank <= 100 },
];

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Badge award cron starting...`);

  // ── Fetch all badges ──
  const { data: allBadges, error: badgeErr } = await supabase
    .from('badges')
    .select('id, name');

  if (badgeErr || !allBadges) {
    console.error('Failed to fetch badges:', badgeErr?.message);
    process.exit(1);
  }

  const badgeMap = new Map(allBadges.map((b) => [b.name, b.id]));
  console.log(`Loaded ${allBadges.length} badge definitions`);

  // ── Fetch all users ordered by creation ──
  const { data: allUsers, error: userErr } = await supabase
    .from('users')
    .select('id, points, level, created_at')
    .order('created_at', { ascending: true });

  if (userErr || !allUsers) {
    console.error('Failed to fetch users:', userErr?.message);
    process.exit(1);
  }

  console.log(`Processing ${allUsers.length} users...\n`);

  // Build user rank map (1-based position by created_at)
  const userRankMap = new Map<string, number>();
  allUsers.forEach((u, idx) => userRankMap.set(u.id, idx + 1));

  // ── Fetch all existing user_badges to skip re-checking ──
  const { data: existingBadgesRaw } = await supabase
    .from('user_badges')
    .select('user_id, badge_id');

  const existingBadges = new Set(
    (existingBadgesRaw ?? []).map((ub: any) => `${ub.user_id}::${ub.badge_id}`),
  );

  let totalAwarded = 0;
  let totalPointsUpdated = 0;

  for (const user of allUsers) {
    // ── Count reports ──
    const { count: reportCount } = await supabase
      .from('performance_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // ── Sum upvotes across all reports ──
    const { data: upvoteData } = await supabase
      .from('performance_reports')
      .select('upvotes')
      .eq('user_id', user.id);

    const totalUpvotes = (upvoteData ?? []).reduce(
      (sum: number, r: any) => sum + (r.upvotes ?? 0),
      0,
    );

    // ── Unique devices (with slugs for device-specific badges) ──
    const { data: deviceData } = await supabase
      .from('performance_reports')
      .select('device_id, devices(slug)')
      .eq('user_id', user.id);

    const deviceSlugs = [
      ...new Set(
        (deviceData ?? [])
          .map((d: any) => d.devices?.slug)
          .filter(Boolean) as string[],
      ),
    ];

    // ── Unique genres ──
    const { data: genreData } = await supabase
      .from('performance_reports')
      .select('game_id, games(genres)')
      .eq('user_id', user.id);

    const allGenres = new Set<string>();
    for (const row of genreData ?? []) {
      const genres = (row as any).games?.genres;
      if (Array.isArray(genres)) {
        genres.forEach((g: string) => allGenres.add(g));
      } else if (typeof genres === 'string') {
        // Could be comma-separated or JSON string
        try {
          const parsed = JSON.parse(genres);
          if (Array.isArray(parsed)) parsed.forEach((g: string) => allGenres.add(g));
        } catch {
          genres.split(',').forEach((g: string) => allGenres.add(g.trim()));
        }
      }
    }

    const stats: UserStats = {
      reportCount: reportCount ?? 0,
      totalUpvotes,
      uniqueDeviceCount: deviceSlugs.length,
      uniqueGenreCount: allGenres.size,
      userRank: userRankMap.get(user.id) ?? Infinity,
      deviceSlugs,
    };

    // ── Check and award badges ──
    let newBadgesCount = 0;

    for (const check of BADGE_CHECKS) {
      const badgeId = badgeMap.get(check.badgeName);
      if (!badgeId) continue;

      const key = `${user.id}::${badgeId}`;
      if (existingBadges.has(key)) continue; // already earned

      if (check.check(stats)) {
        const { error: insertErr } = await supabase
          .from('user_badges')
          .insert({
            user_id: user.id,
            badge_id: badgeId,
            earned_at: new Date().toISOString(),
          });

        if (insertErr) {
          // Unique constraint violation = already earned (race condition safe)
          if (!insertErr.message.includes('duplicate') && !insertErr.message.includes('unique')) {
            console.error(`  Failed to award "${check.badgeName}" to ${user.id.slice(0, 8)}: ${insertErr.message}`);
          }
        } else {
          console.log(`  Awarded "${check.badgeName}" to user ${user.id.slice(0, 8)}...`);
          existingBadges.add(key);
          newBadgesCount++;
          totalAwarded++;
        }
      }
    }

    // ── Count total badges for this user ──
    const { count: badgeCount } = await supabase
      .from('user_badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // ── Calculate points ──
    const calculatedPoints =
      (stats.reportCount * 10) +
      (stats.totalUpvotes * 2) +
      ((badgeCount ?? 0) * 50);

    const newLevel = getLevel(calculatedPoints);

    // ── Update user if changed ──
    if (calculatedPoints !== (user.points ?? 0) || newLevel !== (user.level ?? 'new_tester')) {
      const { error: updateErr } = await supabase
        .from('users')
        .update({ points: calculatedPoints, level: newLevel })
        .eq('id', user.id);

      if (updateErr) {
        console.error(`  Failed to update points for ${user.id.slice(0, 8)}: ${updateErr.message}`);
      } else {
        if (newLevel !== (user.level ?? 'new_tester')) {
          console.log(`  User ${user.id.slice(0, 8)}... leveled up: ${user.level ?? 'new_tester'} -> ${newLevel} (${calculatedPoints} pts)`);
        }
        totalPointsUpdated++;
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nBadge award cron complete in ${elapsed}s`);
  console.log(`  Users processed: ${allUsers.length}`);
  console.log(`  Badges awarded:  ${totalAwarded}`);
  console.log(`  Points updated:  ${totalPointsUpdated}`);
}

main().catch((err) => {
  console.error('Badge award cron failed:', err);
  process.exit(1);
});
