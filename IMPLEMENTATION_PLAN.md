# Handheld GameDB — Plan Implementacyjny

Kompletny plan implementacyjny od zera do produkcji. Bazuje na zrewidowanym tech stacku, 38 feature'ach i realistycznym harmonogramie z REVIEW.md.

---

## TECH STACK — FINALNA DECYZJA

| Warstwa | Technologia | Wersja | Uzasadnienie |
|---|---|---|---|
| **Framework** | Astro | 5.x | Zero JS domyślnie, Island Architecture, tańszy hosting, lepsze SEO |
| **UI Islands** | React | 19.x | Interaktywne komponenty: wyszukiwarka, formularze, komentarze, wykresy |
| **Styling** | Tailwind CSS | 4.x | Utility-first, szybki prototyping, mały bundle |
| **Baza danych** | Supabase (PostgreSQL 15) | — | Auth + DB + Storage + Realtime w jednym, $25/mies Pro |
| **ORM** | Drizzle | latest | Type-safe, SQL-bliski, migracje, lekki |
| **Search** | Meilisearch | 1.x | Self-hosted VPS, typo-tolerant, faceted, instant |
| **Auth** | Better Auth | latest | Steam OpenID + Google OAuth, aktywnie rozwijany, nie deprecated |
| **Hosting** | Cloudflare Pages | — | Darmowy, globalny CDN, edge SSR via CF Workers |
| **Storage** | Cloudflare R2 | — | Screenshoty, OG images, zero egress cost |
| **AI** | Claude API | Haiku 4.5 + Sonnet 4.6 | $5-30/mies, batch API 50% taniej |
| **Analytics** | Plausible | — | Privacy-first, GDPR, $9/mies |
| **Monitoring** | Sentry | free tier | Error tracking, performance monitoring |
| **Email** | Resend | free tier | Transakcyjne: powiadomienia, weryfikacja |
| **VPS (Meilisearch)** | Hetzner CAX11 | — | ARM64, 2 vCPU, 4GB RAM, $4.5/mies |
| **Package manager** | pnpm | 9.x | Szybki, oszczędny na dysku |
| **Walidacja** | Zod | 3.x | Schema validation, form validation |
| **Wykresy** | Recharts | 2.x | React-based, composable, lekki |

**Koszt miesięczny**: $40-75/mies (Supabase $25 + VPS $5 + Plausible $9 + domena $1)

---

## STRUKTURA PROJEKTU

