import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// Realistic comment templates per game vibe
const gameComments: Record<string, string[]> = {
  'baldurs-gate-3': [
    "Runs great on Deck OLED at 40fps lock. Battery lasts about 2 hours which is fine for turn-based sections.",
    "Had to lower shadows to medium but otherwise solid 35-40fps. The text is readable on the small screen which surprised me.",
    "This is my go-to portable game right now. Act 3 drops frames a bit but Acts 1-2 are smooth.",
    "FSR on quality mode + 30fps lock = ~3hr battery. Perfect for bed gaming.",
    "Anyone else getting microstutters in the underdark? Main areas are fine though.",
    "Pro tip: turn off dynamic resolution scaling. Fixed res at 720p with FSR looks better.",
    "Played through the entire game on Deck. 160 hours. Only crashed twice. Larian did great with the Deck support.",
  ],
  'elden-ring': [
    "Solid 40fps with the TDP at 12W. FromSoft finally fixed the stuttering.",
    "Runs surprisingly well now after the patches. Liurnia still dips to low 30s but everywhere else is 40+.",
    "Best souls game on handheld imo. The controls feel great with the Deck layout.",
    "DLC areas are more demanding. Had to drop to 30fps lock for some bosses.",
    "Lock to 40fps, medium settings, TDP 11W. Chef's kiss.",
    "Shader compilation stutters are mostly gone now. Much better than launch.",
  ],
  'portal-2': [
    "Locked 60fps no issues. This game is perfect for portables.",
    "My kids play this on the Deck all the time. Runs flawlessly.",
    "Buttery smooth even at low TDP. Great battery life too.",
    "One of the best Deck experiences out there. Native Linux too.",
    "Source engine just works. 60fps, hours of battery, no fuss.",
  ],
  'half-life-2': [
    "Literally runs on anything. 60fps locked with room to spare.",
    "Replaying this on the Deck feels like the future Valve imagined.",
    "Source engine masterpiece. Runs at 60fps with amazing battery life.",
    "Even at 7W TDP this stays locked at 60. Incredible optimization.",
  ],
  'bioshock': [
    "Proton handles this well. Locked 60 no problem.",
    "Runs great. Only issue is the controls feel a bit dated but that's not a Deck problem.",
    "Solid port through Proton. Consistent 60fps throughout.",
  ],
  'skyrim': [
    "Still playing Skyrim in 2026. Runs amazing on Deck at 60fps with mods.",
    "Medium-high settings, 40fps lock, ~3hr battery. Skyrim is perfect for portable.",
    "Modded to the gills and still holds 40fps. The Deck is basically a dedicated Skyrim machine at this point.",
    "If you played this 1000 hours on PC, the Deck version feels like coming home.",
    "Toggle TDP between 9-12W depending on location. Cities need more juice.",
  ],
  'disco-elysium-the-final-cut': [
    "Perfect handheld game. Text-heavy means you're not missing action at 30fps.",
    "Runs at 60fps no problem. Reads beautifully on the OLED screen.",
    "One of the best games to play on Deck. The OLED makes the art pop.",
    "Just started this. Performance is flawless, controls work well with trackpad for the point-and-click stuff.",
  ],
  'cyberpunk-2077': [
    "After 2.0 it runs surprisingly well. 30fps locked with FSR on balanced.",
    "The Steam Deck preset they added works great. Playable 30fps with decent visuals.",
    "Don't expect 60fps but 30fps is stable and the game is incredible on a handheld.",
    "FSR + 30fps lock + 15W TDP. Playable and looks ok for a handheld.",
    "Night City on an OLED handheld is something else. Worth the 30fps tradeoff.",
    "Phantom Liberty tanks performance a bit. Main game runs better.",
  ],
  'stardew-valley': [
    "60fps, amazing battery life, perfect Deck game. No notes.",
    "My most played game on Deck. Runs forever on a charge.",
    "This is THE handheld game. Controller works great, battery lasts 6+ hours.",
    "The multiplayer works great over wifi too. My wife and I play co-op on our Decks.",
  ],
  'hollow-knight': [
    "Locked 60fps, native Linux, incredible on OLED. One of the best Deck experiences.",
    "Silksong when? In the meantime this is perfect on Deck.",
    "Beautiful on OLED. Runs at 60fps with great battery life.",
    "Native Linux game, no Proton needed. Runs flawlessly.",
  ],
  'hades': [
    "Perfect Deck game. 60fps locked, great controls, runs forever on battery.",
    "This was made for handhelds honestly. Everything works perfectly.",
    "Native Linux, 60fps, 5+ hours battery. Best rogue-like on Deck.",
    "Supergiant games just work on Deck. This one especially.",
  ],
  'vampire-survivors': [
    "60fps even with 50000 things on screen. Magic.",
    "This game was born for handhelds. Battery lasts like 5 hours.",
    "My guilty pleasure on Deck. Runs perfect, obviously.",
  ],
  'dead-cells': [
    "Buttery 60fps. One of the best action games on Deck.",
    "Native Linux, perfect performance. The controls feel great on Deck.",
    "Can't stop playing this on Deck. Runs at 60fps with no effort.",
  ],
  'celeste': [
    "60fps locked. Perfect precision platformer on Deck.",
    "Runs flawlessly. One of those games that plays better on a handheld somehow.",
    "The D-pad works great for this. Locked 60, amazing battery.",
  ],
  'the-witcher-3-wild-hunt': [
    "The next-gen update runs at stable 30fps on Deck. Looks great on OLED.",
    "Lock to 40fps on medium settings. Some areas dip but generally solid.",
    "200 hours in and still running great. Best way to replay Witcher 3.",
    "TDP at 15W gives stable 30-35fps. Blood and Wine areas run smoother than the base game.",
    "FSR on quality, 30fps lock. Looks and runs great. 2.5hr battery though.",
  ],
  'red-dead-redemption-2': [
    "30fps is the target. Gets there most of the time with FSR balanced.",
    "Surprisingly playable on Deck. Not the best looking but the story is amazing portable.",
    "Heavy game but doable at 30fps. Bring a charger for long sessions.",
    "One of those games where 30fps feels fine because it's so cinematic.",
  ],
  'doom-eternal': [
    "60fps with Vulkan. This game flies on the Deck.",
    "One of the best optimized games on Deck. Locked 60fps feels incredible.",
    "id Tech engine is magic. 60fps, good battery life, perfect controls.",
    "The gyro aiming makes this even better than controller on a TV imo.",
  ],
  'mass-effect-2-2010-edition': [
    "Runs perfectly through Proton. 60fps no issues.",
    "Great way to replay the trilogy. Solid performance across all three games.",
    "Mass Effect on a handheld. What a time to be alive. Runs flawlessly.",
  ],
  'divinity-original-sin-enhanced-edition': [
    "Great on Deck with the trackpad for tactical combat. 60fps stable.",
    "Larian games and the Deck are a perfect match. Runs great.",
    "Turn-based combat is ideal for handheld. Performance is solid throughout.",
  ],
  'bioshock-infinite': [
    "Runs at 60fps with medium-high settings. Proton handles it well.",
    "Beautiful game that looks great on OLED. Locked 60.",
    "Columbia in your hands. Runs perfectly on Deck.",
  ],
};

