/**
 * seed-community.ts
 * Creates realistic community: 50 users, redistributes reports, adds new ones.
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

// Device IDs
const DEVICES = {
  deck:     'f6e2fe9e-397b-4ccd-b04f-c36df3a74807',
  allyX:    '73fdb940-3dbb-409b-93ed-512886483284',
  ally:     '270438a9-4cfd-45f6-aba8-a52dec7fb295',
  legion:   '6d814667-9e7c-4d1c-8dae-c5bfedf33e97',
};

const DEVICE_SPECS: Record<string, { res: string; tdpMin: number; tdpMax: number; battWh: number }> = {
  [DEVICES.deck]:   { res: '1280x800',  tdpMin: 3,  tdpMax: 15, battWh: 50 },
  [DEVICES.allyX]:  { res: '1920x1080', tdpMin: 9,  tdpMax: 30, battWh: 80 },
  [DEVICES.ally]:   { res: '1920x1080', tdpMin: 9,  tdpMax: 30, battWh: 40 },
  [DEVICES.legion]: { res: '2560x1600', tdpMin: 8,  tdpMax: 30, battWh: 49.2 },
};

const JUNO_ID = 'd4b0450e-d156-4323-a153-305f42e6f824';

// Games to add reports for (top metacritic without existing reports)
const NEW_GAMES = [
  { id: '3c83577f-5122-4dc2-8860-3725f3d97fd9', name: 'Dishonored', weight: 'medium' },
  { id: '4d4de8ea-dfae-4471-9bb0-300f552cfd8a', name: 'Chained Echoes', weight: 'light' },
  { id: '0478911c-b385-42d0-9298-f59d09a470b4', name: 'Ghost Trick', weight: 'light' },
  { id: '125de3e8-717c-4d49-8f23-ca66cf4041e9', name: 'Braid', weight: 'light' },
  { id: '25e93362-91c7-4147-aa5f-d31ed72c7b96', name: 'Deus Ex GOTY', weight: 'light' },
  { id: '29b2d6cf-79b1-4346-a070-07e9e0930fe7', name: 'Total War: SHOGUN 2', weight: 'heavy' },
  { id: '2ab4a37b-3fe9-421b-986e-3c669b229761', name: 'Into the Breach', weight: 'light' },
  { id: '315921ab-e5a8-4da8-a523-ef1c7cebb322', name: 'ANIMAL WELL', weight: 'light' },
  { id: '4350c7e4-4617-4629-a1f8-a4e041ea472d', name: 'Chicory', weight: 'light' },
  { id: '49c0b2e0-5110-4ef9-b9be-2144e9310831', name: 'Opus Magnum', weight: 'light' },
  { id: '680f606e-714c-4b86-9da9-00b43f64376b', name: 'God of War Ragnarok', weight: 'heavy' },
  { id: '85d167dd-d48d-44f6-b5aa-7448abcbe7d5', name: 'SMT V Vengeance', weight: 'medium' },
  { id: '8f51dc7c-cc55-4c7f-8bdf-b033b01296ba', name: 'Balatro', weight: 'light' },
  { id: '9638f42d-16b8-4f9e-93dd-616dcc5e48b5', name: 'Half-Life 2: EP2', weight: 'light' },
  { id: 'b2e3c36f-5706-4f0a-8003-b154637eea12', name: 'Portal', weight: 'light' },
  { id: 'bf33a42c-53b9-4e3c-86af-36e902dbd092', name: 'GTA IV', weight: 'heavy' },
  { id: 'c6384113-9098-4c9c-890b-b54eb7e3f0f4', name: 'Dota 2', weight: 'medium' },
  { id: 'cc286919-c01e-4373-a04f-8d9e3d67726f', name: 'Bayonetta', weight: 'medium' },
  { id: 'd4959f6a-d766-4a7e-bf87-179abad350de', name: 'DAVE THE DIVER', weight: 'light' },
  { id: 'e8068abc-e0ec-4aca-b439-dd53bef97114', name: 'Spelunky', weight: 'light' },
  { id: 'ea746599-2ea5-4605-b848-df8b09401b44', name: 'Factorio', weight: 'medium' },
  { id: 'eb2725f9-b13d-4630-93a6-f19410fc5fa8', name: 'Civilization V', weight: 'medium' },
  { id: '4c94e587-fd33-41d4-a033-3c58141a31d7', name: 'World of Goo', weight: 'light' },
  { id: 'eab8741d-9950-4e29-af86-0016b40f18a2', name: 'Brothers: Two Sons', weight: 'light' },
  { id: 'd07d30c2-1212-4a6b-ae0a-9ad65b52f061', name: 'Total War: EMPIRE', weight: 'heavy' },
];

// Seed Users
const SEED_USERS = [
  { displayName: 'Marcus R.',     username: 'marcusr',       points: 380, level: 'expert',      verified: true,  device: DEVICES.deck },
  { displayName: 'DeckWarrior',   username: 'deckwarrior',   points: 310, level: 'contributor', verified: true,  device: DEVICES.deck },
  { displayName: 'HannahPlays',   username: 'hannahplays',   points: 270, level: 'contributor', verified: true,  device: DEVICES.allyX },
  { displayName: 'tinkerfox',     username: 'tinkerfox',     points: 250, level: 'contributor', verified: false, device: DEVICES.deck },
  { displayName: 'NeonByte',      username: 'neonbyte',      points: 220, level: 'contributor', verified: true,  device: DEVICES.ally },
  { displayName: 'Jake',          username: 'jakegames',     points: 180, level: 'tester',      verified: false, device: DEVICES.deck },
  { displayName: 'portablePete',  username: 'portablepete',  points: 160, level: 'tester',      verified: false, device: DEVICES.allyX },
  { displayName: 'Sora',          username: null,            points: 150, level: 'tester',      verified: false, device: DEVICES.deck },
  { displayName: 'Ali K.',        username: 'alik',          points: 140, level: 'tester',      verified: false, device: DEVICES.legion },
  { displayName: 'retrogamer99',  username: 'retrogamer99',  points: 130, level: 'tester',      verified: false, device: DEVICES.deck },
  { displayName: 'Mika',          username: null,            points: 120, level: 'tester',      verified: false, device: DEVICES.allyX },
  { displayName: 'ChrisB',        username: 'chrisb_gaming', points: 115, level: 'tester',      verified: false, device: DEVICES.deck },
  { displayName: 'volthandler',   username: 'volthandler',   points: 105, level: 'tester',      verified: false, device: DEVICES.ally },
  { displayName: 'Sam W.',        username: null,            points: 100, level: 'tester',      verified: false, device: DEVICES.deck },
  { displayName: 'Kira',          username: 'kiraondecks',   points: 95,  level: 'tester',      verified: false, device: DEVICES.deck },
  { displayName: 'Lucas',         username: null,            points: 80,  level: 'tester',      verified: false, device: DEVICES.allyX },
  { displayName: 'devicelab',     username: 'devicelab',     points: 75,  level: 'tester',      verified: false, device: DEVICES.legion },
  { displayName: 'Ren',           username: null,            points: 65,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'pixelPusher',   username: 'pixelpusher',   points: 60,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'Tom G.',        username: null,            points: 55,  level: 'new_tester',  verified: false, device: DEVICES.ally },
  { displayName: 'quietgamer',    username: 'quietgamer',    points: 50,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'DejaVu',        username: null,            points: 45,  level: 'new_tester',  verified: false, device: DEVICES.allyX },
  { displayName: 'Finn',          username: null,            points: 40,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'emilydecks',    username: 'emilydecks',    points: 38,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'KaiOS',         username: null,            points: 35,  level: 'new_tester',  verified: false, device: DEVICES.legion },
  { displayName: 'goFigure',      username: null,            points: 30,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'Naomi',         username: null,            points: 25,  level: 'new_tester',  verified: false, device: DEVICES.allyX },
  { displayName: 'joystickjoe',   username: 'joystickjoe',   points: 22,  level: 'new_tester',  verified: false, device: DEVICES.ally },
  { displayName: 'Ash',           username: null,            points: 20,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'blueMango',     username: null,            points: 18,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'Pavel',         username: null,            points: 15,  level: 'new_tester',  verified: false, device: DEVICES.legion },
  { displayName: 'SteamFan42',    username: 'steamfan42',    points: 14,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'Dana',          username: null,            points: 12,  level: 'new_tester',  verified: false, device: DEVICES.allyX },
  { displayName: 'onemorething',  username: null,            points: 10,  level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'Leo T.',        username: null,            points: 8,   level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'rxndom',        username: 'rxndom',        points: 7,   level: 'new_tester',  verified: false, device: DEVICES.ally },
  { displayName: 'Jade',          username: null,            points: 6,   level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'ctrl_alt_game', username: 'ctrlaltgame',   points: 5,   level: 'new_tester',  verified: false, device: DEVICES.allyX },
  { displayName: 'Oscar',         username: null,            points: 4,   level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'wanderlust',    username: null,            points: 3,   level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'Riley',         username: null,            points: 2,   level: 'new_tester',  verified: false, device: DEVICES.legion },
  { displayName: 'NovaDeck',      username: null,            points: 2,   level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'Andy S.',       username: null,            points: 1,   level: 'new_tester',  verified: false, device: DEVICES.allyX },
  { displayName: 'mikrodawg',     username: 'mikrodawg',     points: 1,   level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'elliot',        username: null,            points: 0,   level: 'new_tester',  verified: false, device: DEVICES.ally },
  { displayName: 'Zara',          username: null,            points: 0,   level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'benchking',     username: 'benchking',     points: 0,   level: 'new_tester',  verified: false, device: DEVICES.deck },
  { displayName: 'Yuki',          username: null,            points: 0,   level: 'new_tester',  verified: false, device: DEVICES.allyX },
  { displayName: 'lastpixel',     username: null,            points: 0,   level: 'new_tester',  verified: false, device: DEVICES.deck },
];

// Note templates
const NOTES_EXCELLENT = [
  (r: any) => `Runs perfectly at ${r.preset}. Locked ${r.fps_avg} with no drops.`,
  (r: any) => `Silky smooth. ${r.preset} preset, no issues at all. Love this on handheld.`,
  (r: any) => `${r.fps_avg}fps solid the whole time. ${r.tdp_limit_watts}W TDP.`,
  (r: any) => `Flawless. Played for 2 hours straight, zero stutters.`,
  (r: any) => `Great port. Hits ${r.fps_avg}fps easily at ${r.preset}. Fan stays quiet too.`,
  (r: any) => `Perfect handheld game. Runs at ${r.fps_avg}fps no problem.`,
  (r: any) => `Honestly surprised how well this runs. ${r.preset} preset, completely stable.`,
  (r: any) => `Native res, ${r.preset} preset, rock solid ${r.fps_avg}fps. Couldn't ask for more.`,
  (r: any) => `One of the best performers. TDP at ${r.tdp_limit_watts}W and still buttery.`,
  (r: any) => `${r.fps_avg}fps at ${r.preset}. This is what handheld gaming should be.`,
  (r: any) => `No complaints. Smooth ${r.fps_avg}fps throughout. Great on the go.`,
  (r: any) => `Locked ${r.fps_avg} the whole session. ${r.preset} looks great on this screen.`,
  (r: any) => `Absolutely solid. Been my go-to game for commute sessions.`,
  (r: any) => `Stable ${r.fps_avg}fps, fan barely spins up. Perfect for bed gaming.`,
  (r: any) => `Maxed out and still ${r.fps_avg}fps. This game is well optimized.`,
];

const NOTES_GOOD = [
  (r: any) => `Mostly solid ${r.fps_avg}fps. Occasional dips in busy scenes but totally playable.`,
  (r: any) => `${r.preset} preset works well. Some drops to ${r.fps_low ?? r.fps_avg - 10}fps in cutscenes.`,
  (r: any) => `Good experience overall. Had to cap TDP at ${r.tdp_limit_watts}W for battery.`,
  (r: any) => `Plays great. Minor hitches during area transitions but fps holds mostly.`,
  (r: any) => `Solid. Not perfect but very enjoyable on handheld. ${r.preset} preset recommended.`,
  (r: any) => `${r.fps_avg}fps average. Dips during loading but gameplay is smooth.`,
  (r: any) => `Good. FSR helps a lot here. Without it you lose about 10fps.`,
  (r: any) => `Runs well at ${r.preset}. Fan gets a bit loud on demanding areas.`,
  (r: any) => `Comfortable ${r.fps_avg}fps most of the time. Occasionally drops but nothing bad.`,
  (r: any) => `Works well. TDP capped at ${r.tdp_limit_watts}W, battery lasts around ${r.battery_life_hours ?? '3'}h.`,
  (r: any) => `Enjoying this one. ${r.fps_avg}fps with the occasional hitch. Worth it.`,
  (r: any) => `${r.preset} is the sweet spot. Looks decent and runs at ${r.fps_avg}fps.`,
  (r: any) => `Gets a bit warm during longer sessions but performance stays solid.`,
  (r: any) => `Had to lower shadows to get stable ${r.fps_avg}fps but looks fine overall.`,
  (r: any) => `About ${r.fps_avg}fps average. Not locked but consistent enough to enjoy.`,
];

const NOTES_FAIR = [
  (r: any) => `Playable but not great. ${r.fps_avg}fps at ${r.preset}, drops lower in combat.`,
  (r: any) => `Had to drop to ${r.preset} to get stable ${r.fps_avg}fps. Looks rough but runs ok.`,
  (r: any) => `It works but needs compromises. FSR on performance mode helps.`,
  (r: any) => `${r.fps_avg}fps with frequent dips. Open world sections are rough.`,
  (r: any) => `Just barely playable. ${r.preset} preset at ${r.resolution}. Not ideal.`,
  (r: any) => `Manageable at ${r.fps_avg}fps. Needs lower settings than I'd like.`,
  (r: any) => `OK experience. Battery drains fast at ${r.tdp_limit_watts}W. About ${r.battery_life_hours ?? '2'}h.`,
  (r: any) => `Needs work. ${r.fps_avg}fps average but lots of frame pacing issues.`,
  (r: any) => `Can play it but wouldn't recommend for long sessions. Gets hot.`,
  (r: any) => `30fps target with drops to ${r.fps_low ?? 20}. Tolerable but not great.`,
];

const NOTES_POOR = [
  (r: any) => `Struggled at ${r.fps_avg}fps even on ${r.preset}. Not great on this device.`,
  (r: any) => `${r.fps_avg}fps with constant drops. Barely playable in action scenes.`,
  (r: any) => `Really rough. Even at lowest settings it can't hold 30fps.`,
  (r: any) => `Not recommended for handheld. ${r.fps_avg}fps at ${r.preset} with major stutters.`,
  (r: any) => `Poor performance. Fan goes crazy and still only ${r.fps_avg}fps.`,
  (r: any) => `Game needs more optimization. ${r.fps_avg}fps at ${r.preset}, frequent crashes too.`,
  (r: any) => `Was hoping for better. ${r.fps_avg}fps even after tweaking everything.`,
  (r: any) => `Installed, tested for 20 min, uninstalled. Not ready for handhelds.`,
];

const NOTES_UNPLAYABLE = [
  (r: any) => `Couldn't get above ${r.fps_avg}fps. Unplayable slideshow.`,
  (r: any) => `Don't bother. ${r.fps_avg}fps at lowest settings. Complete mess.`,
  (r: any) => `${r.fps_avg}fps, constant freezing. Crashed 3 times in 20 minutes.`,
  (r: any) => `Nope. Not ready for handheld. Maybe wait for patches.`,
  (r: any) => `Sub-${r.fps_avg}fps at every preset. Not worth the battery drain.`,
];

const NOTE_MAP: Record<string, Array<(r: any) => string>> = {
  excellent: NOTES_EXCELLENT,
  good: NOTES_GOOD,
  fair: NOTES_FAIR,
  poor: NOTES_POOR,
  unplayable: NOTES_UNPLAYABLE,
};

// Helpers
function rng(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomDate(startDaysAgo: number, endDaysAgo: number): string {
  const now = Date.now();
  const start = now - startDaysAgo * 86400000;
  const end = now - endDaysAgo * 86400000;
  return new Date(start + Math.random() * (end - start)).toISOString();
}

function generateNote(report: any): string {
  const templates = NOTE_MAP[report.overall_rating] ?? NOTES_GOOD;
  return pick(templates)(report);
}

function ratingForFps(fps: number): string {
  if (fps >= 55) return 'excellent';
  if (fps >= 40) return 'good';
  if (fps >= 28) return 'fair';
  if (fps >= 18) return 'poor';
  return 'unplayable';
}

function fpsForWeight(weight: string, deviceId: string) {
  const isDeck = deviceId === DEVICES.deck;
  const isAllyX = deviceId === DEVICES.allyX;
  const spec = DEVICE_SPECS[deviceId];

  if (weight === 'light') {
    const fps = rng(58, 90);
    return { fps, low: fps - rng(3, 8), preset: pick(['high', 'ultra', 'medium']), fsr: false, fsrMode: null as string | null, tdp: rng(spec.tdpMin, Math.round(spec.tdpMax * 0.6)) };
  }
  if (weight === 'medium') {
    if (isDeck) {
      const fps = rng(32, 52);
      return { fps, low: fps - rng(5, 12), preset: pick(['medium', 'low', 'high']), fsr: Math.random() > 0.4, fsrMode: pick(['balanced', 'quality']) as string | null, tdp: rng(10, 15) };
    }
    if (isAllyX) {
      const fps = rng(45, 65);
      return { fps, low: fps - rng(5, 10), preset: pick(['medium', 'high']), fsr: Math.random() > 0.5, fsrMode: pick(['quality', 'balanced']) as string | null, tdp: rng(15, 25) };
    }
    const fps = rng(38, 58);
    return { fps, low: fps - rng(5, 12), preset: pick(['medium', 'low', 'high']), fsr: Math.random() > 0.5, fsrMode: pick(['balanced', 'quality']) as string | null, tdp: rng(12, 25) };
  }
  // heavy
  if (isDeck) {
    const fps = rng(22, 38);
    return { fps, low: fps - rng(6, 14), preset: pick(['low', 'ultra_low', 'medium']), fsr: true, fsrMode: pick(['performance', 'balanced']) as string | null, tdp: rng(12, 15) };
  }
  if (isAllyX) {
    const fps = rng(35, 55);
    return { fps, low: fps - rng(5, 12), preset: pick(['medium', 'high', 'low']), fsr: Math.random() > 0.3, fsrMode: pick(['balanced', 'performance']) as string | null, tdp: rng(20, 30) };
  }
  const fps = rng(28, 48);
  return { fps, low: fps - rng(6, 14), preset: pick(['low', 'medium']), fsr: Math.random() > 0.3, fsrMode: pick(['performance', 'balanced']) as string | null, tdp: rng(15, 30) };
}

// Main
async function main() {
  console.log('=== HandheldDB Community Seeder ===\n');

  // Step 1: Create users
  console.log('Step 1: Creating users...');
  const userInserts = SEED_USERS.map((u, i) => ({
    display_name: u.displayName,
    username: u.username,
    points: u.points,
    level: u.level,
    is_verified_tester: u.verified,
    is_admin: false,
    is_moderator: false,
    is_banned: false,
    primary_device_id: u.device,
    created_at: randomDate(60, 5 + Math.floor(i / 3)),
    last_active_at: randomDate(14, 0),
  }));

  const { data: createdUsers, error: userErr } = await sb
    .from('users')
    .insert(userInserts)
    .select('id, display_name, points');

  if (userErr) { console.error('User insert error:', userErr); return; }
  console.log(`  Created ${createdUsers!.length} users`);

  // Build weighted user list
  const allUsers = [
    { id: JUNO_ID, points: 500 },
    ...createdUsers!.map((u: any) => ({ id: u.id, points: u.points })),
  ];

  const totalWeight = allUsers.reduce((s, u) => s + u.points + 5, 0);
  function weightedUser(): string {
    let r = Math.random() * totalWeight;
    for (const u of allUsers) {
      r -= (u.points + 5);
      if (r <= 0) return u.id;
    }
    return allUsers[allUsers.length - 1].id;
  }

  // Step 2: Reassign existing reports
  console.log('\nStep 2: Reassigning existing reports...');

  const { data: allReports, error: repErr } = await sb
    .from('performance_reports')
    .select('id, fps_avg, fps_low, overall_rating, preset, resolution, tdp_limit_watts, battery_life_hours, fps_target, device_id, notes')
    .order('created_at', { ascending: true });

  if (repErr) { console.error('Report fetch error:', repErr); return; }
  console.log(`  Found ${allReports!.length} reports to reassign`);

  let updatedCount = 0;
  for (let i = 0; i < allReports!.length; i++) {
    const report = allReports![i];
    const userId = weightedUser();
    const note = generateNote(report);
    const createdAt = randomDate(45, 1);

    const { error } = await sb.from('performance_reports')
      .update({
        user_id: userId,
        notes: note,
        quality_tier: 'reported',
        source: 'manual',
        created_at: createdAt,
      })
      .eq('id', report.id);

    if (!error) updatedCount++;
    if ((i + 1) % 100 === 0) console.log(`  Progress: ${i + 1}/${allReports!.length}`);
  }
  console.log(`  Reassigned ${updatedCount} reports`);

  // Step 3: Add new reports
  console.log('\nStep 3: Adding new reports...');
  const deviceIds = Object.values(DEVICES);
  const newReports: any[] = [];

  for (const game of NEW_GAMES) {
    const numReports = rng(3, 6);
    const usedDevices = new Set<string>();
    const usedUsers = new Set<string>();

    for (let j = 0; j < numReports; j++) {
      let deviceId = pick(deviceIds);
      let attempts = 0;
      while (usedDevices.has(deviceId) && usedDevices.size < 4 && attempts < 8) {
        deviceId = pick(deviceIds);
        attempts++;
      }
      usedDevices.add(deviceId);

      let userId = weightedUser();
      attempts = 0;
      while (usedUsers.has(userId) && attempts < 10) {
        userId = weightedUser();
        attempts++;
      }
      usedUsers.add(userId);

      const spec = DEVICE_SPECS[deviceId];
      const perf = fpsForWeight(game.weight, deviceId);
      const rating = ratingForFps(perf.fps);
      const battery = +(spec.battWh / perf.tdp).toFixed(1);
      const thermal = perf.tdp > spec.tdpMax * 0.7 ? 'hot' : perf.tdp > spec.tdpMax * 0.4 ? 'warm' : 'cool';
      const fanNoise = thermal === 'hot' ? pick(['audible', 'loud']) : thermal === 'warm' ? pick(['quiet', 'audible']) : pick(['silent', 'quiet']);
      const stability = perf.fps >= 50 ? pick(['stable', 'mostly_stable']) : pick(['mostly_stable', 'unstable']);

      const reportData: any = {
        game_id: game.id,
        device_id: deviceId,
        user_id: userId,
        fps_avg: perf.fps,
        fps_low: Math.max(perf.low, 5),
        fps_target: perf.fps >= 55 ? '60' : perf.fps >= 35 ? '40' : '30',
        fps_stability: stability,
        resolution: spec.res,
        preset: perf.preset,
        fsr_enabled: perf.fsr,
        fsr_mode: perf.fsr ? perf.fsrMode : null,
        tdp_limit_watts: perf.tdp,
        battery_life_hours: battery,
        thermal,
        fan_noise: fanNoise,
        controller_status: 'works_oob',
        anticheat_status: 'not_applicable',
        suspend_status: pick(['works', 'works', 'works', 'issues']),
        overall_rating: rating,
        quality_tier: 'reported',
        moderation_status: 'approved',
        source: 'manual',
        notes: '',
        os_version: deviceId === DEVICES.deck ? pick(['SteamOS 3.5', 'SteamOS 3.6']) : pick(['Windows 11 23H2', 'Windows 11 24H2']),
        proton_version: deviceId === DEVICES.deck ? pick(['Proton 9.0', 'Proton-GE 9.2', 'Proton Experimental', 'Proton 8.0']) : null,
        created_at: randomDate(30, 0),
      };
      reportData.notes = generateNote(reportData);
      newReports.push(reportData);
    }
  }

  const { data: inserted, error: insertErr } = await sb
    .from('performance_reports')
    .insert(newReports)
    .select('id');

  if (insertErr) { console.error('New report insert error:', insertErr); return; }
  console.log(`  Added ${inserted!.length} new reports across ${NEW_GAMES.length} games`);

  // Step 4: Add votes
  console.log('\nStep 4: Adding votes...');

  const { data: goodReports } = await sb.from('performance_reports')
    .select('id')
    .in('overall_rating', ['excellent', 'good'])
    .eq('moderation_status', 'approved')
    .limit(200);

  const voteInserts: any[] = [];
  const voteSet = new Set<string>();
  const seedUserIds = createdUsers!.map((u: any) => u.id);

  for (let i = 0; i < 180; i++) {
    const reportId = pick(goodReports ?? [])?.id;
    const voterId = pick(seedUserIds);
    if (!reportId) continue;
    const key = `${reportId}-${voterId}`;
    if (voteSet.has(key)) continue;
    voteSet.add(key);
    voteInserts.push({ report_id: reportId, user_id: voterId, is_upvote: Math.random() > 0.1 });
  }

  if (voteInserts.length > 0) {
    const { error: voteErr } = await sb.from('report_votes').insert(voteInserts);
    if (voteErr) console.error('Vote insert error:', voteErr);
    else console.log(`  Added ${voteInserts.length} votes`);

    // Update counts
    const upCounts = new Map<string, number>();
    const dnCounts = new Map<string, number>();
    for (const v of voteInserts) {
      if (v.is_upvote) upCounts.set(v.report_id, (upCounts.get(v.report_id) ?? 0) + 1);
      else dnCounts.set(v.report_id, (dnCounts.get(v.report_id) ?? 0) + 1);
    }
    for (const [rid, count] of upCounts) {
      await sb.from('performance_reports').update({ upvotes: count }).eq('id', rid);
    }
    for (const [rid, count] of dnCounts) {
      await sb.from('performance_reports').update({ downvotes: count }).eq('id', rid);
    }
  }

  // Step 5: Game follows
  console.log('\nStep 5: Adding game follows...');

  const { data: popularGames } = await sb.from('games')
    .select('id')
    .not('metacritic_score', 'is', null)
    .order('metacritic_score', { ascending: false })
    .limit(30);

  const followInserts: any[] = [];
  const followSet = new Set<string>();

  for (let i = 0; i < 45; i++) {
    const gameId = pick(popularGames ?? [])?.id;
    const userId = pick(seedUserIds);
    if (!gameId) continue;
    const key = `${gameId}-${userId}`;
    if (followSet.has(key)) continue;
    followSet.add(key);
    followInserts.push({ game_id: gameId, user_id: userId });
  }

  if (followInserts.length > 0) {
    const { error: followErr } = await sb.from('game_follows').insert(followInserts);
    if (followErr) console.error('Follow insert error:', followErr);
    else console.log(`  Added ${followInserts.length} game follows`);
  }

  // Summary
  console.log('\n=== Summary ===');
  const { count: totalUsers } = await sb.from('users').select('*', { count: 'exact', head: true });
  const { count: totalReports } = await sb.from('performance_reports').select('*', { count: 'exact', head: true });
  const { data: uniqAuth } = await sb.from('performance_reports').select('user_id');
  const authorSet = new Set(uniqAuth?.map((r: any) => r.user_id).filter(Boolean));

  console.log(`  Users: ${totalUsers}`);
  console.log(`  Reports: ${totalReports}`);
  console.log(`  Unique authors: ${authorSet.size}`);
  console.log('\nDone! Run consensus: npx tsx scripts/cron-consensus.ts');
}

main().catch(console.error);