```
handhelddb/
├── astro.config.mjs
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── .env                          # NIE COMMITOWAĆ
│
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── og/                       # Generated OG images
│
├── src/
│   ├── layouts/
│   │   ├── BaseLayout.astro      # HTML head, meta, nav, footer
│   │   ├── GameLayout.astro      # Layout dla stron gier
│   │   └── DeviceLayout.astro    # Layout dla stron urządzeń
│   │
│   ├── pages/
│   │   ├── index.astro           # Landing page
│   │   ├── games/
│   │   │   ├── index.astro       # Lista gier z filtrami
│   │   │   ├── [slug].astro      # Strona gry
│   │   │   └── [slug]/
│   │   │       └── [device].astro # Strona gra+urządzenie
│   │   ├── devices/
│   │   │   ├── index.astro       # Lista urządzeń
│   │   │   └── [slug].astro      # Strona urządzenia
│   │   ├── compare/
│   │   │   ├── [...slugs].astro  # Porównanie urządzeń (ogólne lub per gra)
│   │   ├── discover.astro        # "What Should I Play?"
│   │   ├── dashboard.astro       # My Library Dashboard (auth required)
│   │   ├── profile/
│   │   │   └── [username].astro  # Profil użytkownika
│   │   ├── report/
│   │   │   └── new.astro         # Formularz nowego raportu
│   │   ├── auth/
│   │   │   ├── login.astro
│   │   │   ├── callback.astro
│   │   │   └── logout.astro
│   │   ├── api/                  # API endpoints (Astro API routes)
│   │   │   ├── reports/
│   │   │   │   ├── index.ts      # GET (list), POST (create)
│   │   │   │   ├── [id].ts       # GET, PATCH, DELETE
│   │   │   │   └── [id]/vote.ts  # POST vote
│   │   │   ├── comments/
│   │   │   │   ├── index.ts      # GET, POST
│   │   │   │   ├── [id].ts       # PATCH, DELETE
│   │   │   │   └── [id]/react.ts # POST reaction
│   │   │   ├── games/
│   │   │   │   ├── index.ts      # GET (list)
│   │   │   │   └── [id].ts       # GET (detail)
│   │   │   ├── devices/
│   │   │   │   └── index.ts      # GET (list)
│   │   │   ├── search.ts         # GET (proxy to Meilisearch)
│   │   │   ├── auth/
│   │   │   │   └── [...all].ts   # Better Auth catch-all
│   │   │   ├── user/
│   │   │   │   ├── setup.ts      # GET/PUT My Setup
│   │   │   │   ├── library.ts    # POST import Steam library
│   │   │   │   └── notifications.ts
│   │   │   └── og/[type]/[id].png.ts  # Dynamic OG image generation
│   │   └── sitemap.xml.ts        # Dynamic sitemap
│   │
│   ├── components/
│   │   ├── astro/                # Static Astro components (zero JS)
│   │   │   ├── GameCard.astro
│   │   │   ├── DeviceCard.astro
│   │   │   ├── PerformanceBadge.astro
│   │   │   ├── ProtonDBBadge.astro
│   │   │   ├── DeckVerifiedBadge.astro
│   │   │   ├── MetadataSidebar.astro
│   │   │   ├── BreadcrumbNav.astro
│   │   │   ├── Footer.astro
│   │   │   ├── Header.astro
│   │   │   └── SEOHead.astro
│   │   │
│   │   └── react/                # Interactive React Islands
│   │       ├── SearchBar.tsx             # Instant search + autocomplete
│   │       ├── SearchFilters.tsx         # Faceted filters panel
│   │       ├── ReportForm.tsx            # Multi-step report wizard
│   │       ├── ReportForm/
│   │       │   ├── StepGame.tsx          # Step 1: Game select
│   │       │   ├── StepDevice.tsx        # Step 2: Device select
│   │       │   ├── StepPerformance.tsx   # Step 3: FPS/resolution/preset
│   │       │   ├── StepPower.tsx         # Step 4: TDP/battery/thermal
│   │       │   ├── StepCompatibility.tsx # Step 5: Controller/anti-cheat
│   │       │   ├── StepCustom.tsx        # Step 6: Custom settings
│   │       │   └── StepReview.tsx        # Step 7: Review & submit
│   │       ├── CommentSection.tsx        # Threaded comments
│   │       ├── CommentEditor.tsx         # Markdown editor
│   │       ├── CommentThread.tsx         # Single thread
│   │       ├── ReportVoting.tsx          # Yes/No voting
│   │       ├── TDPProfileCards.tsx       # 3 performance tiers
│   │       ├── BatteryEstimator.tsx      # Battery life calculator
│   │       ├── DeviceSelector.tsx        # Dropdown for device selection
│   │       ├── PerformanceGrid.tsx       # Color-coded device×metrics table
│   │       ├── PerformanceHeatmap.tsx    # Games×devices heatmap
│   │       ├── FPSChart.tsx             # FPS distribution histogram
│   │       ├── TrendChart.tsx           # FPS over time line chart
│   │       ├── DeviceComparison.tsx      # Side-by-side comparison
│   │       ├── MySetupSelector.tsx       # Persistent device picker
│   │       ├── LibraryDashboard.tsx      # Steam library overview
│   │       ├── NotificationBell.tsx      # In-app notifications
│   │       └── ShareCard.tsx            # Share performance card
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle schema (all tables)
│   │   │   ├── client.ts         # Supabase/Drizzle client init
│   │   │   ├── migrations/       # Drizzle migrations
│   │   │   └── seed.ts           # Initial device data
│   │   │
│   │   ├── auth/
│   │   │   ├── config.ts         # Better Auth configuration
│   │   │   ├── steam.ts          # Steam OpenID provider
│   │   │   └── middleware.ts     # Auth middleware for protected routes
│   │   │
│   │   ├── api/
│   │   │   ├── steam.ts          # Steam API client (rate-limited)
│   │   │   ├── igdb.ts           # IGDB/Twitch API client
│   │   │   ├── steamspy.ts       # SteamSpy API client
│   │   │   ├── protondb.ts       # ProtonDB API client
│   │   │   ├── hltb.ts           # HowLongToBeat wrapper
│   │   │   └── rate-limiter.ts   # Generic rate limiter utility
│   │   │
│   │   ├── search/
│   │   │   ├── client.ts         # Meilisearch client
│   │   │   ├── indexer.ts        # Index games into Meilisearch
│   │   │   └── config.ts         # Index settings, filterable attributes
│   │   │
│   │   ├── ai/
│   │   │   ├── client.ts         # Claude API client
│   │   │   ├── settings-synthesis.ts   # Generate optimal settings from reports
│   │   │   ├── seo-generator.ts        # Generate meta descriptions, FAQs
│   │   │   └── staleness-detector.ts   # Detect outdated reports
│   │   │
│   │   ├── consensus.ts          # Consensus Rating Algorithm
│   │   ├── staleness.ts          # Staleness detection logic
│   │   ├── og-image.ts           # OG image generation (satori)
│   │   ├── markdown.ts           # Markdown parser (marked + DOMPurify)
│   │   └── utils.ts              # Shared utilities
│   │
│   ├── middleware.ts              # Astro middleware (auth, rate limiting)
│   │
│   └── types/
│       ├── game.ts
│       ├── device.ts
│       ├── report.ts
│       ├── comment.ts
│       └── user.ts
│
├── scripts/
│   ├── seed-devices.ts           # Insert 3 initial devices
│   ├── import-steam-catalog.ts   # Full Steam catalog import
│   ├── import-steamspy-tags.ts   # SteamSpy tags enrichment
│   ├── import-deck-verified.ts   # Steam Deck Verified labels
│   ├── import-protondb.ts        # ProtonDB tiers
│   ├── import-sharedeck.ts       # ShareDeck reports import
│   ├── enrich-igdb.ts            # IGDB metadata enrichment
│   ├── enrich-hltb.ts            # HowLongToBeat times
│   ├── sync-meilisearch.ts       # Sync DB → Meilisearch index
│   ├── detect-new-releases.ts    # Check for new Steam releases
│   ├── detect-staleness.ts       # Flag stale reports
│   └── generate-sitemap.ts       # Generate XML sitemap
│
├── cron/
│   ├── daily-sync.ts             # Daily: new releases, metadata refresh
│   ├── hourly-search-sync.ts     # Hourly: sync new/updated games to Meilisearch
│   └── weekly-staleness.ts       # Weekly: staleness check
│
└── tests/
    ├── unit/
    │   ├── consensus.test.ts
    │   ├── staleness.test.ts
    │   └── markdown.test.ts
    └── integration/
        ├── reports.test.ts
        ├── comments.test.ts
        └── search.test.ts
```

---

## DATABASE SCHEMA (Drizzle)

### Tabele główne

