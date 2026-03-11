/**
 * Cron: Import FPS benchmark data from YouTube performance test videos.
 *
 * Pipeline:
 *   1. Supadata YouTube Search — find "[device] [game] FPS test" videos
 *   2. Supadata Transcript — fetch auto-generated transcript for each video
 *   3. Claude Haiku — analyze transcript to extract FPS, TDP, settings, etc.
 *   4. Insert structured performance reports into DB
 *
 * Quality layers:
 *   Layer 1: Pre-filter videos by title (reject Switch/laptop/frame-gen/comparison)
 *   Layer 2: Claude prompt with strict rejection rules (no_data for non-handheld)
 *   Layer 3: Post-extraction validation (TDP limits, resolution, FPS sanity, enum checks)
 *
 * Trusted channels get quality_tier='imported' (weight 0.3 in consensus).
 * Other channels get quality_tier='ai_estimated' (weight 0.5).
 *
 * API budgets:
 *   - Supadata: 1000 requests/month (Pro $9/mo) — covers search + transcript
 *   - Claude Haiku: ~$0.01/call
 *   - YouTube Data API: NOT USED (Supadata search bypasses quota limits)
 *
 * Schedule: daily at 7:00 AM UTC
 * Usage: cd /home/ubuntu/handhelddb && npx tsx scripts/cron-youtube-import.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

if (!SUPADATA_API_KEY) { console.error('SUPADATA_API_KEY not set'); process.exit(1); }
if (!ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const MAX_SEARCHES_PER_RUN = parseInt(process.env.YT_MAX_SEARCHES ?? '12', 10);
const MAX_TRANSCRIPTS_PER_RUN = parseInt(process.env.YT_MAX_TRANSCRIPTS ?? '20', 10);
const DELAY_MS = 600;
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Game name normalization for YouTube search ───
function normalizeGameName(name: string): string {
  return name
    // Remove trademark/copyright symbols
    .replace(/[®™©]/g, '')
    .replace(/\(R\)/gi, '')
    .replace(/\(TM\)/gi, '')
    // Remove edition suffixes
    .replace(/\s*[-–—:]\s*(Game of the Year|GOTY|Definitive|Enhanced|Special|Complete|Ultimate|Legendary|Remastered|Director'?s?\s*Cut|Anniversary|Premium|Deluxe|Gold)\s*(Edition)?/gi, '')
    // Remove year in parens at end
    .replace(/\s*\(\d{4}\)\s*$/g, '')
    // Remove "Edition" standalone at end
    .replace(/\s+Edition\s*$/i, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── Trusted YouTube benchmark channels ───
const TRUSTED_CHANNELS: Record<string, string> = {
  'UCQkd05iAYed2-LOmhjzDG6g': 'ETA PRIME',
  'UCjFaPUcJU1I6k6n2loWs9Cg': 'The Phawx',
  'UCKUqbi36CbaGT33FPF-higg': 'Fan The Deck',
  'UCB-2fSSCJqR5AJQiYBB16KA': 'NerdNest',
  'UCH4d4o0Otqulhl7nFwlRUfA': 'Bald Tech',
  'UCp-TkHwP0J5gFpUSjDdqiQw': 'Deck Wizard',
  'UC_0CVCfC_3iuHqmyClu59Uw': 'ETA PRIME 2',
};

// Device search names → device slugs (ordered: most specific first)
const DEVICE_SEARCH_MAP: Array<{ searchTerms: string[]; slug: string }> = [
  { searchTerms: ['Steam Deck OLED', 'Deck OLED', 'Steam Deck LCD', 'Steam Deck'], slug: 'steam-deck-oled' },
  { searchTerms: ['ROG Ally X', 'Ally X'], slug: 'rog-ally-x' },
  { searchTerms: ['ROG Ally'], slug: 'rog-ally' },
  { searchTerms: ['Legion Go S', 'Legion Go S Stealth'], slug: 'legion-go-s' },
  { searchTerms: ['Legion Go'], slug: 'legion-go' },
  { searchTerms: ['MSI Claw 8 AI+', 'MSI Claw 8', 'MSI Claw'], slug: 'msi-claw-8-ai-plus' },
];

// ─── Supadata YouTube search (no YouTube API quota needed!) ───
interface SearchResult {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  duration: number; // seconds
}

async function supadataSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const params = new URLSearchParams({ query });
  const res = await fetch(`https://api.supadata.ai/v1/youtube/search?${params}`, {
    headers: { 'x-api-key': SUPADATA_API_KEY },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supadata search ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const results = (data.results ?? [])
    .filter((item: any) => item.type === 'video')
    .slice(0, maxResults)
    .map((item: any) => ({
      videoId: item.id as string,
      title: (item.title as string).replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
      description: (item.description ?? '') as string,
      channelId: item.channel?.id ?? '',
      channelTitle: item.channel?.name ?? '',
      duration: item.duration ?? 0,
    }));

  return results;
}

// ─── Supadata transcript ───
interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  const res = await fetch(
    `https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=${videoId}`,
    { headers: { 'x-api-key': SUPADATA_API_KEY } },
  );

  if (!res.ok) {
    if (res.status === 404 || res.status === 422) return null; // No transcript available
    const err = await res.text();
    throw new Error(`Supadata ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.content as TranscriptSegment[] | undefined;
  if (!content || content.length === 0) return null;

  // Join all segments into a single text string
  return content.map((s) => s.text).join(' ');
}

// ─── yt-dlp: Fetch full description + chapters (FREE, no API cost) ───
interface VideoMetadata {
  description: string;
  chapters: Array<{ title: string; start_time: number }>;
}

async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  try {
    const proc = Bun?.spawn ? null : null; // Use child_process
    const { execSync } = await import('child_process');
    const output = execSync(
      `yt-dlp --skip-download --no-warnings --print-json "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null`,
      { timeout: 15000, maxBuffer: 1024 * 1024 },
    ).toString();
    const data = JSON.parse(output);
    return {
      description: data.description ?? '',
      chapters: (data.chapters ?? []).map((c: any) => ({ title: c.title, start_time: c.start_time })),
    };
  } catch {
    return null;
  }
}

// ─── Extract FPS from description/chapters (no LLM, no transcript cost) ───
function extractFromDescription(
  description: string,
  chapters: Array<{ title: string; start_time: number }>,
  gameName: string,
): ExtractedReport | null {
  const text = description + '\n' + chapters.map(c => c.title).join('\n');
  const lower = text.toLowerCase();

  // Must mention a handheld device
  let deviceSlug: string | null = null;
  if (/steam\s*deck/i.test(text)) deviceSlug = 'steam-deck-oled';
  else if (/rog\s*ally\s*x/i.test(text)) deviceSlug = 'rog-ally-x';
  else if (/rog\s*ally/i.test(text)) deviceSlug = 'rog-ally';
  else if (/legion\s*go\s*s/i.test(text)) deviceSlug = 'legion-go-s';
  else if (/legion\s*go/i.test(text)) deviceSlug = 'legion-go';
  else if (/msi\s*claw/i.test(text)) deviceSlug = 'msi-claw-8-ai-plus';

  if (!deviceSlug) return null;

  // Extract FPS — look for patterns like "30fps", "30-35 fps", "avg 45fps", "averaging 40 fps"
  const fpsPatterns = [
    /(?:avg|average|averaging|locked|stable|steady)[\s:]*(\d{1,3})\s*fps/i,
    /(\d{1,3})\s*fps\s*(?:avg|average|stable|locked)/i,
    /(\d{1,3})\s*-\s*(\d{1,3})\s*fps/i,
    /(\d{1,3})\s*fps/i,
  ];

  let fpsAvg: number | null = null;
  let fpsLow: number | null = null;

  for (const pattern of fpsPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        // Range: "30-35 fps"
        fpsLow = parseInt(match[1]);
        fpsAvg = Math.round((parseInt(match[1]) + parseInt(match[2])) / 2);
      } else {
        fpsAvg = parseInt(match[1]);
      }
      break;
    }
  }

  if (!fpsAvg || fpsAvg < 5 || fpsAvg > 200) return null;

  // Extract TDP
  let tdpWatts: number | null = null;
  const tdpMatch = text.match(/(\d{1,2})\s*[wW](?:att)?(?:s)?\s*(?:TDP|tdp|limit)?/);
  if (tdpMatch) {
    const val = parseInt(tdpMatch[1]);
    if (val >= 3 && val <= 40) tdpWatts = val;
  }

  // Extract resolution
  let resolution: string | null = null;
  const resMatch = text.match(/(\d{3,4})\s*[xX×]\s*(\d{3,4})/);
  if (resMatch) resolution = `${resMatch[1]}x${resMatch[2]}`;

  // Extract preset
  let preset: string | null = null;
  if (/\bultra\b(?!\s*(?:low|performance))/i.test(lower)) preset = 'ultra';
  else if (/\bhigh\b/i.test(lower) && /setting|preset|quality/i.test(lower)) preset = 'high';
  else if (/\bmedium\b/i.test(lower) && /setting|preset|quality/i.test(lower)) preset = 'medium';
  else if (/\blow\b/i.test(lower) && /setting|preset|quality/i.test(lower)) preset = 'low';

  // FSR
  const fsrEnabled = /\bfsr\b|\bfidelity\s*fx/i.test(text);

  // Rating from FPS
  const overallRating = fpsAvg >= 55 ? 'excellent' : fpsAvg >= 40 ? 'good' : fpsAvg >= 30 ? 'fair' : fpsAvg >= 20 ? 'poor' : 'unplayable';

  return {
    device_slug: deviceSlug,
    fps_avg: fpsAvg,
    fps_low: fpsLow,
    resolution,
    preset,
    fsr_enabled: fsrEnabled,
    fsr_mode: null,
    tdp_watts: tdpWatts,
    battery_hours: null,
    thermal: null,
    fan_noise: null,
    overall_rating: overallRating,
    notes_summary: 'Extracted from video description/chapters',
    proton_version: null,
  };
}

// ─── Claude AI extraction ───
interface ExtractedReport {
  device_slug: string;
  fps_avg: number;
  fps_low: number | null;
  resolution: string | null;
  preset: string | null;
  fsr_enabled: boolean;
  fsr_mode: string | null;
  tdp_watts: number | null;
  battery_hours: number | null;
  thermal: string | null;
  fan_noise: string | null;
  overall_rating: string;
  notes_summary: string;
  proton_version: string | null;
}

const EXTRACT_SYSTEM_PROMPT = `You are a strict data extraction assistant for a handheld PC gaming performance database. Given a YouTube video transcript and title, extract ONLY concrete, explicitly-stated performance data for PC handheld gaming devices.

=== REJECT THE VIDEO (respond {"no_data": true}) IF: ===
- The video is about a NON-PC-handheld device: Nintendo Switch, PS5, Xbox, iPad, iPhone, any console
- The video is about a LAPTOP or DESKTOP (e.g. Legion 5/7/9, ThinkPad, any laptop, any desktop GPU like RTX 4070)
- The video uses Lossless Scaling, AFMF, or any frame generation tool (these artificially double FPS)
- The video tests a heavily modded game (50+ mods, "ultra modded", etc.) — not representative performance
- The video is a COMPARISON between multiple devices (e.g. "Steam Deck vs ROG Ally") — can't reliably extract per-device data
- The video is an unboxing, review without FPS data, or news segment
- The transcript does not contain ANY specific FPS numbers
- You cannot determine which PC handheld device is being used

=== EXTRACTION RULES: ===
- ONLY extract data that is EXPLICITLY STATED in the transcript. Never guess.
- FPS values must be specific numbers the creator mentions (e.g. "getting about 40 fps", "averaging 35")
- TDP must be explicitly mentioned (e.g. "set to 15 watts", "TDP at 12W", "maxed out the TDP")
  - Steam Deck "max TDP" = 15W. Any TDP above 15W for Deck is WRONG — reject as wrong device.
  - ROG Ally/X max TDP = 30W. Legion Go/Go S max = 30W. MSI Claw 8 AI+ max = 37W.
- Resolution must be explicitly stated ("1280 by 800", "native resolution", "720p")
  - Steam Deck "native" = 1280x800
  - ROG Ally/X "native" = 1920x1080
  - Legion Go "native" = 2560x1600
  - Legion Go S "native" = 1920x1200
  - MSI Claw 8 AI+ "native" = 1920x1200
- Preset must be explicitly mentioned ("low settings", "set to medium")
- thermal/fan_noise: ONLY if explicitly mentioned. Leave null otherwise.
- If multiple TDP configs shown, extract the PRIMARY one the creator recommends or spends most time on
- overall_rating: "excellent" (55+ fps stable), "good" (40-54 fps), "fair" (30-39 fps), "poor" (20-29 fps), "unplayable" (<20 fps)
- proton_version: Extract Proton/compatibility layer version if mentioned (e.g. "GE-Proton 9-11", "Proton Experimental", "Proton 8", "native Linux"). Set null if on Windows or not mentioned.

=== PC HANDHELD DEVICES (only these are valid): ===
steam-deck-oled (covers both LCD and OLED — same performance), rog-ally, rog-ally-x, legion-go, legion-go-s, msi-claw-8-ai-plus
NOTE: ROG Ally (16GB, Z1 Extreme) and ROG Ally X (24GB, ~40% faster) are DIFFERENT devices — distinguish them carefully from transcript context (mentions of "Ally X", "24 gig", etc.)
NOTE: Legion Go (AMD, 2560x1600) and Legion Go S (AMD, 1920x1200, smaller/lighter) are DIFFERENT — distinguish by mentions of "Go S", "smaller screen", or resolution context.
NOTE: MSI Claw 8 AI+ uses Intel Core Ultra — look for "MSI Claw", "Claw 8", "Intel handheld" context.

Respond with a single JSON object. If the video should be rejected or has insufficient data, respond: {"no_data": true}

{
  "device_slug": "steam-deck-oled" | "rog-ally" | "rog-ally-x" | "legion-go" | "legion-go-s" | "msi-claw-8-ai-plus",
  "fps_avg": 40,
  "fps_low": number | null,
  "resolution": "1280x800" | null,
  "preset": "ultra_low" | "low" | "medium" | "high" | "ultra" | "custom" | null,
  "fsr_enabled": false,
  "fsr_mode": "quality" | "balanced" | "performance" | "ultra_performance" | null,
  "tdp_watts": number | null,
  "battery_hours": number | null,
  "thermal": "cool" | "warm" | "hot" | null,
  "fan_noise": "silent" | "quiet" | "audible" | "loud" | null,
  "overall_rating": "excellent" | "good" | "fair" | "poor" | "unplayable",
  "notes_summary": "Brief 1-sentence summary of the key finding",
  "proton_version": "GE-Proton9-11" | null
}`;

async function extractWithClaude(
  videoTitle: string,
  transcript: string,
  gameName: string,
): Promise<ExtractedReport | null> {
  // Trim transcript — keep first 3000 + last 5000 chars (summary usually at end)
  let trimmedTranscript: string;
  if (transcript.length > 8000) {
    const head = transcript.slice(0, 3000);
    const tail = transcript.slice(-5000);
    trimmedTranscript = head + '\n\n... [middle section omitted] ...\n\n' + tail;
  } else {
    trimmedTranscript = transcript;
  }

  const userMessage = `Video title: "${videoTitle}"
Game being tested: ${gameName}

Transcript:
${trimmedTranscript}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (response.status === 429) {
    console.log('    Claude rate limited, waiting 10s...');
    await sleep(10000);
    return null;
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  let text: string = data.content?.[0]?.text ?? '';

  // Strip markdown fences
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Parse JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.no_data) return null;

  // Validate required fields
  if (!parsed.fps_avg || typeof parsed.fps_avg !== 'number') return null;
  if (parsed.fps_avg < 5 || parsed.fps_avg > 240) return null;

  return parsed as ExtractedReport;
}

// ─── Device detection from text (fallback) ───
function detectDevice(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { searchTerms, slug } of DEVICE_SEARCH_MAP) {
    for (const term of searchTerms) {
      if (lower.includes(term.toLowerCase())) return slug;
    }
  }
  return null;
}

// ─── QUALITY LAYER 1: Video pre-filter ───
// Reject videos that are clearly NOT handheld PC benchmarks before fetching transcript.
// This saves Supadata credits and prevents garbage data.
const VIDEO_REJECT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Non-PC platforms
  { pattern: /\bnintendo\s*switch\b/i, reason: 'Nintendo Switch video' },
  { pattern: /\bswitch\s*2\b/i, reason: 'Nintendo Switch 2 video' },
  { pattern: /\bswitch\s*oled\b/i, reason: 'Nintendo Switch OLED video' },
  { pattern: /\bipad\b/i, reason: 'iPad video' },
  { pattern: /\biphone\b/i, reason: 'iPhone video' },
  { pattern: /\bps5\b/i, reason: 'PS5 video' },
  { pattern: /\bplaystation\b/i, reason: 'PlayStation video' },
  { pattern: /\bxbox\b(?!.*\b(?:ally|rog)\b)/i, reason: 'Xbox video' },
  // Laptops/desktops (not handhelds)
  { pattern: /\blaptop\b/i, reason: 'Laptop video' },
  { pattern: /\bdesktop\b/i, reason: 'Desktop video' },
  { pattern: /\blegion\s*5\b/i, reason: 'Lenovo Legion 5 laptop' },
  { pattern: /\blegion\s*7\b/i, reason: 'Lenovo Legion 7 laptop' },
  { pattern: /\blegion\s*9\b/i, reason: 'Lenovo Legion 9 laptop' },
  { pattern: /\bthinkpad\b/i, reason: 'ThinkPad laptop' },
  { pattern: /\brtx\s*\d{4}\b/i, reason: 'Desktop/laptop GPU' },
  { pattern: /\bgtx\s*\d{4}\b/i, reason: 'Desktop/laptop GPU' },
  // Frame generation / upscaling trickery
  { pattern: /\blossless\s*scaling\b/i, reason: 'Lossless Scaling (artificial FPS)' },
  { pattern: /\bframe\s*gen(?:eration)?\b/i, reason: 'Frame generation (artificial FPS)' },
  { pattern: /\bafmf\b/i, reason: 'AMD Fluid Motion Frames' },
  { pattern: /\bdlss\s*frame\s*gen/i, reason: 'DLSS Frame Generation' },
  // Heavily modded games
  { pattern: /\bultra\s*modded\b/i, reason: 'Ultra modded game' },
  { pattern: /\b\d{2,3}\+?\s*mods\b/i, reason: 'Heavily modded game' },
  // Non-benchmark content
  { pattern: /\bunboxing\b/i, reason: 'Unboxing video, not benchmark' },
  { pattern: /\breview\b(?!.*\b(?:fps|performance|benchmark|test)\b)/i, reason: 'Review without benchmarks' },
  // Only reject "vs" when comparing devices, not settings (e.g. "medium vs low" is fine)
  { pattern: /\b(?:steam\s*deck|rog\s*ally|legion\s*go|msi\s*claw|switch)\s+vs\.?\s/i, reason: 'Device comparison video' },
  { pattern: /\bcomparison\b.*\b(?:device|handheld|console)/i, reason: 'Device comparison video' },
];

function preFilterVideo(title: string, description: string): { pass: boolean; reason?: string } {
  const combined = title + ' ' + description.slice(0, 500);

  for (const { pattern, reason } of VIDEO_REJECT_PATTERNS) {
    if (pattern.test(combined)) {
      // Exception: allow if title clearly mentions a PC handheld device
      const hasHandheld = /\b(steam\s*deck|rog\s*ally|legion\s*go(?!\s*[5-9])|ayaneo|gpd\s*win|msi\s*claw)\b/i.test(combined);
      // ALWAYS reject: comparison, laptop, frame gen (artificially inflated FPS), and desktop GPU videos
      if (reason.includes('Comparison') || reason.includes('multi-device')) return { pass: false, reason };
      if (reason.includes('laptop')) return { pass: false, reason };
      if (reason.includes('artificial FPS') || reason.includes('Frame')) return { pass: false, reason };
      if (reason.includes('Desktop/laptop GPU')) return { pass: false, reason };
      // For other patterns (consoles, etc.), only reject if no handheld is mentioned in the title
      if (!hasHandheld) return { pass: false, reason };
    }
  }

  return { pass: true };
}

// ─── QUALITY LAYER 3: Post-extraction validation ───
// Programmatic checks on Claude's extracted data to catch hallucinations/errors.
const DEVICE_TDP_LIMITS: Record<string, { min: number; max: number }> = {
  'steam-deck-oled': { min: 3, max: 15 },
  'rog-ally': { min: 9, max: 30 },
  'rog-ally-x': { min: 9, max: 30 },
  'legion-go': { min: 8, max: 30 },
  'legion-go-s': { min: 8, max: 30 },
  'msi-claw-8-ai-plus': { min: 10, max: 37 },
};

const DEVICE_RESOLUTIONS: Record<string, string[]> = {
  'steam-deck-oled': ['1280x800', '1280x720', '960x600', '800x500'],
  'rog-ally': ['1920x1080', '1600x900', '1280x720'],
  'rog-ally-x': ['1920x1080', '1600x900', '1280x720'],
  'legion-go': ['2560x1600', '1920x1200', '1920x1080', '1600x900', '1280x800', '1280x720'],
  'legion-go-s': ['1920x1200', '1920x1080', '1600x900', '1280x800', '1280x720'],
  'msi-claw-8-ai-plus': ['1920x1200', '1920x1080', '1600x900', '1280x720'],
};

function validateExtraction(data: ExtractedReport, deviceSlug: string): { valid: boolean; reason?: string } {
  // FPS sanity
  if (data.fps_avg < 5 || data.fps_avg > 200) {
    return { valid: false, reason: `FPS ${data.fps_avg} out of sane range (5-200)` };
  }
  if (data.fps_low !== null && data.fps_low > data.fps_avg) {
    return { valid: false, reason: `fps_low (${data.fps_low}) > fps_avg (${data.fps_avg})` };
  }
  if (data.fps_low !== null && data.fps_low < 1) {
    return { valid: false, reason: `fps_low (${data.fps_low}) impossibly low` };
  }

  // TDP within device limits
  if (data.tdp_watts !== null) {
    const limits = DEVICE_TDP_LIMITS[deviceSlug];
    if (limits && (data.tdp_watts < limits.min || data.tdp_watts > limits.max)) {
      return { valid: false, reason: `TDP ${data.tdp_watts}W outside ${deviceSlug} range (${limits.min}-${limits.max}W)` };
    }
  }

  // Resolution check — warn but allow (Claude might normalize differently)
  if (data.resolution) {
    const validRes = DEVICE_RESOLUTIONS[deviceSlug];
    if (validRes && !validRes.includes(data.resolution)) {
      // Don't reject, but null it out — better to use device default than wrong value
      data.resolution = null;
    }
  }

  // Battery sanity
  if (data.battery_hours !== null && (data.battery_hours < 0.3 || data.battery_hours > 8)) {
    data.battery_hours = null; // Unrealistic, just drop it
  }

  // Rating vs FPS consistency check
  const expectedRating = data.fps_avg >= 55 ? 'excellent' : data.fps_avg >= 40 ? 'good' : data.fps_avg >= 30 ? 'fair' : data.fps_avg >= 20 ? 'poor' : 'unplayable';
  const tiers = ['unplayable', 'poor', 'fair', 'good', 'excellent'];
  const diff = Math.abs(tiers.indexOf(data.overall_rating) - tiers.indexOf(expectedRating));
  if (diff > 1) {
    // Fix the rating to match FPS instead of rejecting
    data.overall_rating = expectedRating;
  }

  // Preset enum validation
  const validPresets = ['ultra_low', 'low', 'medium', 'high', 'ultra', 'custom'];
  if (data.preset && !validPresets.includes(data.preset)) {
    data.preset = null;
  }

  // Thermal enum validation
  const validThermals = ['cool', 'warm', 'hot'];
  if (data.thermal && !validThermals.includes(data.thermal)) {
    data.thermal = null;
  }

  // Fan noise enum validation
  const validFanNoise = ['silent', 'quiet', 'audible', 'loud'];
  if (data.fan_noise && !validFanNoise.includes(data.fan_noise)) {
    data.fan_noise = null;
  }

  // FSR mode enum validation
  const validFsrModes = ['quality', 'balanced', 'performance', 'ultra_performance'];
  if (data.fsr_mode && !validFsrModes.includes(data.fsr_mode)) {
    data.fsr_mode = null;
  }

  return { valid: true };
}

// ─── Main ───
async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] YouTube transcript import starting...`);

  // Load devices from DB
  const { data: dbDevices } = await supabase
    .from('devices')
    .select('id, slug, name, screen_resolution')
    .eq('is_active', true);

  const deviceMap = Object.fromEntries((dbDevices ?? []).map((d) => [d.slug, d]));

  // Load top games by Metacritic score
  const { data: games } = await supabase
    .from('games')
    .select('id, slug, name, steam_appid')
    .not('steam_appid', 'is', null)
    .order('metacritic_score', { ascending: false, nullsFirst: false })
    .limit(200);

  const enrichedGames = games ?? [];

  console.log(`Loaded ${enrichedGames.length} enriched games, ${Object.keys(deviceMap).length} devices`);

  // Load existing imports for dedup
  const { data: existingImports } = await supabase
    .from('performance_reports')
    .select('import_source_id')
    .eq('import_source', 'youtube');

  const existingIds = new Set((existingImports ?? []).map((r) => r.import_source_id));
  console.log(`${existingIds.size} existing YouTube imports\n`);

  // Search targets: 6 active devices
  const deviceSearchNames = [
    { name: 'Steam Deck', slug: 'steam-deck-oled' },
    { name: 'ROG Ally X', slug: 'rog-ally-x' },
    { name: 'ROG Ally', slug: 'rog-ally' },
    { name: 'Legion Go S', slug: 'legion-go-s' },
    { name: 'Legion Go', slug: 'legion-go' },
    { name: 'MSI Claw 8', slug: 'msi-claw-8-ai-plus' },
  ];

  let searchesUsed = 0;
  let transcriptsFetched = 0;
  let claudeCalls = 0;
  let reportsInserted = 0;
  let skippedNoTranscript = 0;
  let skippedNoData = 0;
  let skippedPreFilter = 0;
  let skippedValidation = 0;
  let errors = 0;

  for (const game of enrichedGames) {
    if (searchesUsed >= MAX_SEARCHES_PER_RUN) break;
    if (transcriptsFetched >= MAX_TRANSCRIPTS_PER_RUN) break;

    for (const deviceSearch of deviceSearchNames) {
      if (searchesUsed >= MAX_SEARCHES_PER_RUN) break;
      if (transcriptsFetched >= MAX_TRANSCRIPTS_PER_RUN) break;

      const query = `${deviceSearch.name} ${normalizeGameName(game.name)} FPS test`;

      try {
        const results = await supadataSearch(query, 3);
        searchesUsed++;
        await sleep(DELAY_MS);

        if (results.length === 0) continue;

        for (const video of results) {
          if (transcriptsFetched >= MAX_TRANSCRIPTS_PER_RUN) break;

          const importId = `yt:${video.videoId}`;
          if (existingIds.has(importId)) continue;

          const isTrusted = TRUSTED_CHANNELS[video.channelId] !== undefined;

          // Skip very short videos (< 1min likely not benchmarks)
          if (video.duration > 0 && video.duration < 60) continue;

          // === QUALITY LAYER 1: Pre-filter video before wasting a Supadata credit ===
          const preFilter = preFilterVideo(video.title, video.description);
          if (!preFilter.pass) {
            skippedPreFilter++;
            console.log(`    SKIP (pre-filter): "${video.title.slice(0, 60)}" — ${preFilter.reason}`);
            continue;
          }

          // === TRY DESCRIPTION/CHAPTERS FIRST (free, no API cost) ===
          let extracted: ExtractedReport | null = null;
          let extractionMethod = 'transcript';

          const metadata = await fetchVideoMetadata(video.videoId);
          if (metadata) {
            extracted = extractFromDescription(metadata.description, metadata.chapters, game.name);
            if (extracted) {
              extractionMethod = 'description';
              // Still validate against Layer 3 below
            }
          }

          // Fall back to transcript if description didn't yield data
          if (!extracted) {
            let transcript: string | null = null;
            try {
              transcript = await fetchTranscript(video.videoId);
              transcriptsFetched++;
              await sleep(DELAY_MS);
            } catch (e) {
              console.log(`    Transcript error ${video.videoId}: ${(e as Error).message.slice(0, 80)}`);
              errors++;
              continue;
            }

            if (!transcript || transcript.length < 50) {
              skippedNoTranscript++;
              continue;
            }

            // === QUALITY LAYER 2: Claude extraction (with enhanced rejection prompt) ===
            try {
              extracted = await extractWithClaude(video.title, transcript, game.name);
              claudeCalls++;
              await sleep(2000); // Rate limit Claude
            } catch (e) {
              console.log(`    Claude error: ${(e as Error).message.slice(0, 80)}`);
              errors++;
              continue;
            }

            if (!extracted) {
              skippedNoData++;
              continue;
            }
          }

          // Resolve device: prefer Claude's detection, fallback to search context
          const deviceSlug = extracted.device_slug ?? detectDevice(video.title + ' ' + video.description) ?? deviceSearch.slug;
          const dbDevice = deviceMap[deviceSlug];
          if (!dbDevice) {
            console.log(`    Unknown device slug: ${deviceSlug}`);
            continue;
          }

          // === QUALITY LAYER 3: Post-extraction validation ===
          const validation = validateExtraction(extracted, deviceSlug);
          if (!validation.valid) {
            skippedValidation++;
            console.log(`    REJECT (validation): "${video.title.slice(0, 50)}" — ${validation.reason}`);
            continue;
          }

          // Build report
          const report = {
            game_id: game.id,
            device_id: dbDevice.id,
            user_id: null,
            fps_avg: extracted.fps_avg,
            fps_low: extracted.fps_low,
            fps_target: extracted.fps_avg >= 55 ? '60' : extracted.fps_avg >= 35 ? '40' : '30',
            fps_stability: 'mostly_stable',
            resolution: extracted.resolution ?? dbDevice.screen_resolution,
            preset: extracted.preset,
            fsr_enabled: extracted.fsr_enabled ?? false,
            fsr_mode: extracted.fsr_mode,
            tdp_limit_watts: extracted.tdp_watts,
            battery_life_hours: extracted.battery_hours,
            thermal: extracted.thermal,
            fan_noise: extracted.fan_noise,
            overall_rating: extracted.overall_rating,
            proton_version: extracted.proton_version ?? null,
            notes: `From YouTube: "${video.title}" by ${video.channelTitle}. ${extracted.notes_summary} Video: https://youtu.be/${video.videoId}`,
            quality_tier: isTrusted ? 'trusted_benchmark' : 'imported',
            import_source: 'youtube',
            import_source_id: importId,
            source: 'manual' as const,
            moderation_status: 'approved',
          };

          // Cross-source validation: flag outliers vs existing consensus
          const { data: existingConsensus } = await supabase
            .from('consensus_ratings')
            .select('fps_avg, report_count')
            .eq('game_id', game.id)
            .eq('device_id', dbDevice.id)
            .single();

          if (existingConsensus && existingConsensus.fps_avg && existingConsensus.report_count >= 3) {
            const deviation = Math.abs(extracted.fps_avg - existingConsensus.fps_avg);
            if (deviation > 15) {
              report.moderation_status = 'pending';
              report.notes += ` [Auto-flagged: ${extracted.fps_avg}fps vs ${existingConsensus.fps_avg.toFixed(0)} consensus]`;
            }
          }

          const { error: insertErr } = await supabase
            .from('performance_reports')
            .insert(report);

          if (insertErr) {
            if (!insertErr.message.includes('duplicate')) {
              console.log(`  FAIL: ${game.name} on ${dbDevice.name} — ${insertErr.message}`);
              errors++;
            }
          } else {
            existingIds.add(importId);
            reportsInserted++;
            const src = isTrusted ? 'TRUSTED' : 'community';
            const tdpStr = extracted.tdp_watts ? `${extracted.tdp_watts}W` : '?W';
            const method = extractionMethod === 'description' ? 'DESC' : 'TRANSCRIPT';
            console.log(
              `  OK: ${game.name} on ${dbDevice.name} — ${extracted.fps_avg}fps @ ${tdpStr}, ` +
              `${extracted.preset ?? '?'} ${extracted.resolution ?? '?'} (${src}/${method}) [${video.channelTitle}]`,
            );
          }
        }
      } catch (e) {
        console.log(`  FAIL search "${game.name}": ${(e as Error).message.slice(0, 100)}`);
        errors++;
        await sleep(1000);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nYouTube transcript import complete in ${elapsed}s`);
  console.log(`  Searches used:       ${searchesUsed} / ${MAX_SEARCHES_PER_RUN}`);
  console.log(`  Transcripts fetched: ${transcriptsFetched} / ${MAX_TRANSCRIPTS_PER_RUN}`);
  console.log(`  Claude AI calls:     ${claudeCalls}`);
  console.log(`  Reports inserted:    ${reportsInserted}`);
  console.log(`  Pre-filtered out:    ${skippedPreFilter}`);
  console.log(`  No transcript:       ${skippedNoTranscript}`);
  console.log(`  No usable data:      ${skippedNoData}`);
  console.log(`  Failed validation:   ${skippedValidation}`);
  console.log(`  Errors:              ${errors}`);
}

main().catch((err) => {
  console.error('YouTube import failed:', err);
  process.exit(1);
});
