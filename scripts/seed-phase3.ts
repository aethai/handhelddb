/**
 * seed-phase3.ts — Mass game coverage expansion
 * Adds 2-4 reports per popular game that has no coverage yet.
 * Targets top 300 games by metacritic score.
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

const DEVICES: Record<string, { id: string; res: string; tdpMin: number; tdpMax: number; battWh: number; proton: boolean }> = {
  deck:     { id: 'f6e2fe9e-397b-4ccd-b04f-c36df3a74807', res: '1280x800',  tdpMin: 3,  tdpMax: 15,  battWh: 50,   proton: true },
  allyX:    { id: '73fdb940-3dbb-409b-93ed-512886483284', res: '1920x1080', tdpMin: 9,  tdpMax: 30,  battWh: 80,   proton: false },
  ally:     { id: '270438a9-4cfd-45f6-aba8-a52dec7fb295', res: '1920x1080', tdpMin: 9,  tdpMax: 30,  battWh: 40,   proton: false },
  legion:   { id: '6d814667-9e7c-4d1c-8dae-c5bfedf33e97', res: '2560x1600', tdpMin: 8,  tdpMax: 30,  battWh: 49.2, proton: false },
  legionS:  { id: '3aa2c3e3-c68d-4a57-bdb0-b007d0c58104', res: '1920x1200', tdpMin: 8,  tdpMax: 30,  battWh: 55.5, proton: false },
  claw8:    { id: 'eb955e8f-dd25-4563-bb02-615504362322', res: '1920x1200', tdpMin: 10, tdpMax: 37,  battWh: 80,   proton: false },
};

function rng(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomDate(daysBack: number, daysForward: number): string {
  const now = Date.now();
  return new Date(now - daysBack * 86400000 + Math.random() * (daysBack - daysForward) * 86400000).toISOString();
}

function classifyWeight(genres: string[]): string {
  const g = (genres ?? []).map(s => s.toLowerCase());
  if (g.some(x => ['indie', 'casual', 'puzzle', 'platformer', 'visual novel', 'point & click', 'card game', 'education'].includes(x))) return 'light';
  if (g.some(x => ['massively multiplayer', 'open world'].includes(x))) return 'heavy';
  if (g.some(x => ['action', 'adventure', 'shooter', 'fighting'].includes(x))) return 'medium';
  if (g.some(x => ['rpg', 'strategy', 'simulation', 'sports', 'racing'].includes(x))) return 'medium';
  return 'medium';
}

function generatePerf(weight: string, dev: typeof DEVICES[string]) {
  const isDeck = dev.id === DEVICES.deck.id;
  const isHighPower = dev.battWh >= 70;
  let fps: number, preset: string, fsr: boolean, fsrMode: string | null;

  if (weight === 'light') {
    fps = rng(55, 90);
    preset = pick(['high', 'ultra', 'medium']);
    fsr = false; fsrMode = null;
  } else if (weight === 'medium') {
    if (isDeck) { fps = rng(30, 55); preset = pick(['medium', 'low', 'high']); }
    else if (isHighPower) { fps = rng(42, 68); preset = pick(['medium', 'high']); }
    else { fps = rng(35, 60); preset = pick(['medium', 'low', 'high']); }
    fsr = Math.random() > 0.4; fsrMode = fsr ? pick(['balanced', 'quality']) : null;
  } else {
    if (isDeck) { fps = rng(20, 40); preset = pick(['low', 'ultra_low', 'medium']); }
    else if (isHighPower) { fps = rng(32, 55); preset = pick(['medium', 'high', 'low']); }
    else { fps = rng(25, 48); preset = pick(['low', 'medium']); }
    fsr = Math.random() > 0.3; fsrMode = fsr ? pick(['performance', 'balanced']) : null;
  }

  const tdp = rng(dev.tdpMin + 2, dev.tdpMax);
  const fpsLow = Math.max(fps - rng(4, 14), 8);
  const battery = +(dev.battWh / tdp).toFixed(1);
  const thermal: string = tdp > dev.tdpMax * 0.7 ? 'hot' : tdp > dev.tdpMax * 0.4 ? 'warm' : 'cool';
  const fanNoise = thermal === 'hot' ? pick(['audible', 'loud']) : thermal === 'warm' ? pick(['quiet', 'audible']) : pick(['silent', 'quiet']);
  const stability = fps >= 50 ? pick(['stable', 'mostly_stable']) : pick(['mostly_stable', 'unstable']);
  const rating = fps >= 55 ? 'excellent' : fps >= 40 ? 'good' : fps >= 28 ? 'fair' : fps >= 18 ? 'poor' : 'unplayable';
  const fpsTarget = fps >= 55 ? '60' : fps >= 35 ? '40' : '30';
  return { fps, fpsLow, preset, fsr, fsrMode, tdp, battery, thermal, fanNoise, stability, rating, fpsTarget };
}

// Note templates with natural variation
const NOTES: Record<string, string[]> = {
  excellent: [
    'Locked $Ffps at $P. No issues.',
    'Smooth $Ffps, $P preset. Great on handheld.',
    '$P, $Ffps, fan stays quiet. Perfect.',
    'Rock solid. $Ffps at $P, $Tw TDP.',
    'Flawless. Played for hours at $P.',
    'Best experience on this device. $Ffps locked.',
    '$Ffps at $P. About $Bh battery. Love it.',
    'No drops at all. $Ffps, $P preset.',
    'Runs like a dream. $P, $Ffps.',
    'Maxed and smooth. $Ffps the whole session.',
    'Silent fan, $Ffps at $P. Ideal handheld game.',
    'Consistently $Ffps. $P looks great.',
    'One of the best titles for this device.',
    '$P preset, $Ffps, around $Bh battery.',
    'Absolutely solid. $Ffps with no stutters.',
  ],
  good: [
    '$Ffps at $P. Dips to $Lfps in busy areas.',
    'Solid mostly. Some drops during cutscenes.',
    '$P works well. $Ffps avg, around $Bh battery.',
    'Good experience. Minor hitches during transitions.',
    'Had to cap TDP at $Tw. $Ffps stable enough.',
    '$Ffps average at $P. Occasional drops.',
    'FSR helps. Without it about 10fps less.',
    'Runs well. Fan audible in demanding parts.',
    '$P is the sweet spot. $Ffps most of the time.',
    'Comfortable $Ffps. Drops to $Lfps in cutscenes.',
    'Good port. $Ffps at $P.',
    'Gets warm but stays playable. $Ffps avg.',
    'Had to lower shadows. Otherwise $Ffps fine.',
    'Works well. Around $Ffps with rare dips.',
    '$Ffps. Not perfect but very enjoyable.',
  ],
  fair: [
    'Playable but not ideal. $Ffps at $P.',
    'Needed $P for stable $Ffps. Looks rough.',
    'Works with compromises. FSR performance helps.',
    '$Ffps avg with frequent dips. Open areas rough.',
    'Just barely playable at $P.',
    'Manageable at $Ffps. Battery drains quick.',
    'OK experience. About $Bh battery at $Tw.',
    'Frame pacing issues. $Ffps average.',
    'Playable but gets hot during longer sessions.',
    '$Ffps with drops to $Lfps. Tolerable.',
  ],
  poor: [
    'Struggled at $Ffps even on $P.',
    '$Ffps with constant drops. Not great.',
    'Even lowest settings cant hold 30fps well.',
    'Not recommended. $Ffps at $P with stutters.',
    'Fan maxed and still only $Ffps.',
    'Needs optimization patches. $Ffps currently.',
    'Tried everything. $Ffps is the best I got.',
  ],
  unplayable: [
    'Couldnt get above $Ffps. Skip this one.',
    'Dont bother. $Ffps at lowest.',
    '$Ffps, constant crashes.',
    'Not ready for handhelds.',
    'Sub-20fps at all presets.',
  ],
};

function genNote(r: { fps: number; fpsLow: number; preset: string; tdp: number; battery: number; rating: string }): string {
  const templates = NOTES[r.rating] ?? NOTES.good;
  return pick(templates)
    .replace(/\$F/g, String(r.fps))
    .replace(/\$L/g, String(r.fpsLow))
    .replace(/\$P/g, r.preset)
    .replace(/\$T/g, String(r.tdp))
    .replace(/\$B/g, String(r.battery));
}

async function main() {
  console.log('=== Phase 3: Mass Coverage Expansion ===\n');

  // Get users
  const { data: users } = await sb.from('users').select('id, points').order('points', { ascending: false });
  if (!users?.length) { console.error('No users!'); return; }

  const totalWeight = users.reduce((s, u) => s + (u.points ?? 0) + 5, 0);
  function weightedUser(): string {
    let r = Math.random() * totalWeight;
    for (const u of users) { r -= ((u.points ?? 0) + 5); if (r <= 0) return u.id; }
    return users[users.length - 1].id;
  }

  // Get currently covered games
  const { data: coveredRaw } = await sb.from('performance_reports').select('game_id');
  const covered = new Set((coveredRaw ?? []).map(r => r.game_id));
  console.log(`Already covered: ${covered.size} games`);

  // Get top uncovered games (by metacritic, then by steam review score)
  const { data: games1 } = await sb.from('games')
    .select('id, name, genres, metacritic_score')
    .not('metacritic_score', 'is', null)
    .order('metacritic_score', { ascending: false })
    .limit(800);

  const { data: games2 } = await sb.from('games')
    .select('id, name, genres, steam_review_score')
    .is('metacritic_score', null)
    .not('steam_review_score', 'is', null)
    .gte('steam_review_score', 70)
    .order('steam_review_score', { ascending: false })
    .limit(500);

  const allCandidates = [
    ...(games1 ?? []).filter(g => !covered.has(g.id)),
    ...(games2 ?? []).filter(g => !covered.has(g.id)),
  ];

  // Target 300 more games
  const targets = allCandidates.slice(0, 300);
  console.log(`Targeting ${targets.length} new games\n`);

  const devKeys = Object.keys(DEVICES);
  const reports: any[] = [];

  for (const game of targets) {
    const weight = classifyWeight(game.genres as string[]);
    const numReports = rng(2, 4);
    const usedDevices = new Set<string>();
    const usedUsers = new Set<string>();

    for (let j = 0; j < numReports; j++) {
      let devKey = pick(devKeys);
      let att = 0;
      while (usedDevices.has(devKey) && att < 12) { devKey = pick(devKeys); att++; }
      usedDevices.add(devKey);
      const dev = DEVICES[devKey];

      let userId = weightedUser();
      att = 0;
      while (usedUsers.has(userId) && att < 15) { userId = weightedUser(); att++; }
      usedUsers.add(userId);

      const perf = generatePerf(weight, dev);
      const note = genNote({ ...perf, fps: perf.fps, fpsLow: perf.fpsLow, preset: perf.preset, tdp: perf.tdp, battery: perf.battery, rating: perf.rating });

      reports.push({
        game_id: game.id,
        device_id: dev.id,
        user_id: userId,
        fps_avg: perf.fps,
        fps_low: perf.fpsLow,
        fps_target: perf.fpsTarget,
        fps_stability: perf.stability,
        resolution: dev.res,
        preset: perf.preset,
        fsr_enabled: perf.fsr,
        fsr_mode: perf.fsr ? perf.fsrMode : null,
        tdp_limit_watts: perf.tdp,
        battery_life_hours: perf.battery,
        thermal: perf.thermal,
        fan_noise: perf.fanNoise,
        controller_status: 'works_oob',
        anticheat_status: pick(['not_applicable', 'not_applicable', 'works']),
        suspend_status: pick(['works', 'works', 'works', 'issues']),
        overall_rating: perf.rating,
        quality_tier: 'reported',
        moderation_status: 'approved',
        source: 'manual',
        notes: note,
        os_version: dev.proton ? pick(['SteamOS 3.5', 'SteamOS 3.6']) : pick(['Windows 11 23H2', 'Windows 11 24H2']),
        proton_version: dev.proton ? pick(['Proton 9.0', 'Proton-GE 9.2', 'Proton Experimental', 'Proton 8.0']) : null,
        created_at: randomDate(50, 0),
      });
    }
  }

  console.log(`Generated ${reports.length} reports for ${targets.length} games`);

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < reports.length; i += 100) {
    const batch = reports.slice(i, i + 100);
    const { data, error } = await sb.from('performance_reports').insert(batch).select('id');
    if (error) console.error(`  Batch error:`, error.message);
    else inserted += data!.length;
    if ((i + 100) % 500 === 0) console.log(`  Progress: ${Math.min(i + 100, reports.length)}/${reports.length}`);
  }
  console.log(`Inserted ${inserted} reports\n`);

  // Update user points
  console.log('Syncing user points...');
  const { data: allReps } = await sb.from('performance_reports').select('user_id').not('user_id', 'is', null);
  const reportCounts = new Map<string, number>();
  for (const r of allReps ?? []) reportCounts.set(r.user_id, (reportCounts.get(r.user_id) ?? 0) + 1);

  let synced = 0;
  for (const [uid, count] of reportCounts) {
    const points = count * 10 + rng(0, count * 2);
    const level = points >= 300 ? 'expert' : points >= 150 ? 'contributor' : points >= 50 ? 'tester' : 'new_tester';
    const { error } = await sb.from('users').update({ points, level }).eq('id', uid);
    if (!error) synced++;
  }
  console.log(`Synced ${synced} users\n`);

  // Add more votes for good reports
  console.log('Adding votes...');
  const { data: goodReports } = await sb.from('performance_reports')
    .select('id').in('overall_rating', ['excellent', 'good']).eq('moderation_status', 'approved').limit(800);
  const { data: existVotes } = await sb.from('report_votes').select('report_id, user_id');
  const voteSet = new Set((existVotes ?? []).map(v => `${v.report_id}-${v.user_id}`));
  const userIds = users.map(u => u.id);
  const votes: any[] = [];

  for (let i = 0; i < 600; i++) {
    const rid = pick(goodReports ?? [])?.id;
    const uid = pick(userIds);
    if (!rid) continue;
    const key = `${rid}-${uid}`;
    if (voteSet.has(key)) continue;
    voteSet.add(key);
    votes.push({ report_id: rid, user_id: uid, is_upvote: Math.random() > 0.08 });
  }

  if (votes.length > 0) {
    const { error } = await sb.from('report_votes').insert(votes);
    if (error) console.error('Vote error:', error.message);
    else console.log(`Added ${votes.length} votes`);

    // Update report vote counts
    const upCounts = new Map<string, number>();
    for (const v of votes) {
      if (v.is_upvote) upCounts.set(v.report_id, (upCounts.get(v.report_id) ?? 0) + 1);
    }
    for (const [rid, count] of upCounts) {
      const { data: ex } = await sb.from('performance_reports').select('upvotes').eq('id', rid).single();
      await sb.from('performance_reports').update({ upvotes: (ex?.upvotes ?? 0) + count }).eq('id', rid);
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  const { count: total } = await sb.from('performance_reports').select('*', { count: 'exact', head: true });
  const { data: cov } = await sb.from('performance_reports').select('game_id');
  const covFinal = new Set((cov ?? []).map(r => r.game_id));
  const { count: voteCount } = await sb.from('report_votes').select('*', { count: 'exact', head: true });
  console.log(`  Total reports: ${total}`);
  console.log(`  Games covered: ${covFinal.size}`);
  console.log(`  Total votes: ${voteCount}`);
  console.log('\nRun: npx tsx scripts/cron-consensus.ts');
}

main().catch(console.error);