```typescript
// src/lib/db/schema.ts

import { pgTable, text, integer, real, boolean, timestamp,
         jsonb, pgEnum, uuid, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ============ ENUMS ============

export const deckCompatEnum = pgEnum('deck_compat', [
  'verified', 'playable', 'unsupported', 'unknown'
]);

export const protondbTierEnum = pgEnum('protondb_tier', [
  'platinum', 'gold', 'silver', 'bronze', 'borked', 'pending'
]);

export const qualityTierEnum = pgEnum('quality_tier', [
  'verified',              // Redakcyjne testy — najwyższy tier
  'community_confirmed',   // 3+ zgodne raporty
  'reported',              // 1-2 raporty
  'ai_estimated',          // Predykcja AI
  'imported'               // Import z ShareDeck/inne
]);

export const fpsTargetEnum = pgEnum('fps_target', ['30', '40', '60', '120']);

export const fpsStabilityEnum = pgEnum('fps_stability', [
  'stable', 'mostly_stable', 'unstable'
]);

export const overallRatingEnum = pgEnum('overall_rating', [
  'excellent', 'good', 'fair', 'poor', 'unplayable'
]);

export const thermalEnum = pgEnum('thermal', ['cool', 'warm', 'hot']);

export const fanNoiseEnum = pgEnum('fan_noise', [
  'silent', 'quiet', 'audible', 'loud'
]);

export const controllerStatusEnum = pgEnum('controller_status', [
  'works_oob', 'needs_remap', 'broken', 'unknown'
]);

export const antiCheatStatusEnum = pgEnum('anticheat_status', [
  'works', 'broken', 'not_applicable', 'unknown'
]);

export const suspendStatusEnum = pgEnum('suspend_status', [
  'works', 'issues', 'broken', 'unknown'
]);

export const fsrModeEnum = pgEnum('fsr_mode', [
  'quality', 'balanced', 'performance', 'ultra_performance'
]);

export const presetEnum = pgEnum('preset', [
  'ultra_low', 'low', 'medium', 'high', 'ultra', 'custom'
]);

export const commentSortEnum = pgEnum('comment_sort', [
  'best', 'newest', 'oldest'
]);

// ============ GAMES ============

export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  steamAppid: integer('steam_appid').unique(),
  igdbId: integer('igdb_id'),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  shortDescription: text('short_description'),
  headerImage: text('header_image'),          // Steam header URL
  capsuleImage: text('capsule_image'),         // Steam capsule URL
  screenshots: jsonb('screenshots').$type<string[]>().default([]),

  // Classification
  genres: jsonb('genres').$type<string[]>().default([]),
  tags: jsonb('tags').$type<string[]>().default([]),           // SteamSpy
  developers: jsonb('developers').$type<string[]>().default([]),
  publishers: jsonb('publishers').$type<string[]>().default([]),

  // External scores
  metacriticScore: integer('metacritic_score'),
  metacriticUrl: text('metacritic_url'),
  steamReviewScore: integer('steam_review_score'),       // % positive
  steamReviewCount: integer('steam_review_count'),

  // Compatibility
  protondbTier: protondbTierEnum('protondb_tier').default('pending'),
  deckCompatibility: deckCompatEnum('deck_compatibility').default('unknown'),

  // Metadata
  releaseDate: timestamp('release_date'),
  priceUsd: real('price_usd'),
  isFreeToPlay: boolean('is_free_to_play').default(false),
  hltbMainHours: real('hltb_main_hours'),
  hltbExtraHours: real('hltb_extra_hours'),
  hltbCompletionistHours: real('hltb_completionist_hours'),

  // SteamSpy
  steamspyOwners: text('steamspy_owners'),       // "1,000,000 .. 2,000,000"
  steamspyCcu: integer('steamspy_ccu'),

  // Performance classification (AI-generated)
  performanceTier: text('performance_tier'),      // lightweight/medium/demanding/very_demanding

  // Sync tracking
  steamBuildId: text('steam_build_id'),           // For staleness detection
  lastSteamSync: timestamp('last_steam_sync'),
  lastIgdbSync: timestamp('last_igdb_sync'),
  lastProtondbSync: timestamp('last_protondb_sync'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_games_steam_appid').on(table.steamAppid),
  index('idx_games_slug').on(table.slug),
  index('idx_games_release_date').on(table.releaseDate),
  index('idx_games_metacritic').on(table.metacriticScore),
]);

// ============ DEVICES ============

export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),                    // "Steam Deck OLED"
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  manufacturer: text('manufacturer').notNull(),    // "Valve"

  // Hardware specs
  chip: text('chip'),                              // "AMD Van Gogh"
  gpu: text('gpu'),                                // "RDNA 2, 8 CUs"
  ramGb: integer('ram_gb'),
  storageGb: integer('storage_gb'),
  screenResolution: text('screen_resolution'),     // "1280x800"
  screenSize: real('screen_size'),                 // inches
  screenType: text('screen_type'),                 // "OLED", "IPS"
  batteryWh: real('battery_wh'),                   // 50
  tdpMin: real('tdp_min'),                         // 3
  tdpMax: real('tdp_max'),                         // 15
  tdpDefault: real('tdp_default'),                 // 12
  weightGrams: integer('weight_grams'),

  // Software
  defaultOs: text('default_os'),                   // "SteamOS 3.6"
  supportsWindows: boolean('supports_windows').default(true),

  // Pricing
  msrpUsd: real('msrp_usd'),
  buyUrl: text('buy_url'),                         // Affiliate link

  // Media
  image: text('image'),                            // Device photo URL

  releaseDate: timestamp('release_date'),
  isActive: boolean('is_active').default(true),     // Still sold/supported

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ USERS ============

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email'),
  username: varchar('username', { length: 50 }).unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),

  // Auth
  steamId: text('steam_id').unique(),
  googleId: text('google_id').unique(),

  // Gamification
  points: integer('points').default(0),
  level: text('level').default('new_tester'),       // new_tester/contributor/veteran/expert/elite
  isVerifiedTester: boolean('is_verified_tester').default(false),
  isAdmin: boolean('is_admin').default(false),
  isModerator: boolean('is_moderator').default(false),
  isBanned: boolean('is_banned').default(false),

  // My Setup
  primaryDeviceId: uuid('primary_device_id').references(() => devices.id),

  // Supporter
  supporterTier: text('supporter_tier'),            // null, 'supporter', 'pro', 'creator'
  supporterSince: timestamp('supporter_since'),

  // Notification preferences
  emailNotifications: boolean('email_notifications').default(true),
  notifyOnReply: boolean('notify_on_reply').default(true),
  notifyOnVote: boolean('notify_on_vote').default(false),
  weeklyDigest: boolean('weekly_digest').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
});

// User's devices (many-to-many)
export const userDevices = pgTable('user_devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  isPrimary: boolean('is_primary').default(false),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_user_device').on(table.userId, table.deviceId),
]);

// User's Steam library
export const userLibrary = pgTable('user_library', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  playtimeMinutes: integer('playtime_minutes').default(0),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_user_library').on(table.userId, table.gameId),
]);

// ============ PERFORMANCE REPORTS ============

export const performanceReports = pgTable('performance_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  userId: uuid('user_id').references(() => users.id),             // null for imported

  // FPS data
  fpsAvg: real('fps_avg').notNull(),
  fpsLow: real('fps_low'),                                        // 1% low
  fpsTarget: fpsTargetEnum('fps_target'),
  fpsStability: fpsStabilityEnum('fps_stability'),

  // Graphics settings
  resolution: text('resolution'),                                  // "1280x800"
  preset: presetEnum('preset'),
  fsrEnabled: boolean('fsr_enabled').default(false),
  fsrMode: fsrModeEnum('fsr_mode'),
  customSettings: jsonb('custom_settings').$type<Record<string, string>>(),

  // Power & thermal
  tdpLimitWatts: real('tdp_limit_watts'),
  gpuClockMhz: integer('gpu_clock_mhz'),
  batteryLifeHours: real('battery_life_hours'),
  thermal: thermalEnum('thermal'),
  fanNoise: fanNoiseEnum('fan_noise'),

  // Compatibility
  controllerStatus: controllerStatusEnum('controller_status').default('unknown'),
  antiCheatStatus: antiCheatStatusEnum('anticheat_status').default('unknown'),
  suspendStatus: suspendStatusEnum('suspend_status').default('unknown'),

  // Overall
  overallRating: overallRatingEnum('overall_rating').notNull(),
  notes: text('notes'),
  screenshots: jsonb('screenshots').$type<string[]>().default([]),

  // Versioning
  gameVersion: text('game_version'),
  steamBuildId: text('steam_build_id'),
  osVersion: text('os_version'),
  gpuDriverVersion: text('gpu_driver_version'),

  // Quality & moderation
  qualityTier: qualityTierEnum('quality_tier').default('reported'),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  isFlagged: boolean('is_flagged').default(false),
  isStale: boolean('is_stale').default(false),
  staleReason: text('stale_reason'),

  // Source tracking
  importSource: text('import_source'),                             // 'sharedeck', 'reddit_ai', null for user
  importSourceId: text('import_source_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_reports_game').on(table.gameId),
  index('idx_reports_device').on(table.deviceId),
  index('idx_reports_game_device').on(table.gameId, table.deviceId),
  index('idx_reports_user').on(table.userId),
  index('idx_reports_quality').on(table.qualityTier),
  index('idx_reports_created').on(table.createdAt),
]);

// Report votes
export const reportVotes = pgTable('report_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id').references(() => performanceReports.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  isUpvote: boolean('is_upvote').notNull(),                        // true = "worked for me"
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_vote_unique').on(table.reportId, table.userId),
]);

// ============ CONSENSUS (materialized/cached) ============

export const consensusRatings = pgTable('consensus_ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),

  // Consensus values (calculated)
  fpsAvg: real('fps_avg'),
  fpsLow: real('fps_low'),
  recommendedPreset: presetEnum('recommended_preset'),
  recommendedResolution: text('recommended_resolution'),
  recommendedTdp: real('recommended_tdp'),
  estimatedBattery: real('estimated_battery'),
  typicalThermal: thermalEnum('typical_thermal'),
  typicalFanNoise: fanNoiseEnum('typical_fan_noise'),

  // TDP profiles (3 tiers)
  batterySaverProfile: jsonb('battery_saver_profile').$type<TDPProfile>(),
  balancedProfile: jsonb('balanced_profile').$type<TDPProfile>(),
  performanceProfile: jsonb('performance_profile').$type<TDPProfile>(),

  // Quality metrics
  reportCount: integer('report_count').default(0),
  confidenceLevel: text('confidence_level'),        // low/medium/high
  overallVerdict: overallRatingEnum('overall_verdict'),
  weightedScore: real('weighted_score'),             // Bayesian smoothed

  lastCalculated: timestamp('last_calculated').defaultNow(),
  isStale: boolean('is_stale').default(false),
}, (table) => [
  uniqueIndex('idx_consensus_game_device').on(table.gameId, table.deviceId),
]);

// ============ COMMENTS ============

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  parentId: uuid('parent_id'),                                     // For threading (self-ref)
  depth: integer('depth').default(0),                              // Max 3

  body: text('body').notNull(),                                    // Markdown source
  bodyHtml: text('body_html').notNull(),                           // Rendered + sanitized HTML

  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),

  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  isDeleted: boolean('is_deleted').default(false),
  isFlagged: boolean('is_flagged').default(false),
  isShadowBanned: boolean('is_shadow_banned').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_comments_game').on(table.gameId),
  index('idx_comments_parent').on(table.parentId),
  index('idx_comments_user').on(table.userId),
]);

// Comment reactions
export const commentReactions = pgTable('comment_reactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  commentId: uuid('comment_id').references(() => comments.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  emoji: varchar('emoji', { length: 10 }).notNull(),               // 👍 ❤️ 🔥 🤔
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_reaction_unique').on(table.commentId, table.userId, table.emoji),
]);

// Comment votes
export const commentVotes = pgTable('comment_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  commentId: uuid('comment_id').references(() => comments.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  isUpvote: boolean('is_upvote').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_comment_vote_unique').on(table.commentId, table.userId),
]);

// ============ NOTIFICATIONS ============

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(),                    // 'comment_reply', 'report_verified', 'vote', etc.
  title: text('title').notNull(),
  body: text('body'),
  url: text('url'),                                // Deep link
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_notifications_user').on(table.userId),
  index('idx_notifications_unread').on(table.userId, table.isRead),
]);

// ============ GAME FOLLOWS ============

export const gameFollows = pgTable('game_follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_follow_unique').on(table.userId, table.gameId),
]);

// ============ BADGES ============

export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  icon: text('icon'),                              // emoji or icon name
  category: text('category'),                      // 'contributor', 'challenge', 'special'
});

export const userBadges = pgTable('user_badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  badgeId: uuid('badge_id').references(() => badges.id).notNull(),
  earnedAt: timestamp('earned_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_user_badge').on(table.userId, table.badgeId),
]);

// ============ TYPES ============

interface TDPProfile {
  tdpWatts: number;
  gpuClockMhz?: number;
  fpsTarget: number;
  fpsAvg: number;
  resolution: string;
  preset: string;
  fsrEnabled: boolean;
  fsrMode?: string;
  estimatedBatteryHours: number;
  thermal: string;
  fanNoise: string;
  keySettings?: Record<string, string>;
  reportCount: number;
  confidence: string;
}
```