// Reply templates (generic, for threading)
const replyTemplates = [
  "Agreed! Had the same experience.",
  "What TDP are you running at?",
  "Thanks for the tip, gonna try that tonight.",
  "Same here, really enjoying it on Deck.",
  "Have you tried lowering the resolution? Helped me a lot.",
  "Which Proton version are you using?",
  "Good to know. Just picked this up on sale.",
  "Nice, I was on the fence about buying this for Deck.",
  "Can confirm, works great.",
  "I get similar numbers. Great game for portable.",
];

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

function randomDate(daysBack: number): string {
  const now = Date.now();
  const offset = Math.random() * daysBack * 24 * 60 * 60 * 1000;
  return new Date(now - offset).toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  // Fetch games
  const slugs = Object.keys(gameComments);
  const { data: games } = await sb.from('games').select('id, name, slug').in('slug', slugs);
  if (!games?.length) { console.error('No games found'); return; }

  const gameMap = new Map(games.map(g => [g.slug, g]));
  console.log(`Found ${games.length} games`);

  // Fetch users (exclude Juno — real user)
  const { data: users } = await sb.from('users').select('id, display_name').neq('display_name', 'Juno');
  if (!users?.length) { console.error('No users found'); return; }
  console.log(`Found ${users.length} seed users`);

  const comments: {
    game_id: string;
    user_id: string;
    parent_id: string | null;
    depth: number;
    body: string;
    body_html: string;
    upvotes: number;
    downvotes: number;
    is_edited: boolean;
    is_deleted: boolean;
    is_flagged: boolean;
    created_at: string;
  }[] = [];

  // Track which parent IDs we'll insert (for replies)
  const pendingParents: { idx: number; slug: string }[] = [];

  // Generate top-level comments for each game
  for (const [slug, templates] of Object.entries(gameComments)) {
    const game = gameMap.get(slug);
    if (!game) continue;

    // Pick 2-5 comments per game
    const numComments = Math.min(templates.length, 2 + Math.floor(Math.random() * 4));
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    const selectedComments = shuffled.slice(0, numComments);

    for (const body of selectedComments) {
      const user = pick(users);
      const upvotes = Math.random() < 0.6 ? Math.floor(Math.random() * 8) : 0;
      const downvotes = Math.random() < 0.1 ? 1 : 0;
      const created = randomDate(45); // Last 45 days

      comments.push({
        game_id: game.id,
        user_id: user.id,
        parent_id: null,
        depth: 0,
        body,
        body_html: escapeHtml(body),
        upvotes,
        downvotes,
        is_edited: Math.random() < 0.05,
        is_deleted: false,
        is_flagged: false,
        created_at: created,
      });

      // Maybe mark this for a reply
      if (Math.random() < 0.35) {
        pendingParents.push({ idx: comments.length - 1, slug });
      }
    }
  }

  console.log(`Generated ${comments.length} top-level comments`);

  // Insert top-level comments first
  const { data: inserted, error: insertError } = await sb
    .from('comments')
    .insert(comments)
    .select('id');

  if (insertError) {
    console.error('Insert error:', insertError);
    return;
  }

  console.log(`Inserted ${inserted?.length} comments`);

  // Now add replies to some comments
  const replies: typeof comments = [];
  for (const pp of pendingParents) {
    if (!inserted?.[pp.idx]) continue;
    const parentId = inserted[pp.idx].id;
    const parentComment = comments[pp.idx];

    const replyBody = pick(replyTemplates);
    const replyUser = pick(users.filter(u => u.id !== parentComment.user_id));
    if (!replyUser) continue;

    // Reply should be after parent
    const parentDate = new Date(parentComment.created_at).getTime();
    const replyOffset = Math.random() * 3 * 24 * 60 * 60 * 1000; // 0-3 days later
    const replyDate = new Date(Math.min(parentDate + replyOffset, Date.now())).toISOString();

    replies.push({
      game_id: parentComment.game_id,
      user_id: replyUser.id,
      parent_id: parentId,
      depth: 1,
      body: replyBody,
      body_html: escapeHtml(replyBody),
      upvotes: Math.random() < 0.3 ? Math.floor(Math.random() * 4) : 0,
      downvotes: 0,
      is_edited: false,
      is_deleted: false,
      is_flagged: false,
      created_at: replyDate,
    });
  }

  if (replies.length > 0) {
    const { data: insertedReplies, error: replyError } = await sb
      .from('comments')
      .insert(replies)
      .select('id');

    if (replyError) {
      console.error('Reply insert error:', replyError);
    } else {
      console.log(`Inserted ${insertedReplies?.length} replies`);
    }
  }

  // Final count
  const { count } = await sb.from('comments').select('id', { count: 'exact', head: true });
  console.log(`\nTotal comments in database: ${count}`);
}

main().catch(console.error);