### Indeksy dodatkowe (migracja)

```sql
-- Full-text search (backup, Meilisearch primary)
CREATE INDEX idx_games_name_trgm ON games USING gin(name gin_trgm_ops);

-- Composite for common queries
CREATE INDEX idx_reports_game_device_created
  ON performance_reports(game_id, device_id, created_at DESC);

-- Partial index for non-stale reports
CREATE INDEX idx_reports_active
  ON performance_reports(game_id, device_id)
  WHERE is_flagged = false AND is_stale = false;
```

---

## MEILISEARCH CONFIGURATION

```typescript
// src/lib/search/config.ts

export const GAMES_INDEX_CONFIG = {
  primaryKey: 'id',

  searchableAttributes: [
    'name',
    'developers',
    'publishers',
    'genres',
    'tags',
  ],

  filterableAttributes: [
    'genres',
    'tags',
    'deckCompatibility',
    'protondbTier',
    'releaseYear',
    'priceUsd',
    'isFreeToPlay',
    'hasReports',                    // boolean
    'bestFps',                       // per device: { 'steam-deck-oled': 45 }
    'performanceTier',
    'metacriticScore',
  ],

  sortableAttributes: [
    'name',
    'releaseDate',
    'metacriticScore',
    'steamReviewScore',
    'reportCount',
    'priceUsd',
  ],

  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'reportCount:desc',             // Custom: games with more data rank higher
  ],

  // Typo tolerance
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
  },

  faceting: {
    maxValuesPerFacet: 100,
  },

  pagination: {
    maxTotalHits: 5000,
  },
};
```

### Meilisearch document schema

```typescript
interface GameSearchDocument {
  id: string;
  name: string;
  slug: string;
  headerImage: string;
  developers: string[];
  publishers: string[];
  genres: string[];
  tags: string[];
  deckCompatibility: string;
  protondbTier: string;
  releaseDate: number;           // unix timestamp
  releaseYear: number;
  priceUsd: number | null;
  isFreeToPlay: boolean;
  metacriticScore: number | null;
  steamReviewScore: number | null;
  hltbMainHours: number | null;
  performanceTier: string | null;
  hasReports: boolean;
  reportCount: number;

  // Per-device best FPS (for filtering "games that run at 60fps on X")
  bestFps: Record<string, number>;    // { 'steam-deck-oled': 45, 'rog-ally-x': 62 }
  bestVerdict: Record<string, string>; // { 'steam-deck-oled': 'good', 'rog-ally-x': 'excellent' }
}
```

---

## CONSENSUS RATING ALGORITHM

```typescript
// src/lib/consensus.ts

interface ConsensusInput {
  reports: PerformanceReport[];
  now: Date;
}

interface ConsensusOutput {
  fpsAvg: number;
  fpsLow: number | null;
  recommendedPreset: string;
  recommendedResolution: string;
  recommendedTdp: number;
  estimatedBattery: number;
  typicalThermal: string;
  typicalFanNoise: string;
  reportCount: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  overallVerdict: string;
  weightedScore: number;
  batterySaverProfile: TDPProfile | null;
  balancedProfile: TDPProfile | null;
  performanceProfile: TDPProfile | null;
}

const QUALITY_WEIGHTS = {
  verified: 5.0,
  community_confirmed: 3.0,
  reported: 1.0,
  ai_estimated: 0.5,
  imported: 0.3,
};

const HALF_LIFE_DAYS = 90;

function calculateWeight(report: PerformanceReport, now: Date): number {
  // Quality tier weight
  const qualityWeight = QUALITY_WEIGHTS[report.qualityTier];

  // Recency: exponential decay
  const ageMs = now.getTime() - report.createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);

  // Upvote ratio: Bayesian smoothing
  const up = report.upvotes;
  const down = report.downvotes;
  const voteWeight = (up + 1) / (up + down + 2);

  return qualityWeight * recencyWeight * voteWeight;
}

function getConfidence(count: number): 'low' | 'medium' | 'high' {
  if (count < 3) return 'low';
  if (count <= 10) return 'medium';
  return 'high';
}

// Cluster reports into 3 TDP profiles
function clusterTDPProfiles(reports: WeightedReport[]): {
  batterySaver: TDPProfile | null;
  balanced: TDPProfile | null;
  performance: TDPProfile | null;
} {
  // Sort by TDP ascending
  const sorted = [...reports].sort((a, b) =>
    (a.report.tdpLimitWatts ?? 0) - (b.report.tdpLimitWatts ?? 0)
  );

  // K-means-like clustering into 3 buckets based on TDP
  // or FPS target if TDP not available
  // ...implementation details...
}
```

---

## API ENDPOINTS

### Reports API

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reports?game={id}&device={id}` | No | Lista raportów z filtrami |
| `POST` | `/api/reports` | Yes | Nowy raport wydajności |
| `GET` | `/api/reports/{id}` | No | Pojedynczy raport |
| `PATCH` | `/api/reports/{id}` | Yes (owner) | Edycja raportu (7 dni) |
| `DELETE` | `/api/reports/{id}` | Yes (owner/mod) | Usunięcie raportu |
| `POST` | `/api/reports/{id}/vote` | Yes | Głosowanie Yes/No |
| `POST` | `/api/reports/{id}/flag` | Yes | Zgłoszenie raportu |

### Comments API

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/comments?game={id}&sort=best` | No | Lista komentarzy (threaded) |
| `POST` | `/api/comments` | Yes | Nowy komentarz |
| `PATCH` | `/api/comments/{id}` | Yes (owner, 15min) | Edycja komentarza |
| `DELETE` | `/api/comments/{id}` | Yes (owner/mod) | Usunięcie |
| `POST` | `/api/comments/{id}/react` | Yes | Dodaj/usuń reakcję |
| `POST` | `/api/comments/{id}/vote` | Yes | Upvote/downvote |
| `POST` | `/api/comments/{id}/flag` | Yes | Zgłoś komentarz |

### Games API

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/games?page=1&limit=20` | No | Lista gier |
| `GET` | `/api/games/{id}` | No | Szczegóły gry + consensus per device |
| `GET` | `/api/games/{id}/consensus?device={id}` | No | Consensus rating |
| `GET` | `/api/games/{id}/reports` | No | Raporty dla gry |

### Search API

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search?q={query}&device={slug}&genre={genre}` | No | Proxy do Meilisearch |

### User API

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/setup` | Yes | Pobierz My Setup |
| `PUT` | `/api/user/setup` | Yes | Zapisz urządzenia |
| `POST` | `/api/user/library` | Yes | Import Steam library |
| `GET` | `/api/user/library?device={slug}` | Yes | Library z performance data |
| `GET` | `/api/user/notifications` | Yes | Lista powiadomień |
| `PATCH` | `/api/user/notifications/{id}` | Yes | Oznacz jako przeczytane |

### Auth API

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/auth/*` | Better Auth catch-all handler |

---

## DATA IMPORT PIPELINE

### Kolejność importu (seed)

```
1. seed-devices.ts        → 3 urządzenia (ręczne dane)
2. import-steam-catalog.ts → ~49K gier (GetAppList → filter → appdetails top 600)
3. import-steamspy-tags.ts → Tagi + popularity dla top gier
4. import-deck-verified.ts → Steam Deck Verified labels
5. import-protondb.ts      → ProtonDB tiers
6. enrich-igdb.ts          → Related games, franchises (top 500)
7. enrich-hltb.ts          → Completion times (top 500)
8. import-sharedeck.ts     → ~2,475 performance reports (quality_tier = 'imported')
9. sync-meilisearch.ts     → Index all games into Meilisearch
```

### Szacowany czas seedowania

| Krok | Czas | Rate limit |
|---|---|---|
| Steam GetAppList | 1 min | 1 call |
| appdetails × 600 | 15 min | 200/5min |
| SteamSpy × 600 | 10 min | 1/sec |
| Deck Verified × all | 6h | varies |
| ProtonDB × 8K | 30 min | unlimited |
| IGDB × 500 | 2 min | 4/sec |
| HLTB × 500 | 15 min | unofficial |
| ShareDeck scrape | 30 min | scraping |
| Meilisearch index | 2 min | local |
| **TOTAL** | **~8 godzin** | — |

### Daily cron (scripts/cron/daily-sync.ts)

```
1. Check GetAppList for new releases (1 call)
2. Fetch appdetails for new games
3. Update Deck Verified labels for games with new build IDs
4. Update ProtonDB tiers (changed last 24h)
5. Sync new/updated games to Meilisearch
6. Recalculate consensus ratings for games with new reports
7. Run staleness detection
```

---

## RATE LIMITING

### External APIs

```typescript
// src/lib/api/rate-limiter.ts

const RATE_LIMITS = {
  steam: { requests: 200, windowMs: 5 * 60 * 1000 },    // 200/5min
  steamspy: { requests: 1, windowMs: 1000 },             // 1/sec
  igdb: { requests: 4, windowMs: 1000 },                 // 4/sec
  protondb: { requests: 10, windowMs: 1000 },            // ~10/sec safe
};
```

### Internal API rate limiting

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/reports` | 10 | per hour per user |
| `POST /api/comments` | 10 | per hour per user |
| `POST /api/*/vote` | 60 | per hour per user |
| `POST /api/*/flag` | 10 | per hour per user |
| `GET /api/search` | 30 | per minute per IP |
| `POST /api/user/library` | 1 | per hour per user |

---

## HARMONOGRAM IMPLEMENTACJI

### FAZA 1: Foundation (tydzień 1-4)

#### Tydzień 1: Projekt + Infrastruktura

| Dzień | Zadanie |
|---|---|
| 1 | Init Astro 5 + React + Tailwind. pnpm, tsconfig, ESLint, Prettier |
| 2 | Supabase projekt: create, config, env vars. Drizzle setup + connection test |
| 3 | Schema: games, devices, users, performance_reports. Pierwsza migracja |
| 4 | Schema: comments, votes, reactions, notifications, badges. Druga migracja |
| 5 | Seed devices (3 urządzenia: Steam Deck OLED, ROG Ally X, Legion Go). Base layouts |

**Deliverable**: Działający projekt z pustą bazą danych i 3 urządzeniami.

#### Tydzień 2: Auth + Steam API

| Dzień | Zadanie |
|---|---|
| 1-2 | Better Auth setup: Steam OpenID provider, Google OAuth, session management |
| 3 | Auth middleware, protected routes, login/logout UI |
| 4-5 | Steam API client: rate limiter, GetAppList, appdetails, error handling |

**Deliverable**: Login działa, Steam API pobiera dane.

#### Tydzień 3: Data Import Pipeline

| Dzień | Zadanie |
|---|---|
| 1 | Script: import-steam-catalog (top 600 gier z appdetails) |
| 2 | Script: import-steamspy-tags + import-deck-verified |
| 3 | Script: import-protondb + enrich-hltb |
| 4 | Script: import-sharedeck (performance reports jako tier "imported") |
| 5 | Script: enrich-igdb. Test pełnego pipeline. Fix edge cases |

**Deliverable**: ~600 gier z pełnymi metadanymi, ~2K+ imported reports.

#### Tydzień 4: Meilisearch + Basic Pages

| Dzień | Zadanie |
|---|---|
| 1 | VPS setup (Hetzner), Meilisearch install, firewall, API key |
| 2 | Meilisearch client, indexer, config (filterable/sortable attrs) |
| 3 | sync-meilisearch script, test search quality |
| 4 | Base layout, header, footer, nav. Landing page (hero + search bar) |
| 5 | Games list page (`/games`) z paginacją. Device list page (`/devices`) |

**Deliverable**: Wyszukiwarka działa, strony listują gry i urządzenia.

---

### FAZA 2: Core Features (tydzień 5-9)

#### Tydzień 5: Strona gry (najważniejsza strona)

| Dzień | Zadanie |
|---|---|
| 1 | `/games/[slug]` — hero section: header image, name, tags, badges |
| 2 | Metadata sidebar: Metacritic, HLTB, ProtonDB tier, Deck Verified, cena |
| 3 | Device Performance Grid: tabela urządzenia × metryki, color-coded |
| 4 | Compatibility checklist section (controller, anti-cheat, suspend) |
| 5 | Community reports list (z imported data). SEO: meta tags, JSON-LD |

**Deliverable**: Strony gier wyglądają profesjonalnie z danymi.

#### Tydzień 6: Strona gra+urządzenie + Device pages

| Dzień | Zadanie |
|---|---|
| 1-2 | `/games/[slug]/[device]` — performance summary, all reports for combo |
| 3 | Strona urządzenia `/devices/[slug]` — specs, stats, tested games list |
| 4 | Device "Report Card" — aggregate stats, best/worst games |
| 5 | Internal linking między stronami. Breadcrumbs. Related pages |

**Deliverable**: Pełna nawigacja game → game+device → device.

#### Tydzień 7: Formularz raportu wydajności

| Dzień | Zadanie |
|---|---|
| 1 | React: multi-step form wizard (7 kroków), state management |
| 2 | Step 1-3: Game select (autocomplete), device select, FPS/resolution/preset |
| 3 | Step 4-5: TDP/battery/thermal, compatibility checklist |
| 4 | Step 6-7: Custom settings (JSONB key-value), notes, review & submit |
| 5 | API endpoint POST /api/reports. Walidacja (Zod). Duplicate detection |

**Deliverable**: Użytkownicy mogą submitować raporty wydajności.

#### Tydzień 8: Wyszukiwarka (pełna)

| Dzień | Zadanie |
|---|---|
| 1 | React: SearchBar component — instant search, debounce, autocomplete dropdown |
| 2 | React: SearchFilters — faceted panel (urządzenie, gatunek, FPS tier, cena) |
| 3 | Search results page z paginacją, sorting options |
| 4 | "What Should I Play?" mode — device + genre + FPS target → results |
| 5 | Quick filters: "Only with reports", "Free to Play", price range. Polish UX |

**Deliverable**: Profesjonalna wyszukiwarka z filtrami.

#### Tydzień 9: Report voting + Consensus

| Dzień | Zadanie |
|---|---|
| 1 | React: ReportVoting component (Yes/No + count) |
| 2 | API: POST /api/reports/{id}/vote, deduplicate, update counts |
| 3 | Consensus Rating Algorithm — weighted average, recency decay, Bayesian smoothing |
| 4 | TDP profile clustering (3 tiers: battery saver, balanced, performance) |
| 5 | Recalculate consensus on new report/vote. Cache w consensus_ratings table |

**Deliverable**: Self-correcting data quality. Consensus ratings calculated.

---

### FAZA 3: Engagement Features (tydzień 10-13)

#### Tydzień 10: TDP Profile Cards + Battery Estimator

| Dzień | Zadanie |
|---|---|
| 1-2 | React: TDPProfileCards — 3 karty (Battery Saver / Balanced / Performance) |
| 3 | Każda karta: TDP, FPS, preset, battery, thermal, fan, key settings |
| 4 | React: BatteryEstimator — select game + device + FPS target → estimated battery |
| 5 | Integration z consensus data. Confidence badges |

**Deliverable**: Core USP działa — "Optimal Settings Finder".

#### Tydzień 11: System komentarzy

| Dzień | Zadanie |
|---|---|
| 1 | DB: comments table already exists. API: GET/POST /api/comments |
| 2 | React: CommentSection + CommentThread — threaded (max 3 levels) |
| 3 | React: CommentEditor — markdown input z preview (marked + DOMPurify) |
| 4 | Reactions (emoji), voting (upvote/downvote), sorting (best/newest) |
| 5 | Moderation: flag, admin delete. Rate limiting (10/h). Edit window (15 min) |

**Deliverable**: Pełny system komentarzy pod stronami gier.

#### Tydzień 12: My Setup + Steam Library Import

| Dzień | Zadanie |
|---|---|
| 1 | React: MySetupSelector — persistent device picker w headerze |
| 2 | API: GET/PUT /api/user/setup. Store w user_devices table |
| 3 | Adaptacja UI: game pages domyślnie pokazują dane dla user's device |
| 4 | Steam Library Import: API GetOwnedGames → user_library table |
| 5 | React: LibraryDashboard — "142/350 games tested, 89 at 60fps, 23 need testing" |

**Deliverable**: Personalizacja + sticky library dashboard.

#### Tydzień 13: Auto-pages + Shareable cards + Cron

| Dzień | Zadanie |
|---|---|
| 1 | Script: detect-new-releases — daily check Steam API for new games |
| 2 | Auto-generate stub pages: metadata + "Be first to report!" CTA |
| 3 | OG image generation (satori): performance card PNG |
| 4 | Shareable URLs z OG meta. One-click share buttons (Twitter, Reddit, Discord) |
| 5 | Cron setup: daily sync, hourly search sync, weekly staleness. Test all crons |

**Deliverable**: Strona rośnie automatycznie. Karty wyglądają dobrze w share'ach.

---

### FAZA 4: Polish + SEO + Launch (tydzień 14-16)

#### Tydzień 14: SEO + Performance

| Dzień | Zadanie |
|---|---|
| 1 | XML sitemap generator (dynamic, all game + game/device + device pages) |
| 2 | JSON-LD structured data: VideoGame, Review, FAQPage schema |
| 3 | Meta titles/descriptions per page type. Canonical URLs |
| 4 | Core Web Vitals audit: LCP, CLS, INP. Optimize images (CF Image Resizing) |
| 5 | robots.txt, meta robots. Google Search Console setup. Submit sitemap |

**Deliverable**: SEO-ready. Structured data. Fast pages.

#### Tydzień 15: QA + Content + Soft launch prep

| Dzień | Zadanie |
|---|---|
| 1 | Full QA pass: all forms, auth flows, edge cases, mobile responsive |
| 2 | Error pages (404, 500). Loading states. Empty states. Toast notifications |
| 3 | 10-20 własnych testów wydajności (verified tier) — najważniejsze gry |
| 4 | 3-5 artykułów/poradników: "Best Settings for Elden Ring", "ROG Ally vs Deck" |
| 5 | Sentry setup. Plausible setup. Rate limit testing. Security audit (OWASP) |

**Deliverable**: Production-ready quality.

#### Tydzień 16: Launch

| Dzień | Zadanie |
|---|---|
| 1 | Final deploy to Cloudflare Pages (production). DNS setup. SSL |
| 2 | Smoke test production. Fix any deploy issues |
| 3 | Reddit posts: r/SteamDeck, r/ROGAlly, r/HandheldGamePC, r/linux_gaming |
| 4 | Community outreach. Respond to feedback. Fix critical bugs |
| 5 | Retro: co zadziałało, co nie. Plan na post-launch |

**Deliverable**: LIVE. Pierwsi użytkownicy.

---

### FAZA 5: Post-launch iteracja (tydzień 17-22)

Priorytety zależą od feedbacku. Planowane:

| Tydzień | Feature | Priorytet |
|---|---|---|
| 17 | Device comparison tool (`/compare`) | SEO + user request |
| 18 | Performance heatmap grid + FPS distribution charts | Visualization |
| 19 | Contributor badges/levels + gamification | Retention |
| 20 | Follow/watch games + notifications | Retention |
| 21 | Thermal & fan noise indicators (visual) | UX |
| 22 | AI settings synthesis (Claude API) — auto TDP profiles | Scaling |

### FAZA 6: Growth (miesiąc 4-6)

| Feature | Timeline |
|---|---|
| Browser extension (Steam Store overlay) | 2-3 tyg |
| Performance trend tracker (FPS over time) | 1-2 tyg |
| Monthly testing challenges | 1 tyg |
| Public API (read-only) | 1-2 tyg |
| Supporter tiers (Patreon) | 1 tyg |
| CSV/JSON export | 2-3 dni |

### FAZA 7: Scale (miesiąc 6+)

| Feature | Trigger |
|---|---|
| Newsletter | >5K aktywnych użytkowników |
| Decky Loader plugin | >10K użytkowników Steam Deck |
| Reddit/Discord bot | Aktywna społeczność |
| News section (AI-assisted) | >20K/mies traffic |
| Hardware manufacturer outreach | Wiarygodność zbudowana |

---

## KLUCZOWE DECYZJE ARCHITEKTONICZNE

### 1. SSR vs Static vs Hybrid

- **Game pages** (`/games/[slug]`): **SSR on-demand** — zbyt wiele stron na static build, ale cachowane na edge (CF Cache, stale-while-revalidate)
- **Device pages** (`/devices/[slug]`): **Static** — tylko 3-10 stron, rebuild on data change
- **Landing + lists**: **SSR** z edge caching
- **Dashboard / report form**: **CSR** (React islands, auth-gated)
- **API routes**: **SSR** (Cloudflare Workers via Astro adapter)

### 2. Astro adapter

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',                    // SSR by default
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [
    react(),
    tailwind(),
  ],
  vite: {
    ssr: {
      external: ['node:crypto'],       // Cloudflare Workers compat
    },
  },
});
```

### 3. Supabase connection z Cloudflare Workers

Cloudflare Workers nie obsługują TCP — użyj **Supabase HTTP API** (PostgREST) lub **Supabase Edge Functions** jako proxy. Alternatywnie: **Hyperdrive** (CF's connection pooler for Postgres) jeśli potrzebny raw SQL.

```typescript
// Opcja A: Drizzle + Hyperdrive (preferred)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const sql = postgres(env.HYPERDRIVE_URL);
const db = drizzle(sql);

// Opcja B: Supabase JS client (simpler, HTTP-based)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
```

### 4. Image handling

- **Game images**: Hotlink z Steam CDN (dozwolone w ToS)
- **Device images**: Upload do Cloudflare R2
- **Screenshots (user uploads)**: R2 + CF Image Resizing (on-the-fly resize/optimize)
- **OG images**: Generated via satori → R2 cache
- **Max upload**: 5MB per screenshot, max 3 per report

### 5. Caching strategy

| Zasób | Cache | TTL |
|---|---|---|
| Game page HTML | CF edge cache | 1h (stale-while-revalidate 24h) |
| API /games/{id} | CF Cache API | 5 min |
| API /reports | No cache | — |
| API /search | CF Cache API | 1 min |
| Static assets | CF Pages | Immutable (hashed filenames) |
| OG images | R2 + CF cache | 7 days |

### 6. Error handling & resilience

- **External API failures**: Graceful degradation. If Steam API down → show cached data, log error
- **Meilisearch down**: Fallback to Postgres `ILIKE` search (slower but functional)
- **Report submission**: Optimistic UI + retry on failure
- **Rate limit hit**: Return 429 with `Retry-After` header, show user-friendly message

---

## ENV VARIABLES

```bash
# .env.example

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Cloudflare
CF_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=handhelddb

# Meilisearch
MEILISEARCH_HOST=https://search.handheldgamedb.com
MEILISEARCH_API_KEY=...
MEILISEARCH_ADMIN_KEY=...

# Auth
BETTER_AUTH_SECRET=...
STEAM_API_KEY=...             # steamcommunity.com/dev/apikey
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# External APIs
IGDB_CLIENT_ID=...            # Twitch Developer
IGDB_CLIENT_SECRET=...

# AI
ANTHROPIC_API_KEY=...

# Email
RESEND_API_KEY=...

# Analytics
PLAUSIBLE_DOMAIN=handheldgamedb.com

# Sentry
SENTRY_DSN=...

# App
PUBLIC_SITE_URL=https://handheldgamedb.com
PUBLIC_SITE_NAME=Handheld GameDB
```

---

## PRE-LAUNCH CHECKLIST

### Infrastruktura
- [ ] Domena zakupiona (handheldgamedb.com lub alternatywa)
- [ ] Supabase projekt utworzony (region: eu-central-1 lub us-east-1)
- [ ] Cloudflare Pages projekt skonfigurowany
- [ ] Hetzner VPS z Meilisearch (firewall: only CF IPs + SSH)
- [ ] Cloudflare R2 bucket
- [ ] Resend domain verification
- [ ] Sentry projekt

### Zewnętrzne klucze
- [ ] Steam Web API Key
- [ ] Google OAuth credentials
- [ ] Twitch/IGDB Developer App
- [ ] Anthropic API Key
- [ ] Plausible subscription

### Dane
- [ ] 3 urządzenia z pełnymi specs
- [ ] 600+ gier z metadanymi
- [ ] Deck Verified labels dla katalogu
- [ ] ProtonDB tiers
- [ ] ~2K+ imported reports (ShareDeck)
- [ ] 10-20 własnych verified testów
- [ ] Meilisearch zindeksowany i przetestowany

### SEO
- [ ] Google Search Console zweryfikowany
- [ ] Sitemap submitted
- [ ] JSON-LD na game pages
- [ ] OG images generowane
- [ ] robots.txt poprawny
- [ ] Canonical URLs

### Content
- [ ] 3-5 artykułów/poradników
- [ ] Landing page copy
- [ ] About page
- [ ] FAQ
- [ ] Privacy Policy + Terms of Service

### QA
- [ ] Mobile responsive (wszystkie strony)
- [ ] Auth flow (Steam + Google): login, logout, session persistence
- [ ] Report submission: all steps, validation, edge cases
- [ ] Comments: create, reply, edit, delete, flag, reactions
- [ ] Search: typo tolerance, filters, empty states
- [ ] 404 / 500 error pages
- [ ] Rate limiting works
- [ ] No XSS (DOMPurify on all user input)
- [ ] No SQL injection (Drizzle parameterized queries)
- [ ] CSRF protection (Better Auth handles)
- [ ] Core Web Vitals: LCP <2.5s, CLS <0.1, INP <200ms

---

## METRYKI SUKCESU

### Tydzień 1 po launch

| Metryka | Target | Red flag |
|---|---|---|
| Unique visitors | 1,000+ | <200 |
| Reports submitted (nie Twoje) | 20+ | <5 |
| Registered users | 100+ | <20 |
| Pages indexed (Google) | 100+ | <10 |
| Critical bugs | 0 | >3 |

### Miesiąc 1

| Metryka | Target | Red flag |
|---|---|---|
| Monthly visitors | 5,000+ | <1,000 |
| Community reports | 50+ | <20 |
| Returning visitors (weekly) | 100+ | <30 |
| Avg time on game page | >2 min | <30s |
| Google organic clicks | 500+ | <100 |

### Miesiąc 3

| Metryka | Target | Red flag → pivot |
|---|---|---|
| Monthly visitors | 15,000+ | <3,000 |
| Community reports | 300+ | <50 = brak PMF |
| Returning visitors (weekly) | 500+ | <100 |
| Google organic clicks | 3,000+ | <500 |
| Report "Yes" vote rate | >60% | <40% = bad data |

---

## BUDŻET MIESIĘCZNY (post-launch)

| Pozycja | Koszt/mies | Notatki |
|---|---|---|
| Supabase Pro | $25 | 8GB DB, 250GB bandwidth |
| Hetzner VPS (Meilisearch) | $5 | CAX11 ARM, 4GB RAM |
| Cloudflare Pages | $0 | Free tier (unlimited requests) |
| Cloudflare R2 | $0-5 | 10GB free, $0.015/GB |
| Domena | ~$1 | ~$12/rok |
| Plausible Analytics | $9 | 10K monthly pageviews tier |
| Resend | $0 | Free tier (100 emails/day) |
| Sentry | $0 | Free tier |
| Claude API | $5-30 | Haiku bulk + Sonnet editorial |
| **TOTAL** | **$45-75** | Skaluje się do ~300K visitors |

**Punkt eskalacji kosztów**: >100K visitors/mies → Supabase Pro $25→$50-100, VPS upgrade $10-20. Wciąż <$150/mies.
