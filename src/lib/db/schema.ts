import {
  pgTable,
  text,
  integer,
  smallint,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============ ENUMS ============

export const deckCompatEnum = pgEnum('deck_compat', [
  'verified',
  'playable',
  'unsupported',
  'unknown',
]);

export const protondbTierEnum = pgEnum('protondb_tier', [
  'platinum',
  'gold',
  'silver',
  'bronze',
  'borked',
  'pending',
]);

export const qualityTierEnum = pgEnum('quality_tier', [
  'verified',
  'community_confirmed',
  'reported',
  'ai_estimated',
  'imported',
]);

export const fpsTargetEnum = pgEnum('fps_target', ['30', '40', '60', '120']);

export const fpsStabilityEnum = pgEnum('fps_stability', [
  'stable',
  'mostly_stable',
  'unstable',
]);

export const overallRatingEnum = pgEnum('overall_rating', [
  'excellent',
  'good',
  'fair',
  'poor',
  'unplayable',
]);

export const thermalEnum = pgEnum('thermal', ['cool', 'warm', 'hot']);

export const fanNoiseEnum = pgEnum('fan_noise', [
  'silent',
  'quiet',
  'audible',
  'loud',
]);

export const controllerStatusEnum = pgEnum('controller_status', [
  'works_oob',
  'needs_remap',
  'broken',
  'unknown',
]);

export const antiCheatStatusEnum = pgEnum('anticheat_status', [
  'works',
  'broken',
  'not_applicable',
  'unknown',
]);

export const suspendStatusEnum = pgEnum('suspend_status', [
  'works',
  'issues',
  'broken',
  'unknown',
]);

export const fsrModeEnum = pgEnum('fsr_mode', [
  'quality',
  'balanced',
  'performance',
  'ultra_performance',
]);

export const presetEnum = pgEnum('preset', [
  'ultra_low',
  'low',
  'medium',
  'high',
  'ultra',
  'custom',
]);

// ============ GAMES ============

export const games = pgTable(
  'games',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    steamAppid: integer('steam_appid').unique(),
    igdbId: integer('igdb_id'),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    shortDescription: text('short_description'),
    headerImage: text('header_image'),
    capsuleImage: text('capsule_image'),
    screenshots: jsonb('screenshots').$type<string[]>().default([]),

    // Classification
    genres: jsonb('genres').$type<string[]>().default([]),
    tags: jsonb('tags').$type<string[]>().default([]),
    developers: jsonb('developers').$type<string[]>().default([]),
    publishers: jsonb('publishers').$type<string[]>().default([]),

    // External scores
    metacriticScore: integer('metacritic_score'),
    metacriticUrl: text('metacritic_url'),
    steamReviewScore: integer('steam_review_score'),
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
    steamspyOwners: text('steamspy_owners'),
    steamspyCcu: integer('steamspy_ccu'),

    // Performance classification
    performanceTier: text('performance_tier'),

    // Anti-cheat
    anticheatEngine: text('anticheat_engine'), // "EAC", "BattlEye", "Vanguard", null

    // Cached stats (denormalized)
    cachedStats: jsonb('cached_stats').$type<Record<string, unknown>>().default({}),

    // Sync tracking
    steamBuildId: text('steam_build_id'),
    lastSteamSync: timestamp('last_steam_sync'),
    lastIgdbSync: timestamp('last_igdb_sync'),
    lastProtondbSync: timestamp('last_protondb_sync'),
    lastMajorUpdate: timestamp('last_major_update'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_games_steam_appid').on(table.steamAppid),
    index('idx_games_slug').on(table.slug),
    index('idx_games_release_date').on(table.releaseDate),
    index('idx_games_metacritic').on(table.metacriticScore),
  ],
);

// ============ DEVICES ============

export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  manufacturer: text('manufacturer').notNull(),

  // Hardware specs
  chip: text('chip'),
  gpu: text('gpu'),
  ramGb: integer('ram_gb'),
  storageGb: integer('storage_gb'),
  screenResolution: text('screen_resolution'),
  screenSize: real('screen_size'),
  screenType: text('screen_type'),
  batteryWh: real('battery_wh'),
  tdpMin: real('tdp_min'),
  tdpMax: real('tdp_max'),
  tdpDefault: real('tdp_default'),
  weightGrams: integer('weight_grams'),

  // Software
  defaultOs: text('default_os'),
  supportsWindows: boolean('supports_windows').default(true),

  // Pricing
  msrpUsd: real('msrp_usd'),
  buyUrl: text('buy_url'),

  // Media
  image: text('image'),

  // Classification
  chipsetGeneration: text('chipset_generation'), // "RDNA 2", "RDNA 3.5"
  formFactor: text('form_factor'), // "clamshell", "slab", "slider"

  releaseDate: timestamp('release_date'),
  isActive: boolean('is_active').default(true),
  discontinued: boolean('discontinued').default(false),

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
  level: text('level').default('new_tester'),
  isVerifiedTester: boolean('is_verified_tester').default(false),
  isAdmin: boolean('is_admin').default(false),
  isModerator: boolean('is_moderator').default(false),
  isBanned: boolean('is_banned').default(false),

  // My Setup
  primaryDeviceId: uuid('primary_device_id').references(() => devices.id),

  // Supporter
  supporterTier: text('supporter_tier'),
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
export const userDevices = pgTable(
  'user_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    deviceId: uuid('device_id')
      .references(() => devices.id)
      .notNull(),
    isPrimary: boolean('is_primary').default(false),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_device').on(table.userId, table.deviceId),
  ],
);

// User's Steam library
export const userLibrary = pgTable(
  'user_library',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    gameId: uuid('game_id')
      .references(() => games.id)
      .notNull(),
    playtimeMinutes: integer('playtime_minutes').default(0),
    importedAt: timestamp('imported_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_library').on(table.userId, table.gameId),
  ],
);

// ============ PERFORMANCE REPORTS ============

export const performanceReports = pgTable(
  'performance_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .references(() => games.id)
      .notNull(),
    deviceId: uuid('device_id')
      .references(() => devices.id)
      .notNull(),
    userId: uuid('user_id').references(() => users.id),

    // FPS data
    fpsAvg: real('fps_avg').notNull(),
    fpsLow: real('fps_low'),
    fpsTarget: fpsTargetEnum('fps_target'),
    fpsStability: fpsStabilityEnum('fps_stability'),

    // Graphics settings
    resolution: text('resolution'),
    preset: presetEnum('preset'),
    fsrEnabled: boolean('fsr_enabled').default(false),
    fsrMode: fsrModeEnum('fsr_mode'),
    customSettings: jsonb('custom_settings').$type<
      Record<string, string>
    >(),

    // Power & thermal
    tdpLimitWatts: real('tdp_limit_watts'),
    gpuClockMhz: integer('gpu_clock_mhz'),
    batteryLifeHours: real('battery_life_hours'),
    thermal: thermalEnum('thermal'),
    fanNoise: fanNoiseEnum('fan_noise'),

    // Compatibility
    controllerStatus:
      controllerStatusEnum('controller_status').default('unknown'),
    antiCheatStatus:
      antiCheatStatusEnum('anticheat_status').default('unknown'),
    suspendStatus: suspendStatusEnum('suspend_status').default('unknown'),

    // Overall
    overallRating: overallRatingEnum('overall_rating').notNull(),
    notes: text('notes'),
    screenshots: jsonb('screenshots').$type<string[]>().default([]),

    // Versioning
    gameVersion: text('game_version'),
    steamBuildId: text('steam_build_id'),
    osVersion: text('os_version'),
    protonVersion: text('proton_version'),
    gpuDriverVersion: text('gpu_driver_version'),

    // Quality & moderation
    qualityTier: qualityTierEnum('quality_tier').default('reported'),
    upvotes: integer('upvotes').default(0),
    downvotes: integer('downvotes').default(0),
    isFlagged: boolean('is_flagged').default(false),
    isStale: boolean('is_stale').default(false),
    staleReason: text('stale_reason'),

    // Moderation
    moderationStatus: text('moderation_status').default('approved'),
    source: text('source').default('manual'), // "manual", "decky_plugin", "desktop_app"
    crashCount: smallint('crash_count').default(0),

    // Source tracking
    importSource: text('import_source'),
    importSourceId: text('import_source_id'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_reports_game').on(table.gameId),
    index('idx_reports_device').on(table.deviceId),
    index('idx_reports_game_device').on(table.gameId, table.deviceId),
    index('idx_reports_user').on(table.userId),
    index('idx_reports_quality').on(table.qualityTier),
    index('idx_reports_created').on(table.createdAt),
  ],
);

// Report votes
export const reportVotes = pgTable(
  'report_votes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
      .references(() => performanceReports.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    isUpvote: boolean('is_upvote').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_vote_unique').on(table.reportId, table.userId),
  ],
);

// ============ CONSENSUS RATINGS ============

export interface TDPProfile {
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

export const consensusRatings = pgTable(
  'consensus_ratings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .references(() => games.id)
      .notNull(),
    deviceId: uuid('device_id')
      .references(() => devices.id)
      .notNull(),

    // Consensus values
    fpsAvg: real('fps_avg'),
    fpsLow: real('fps_low'),
    recommendedPreset: presetEnum('recommended_preset'),
    recommendedResolution: text('recommended_resolution'),
    recommendedTdp: real('recommended_tdp'),
    estimatedBattery: real('estimated_battery'),
    typicalThermal: thermalEnum('typical_thermal'),
    typicalFanNoise: fanNoiseEnum('typical_fan_noise'),

    // TDP profiles (3 tiers)
    batterySaverProfile:
      jsonb('battery_saver_profile').$type<TDPProfile>(),
    balancedProfile: jsonb('balanced_profile').$type<TDPProfile>(),
    performanceProfile: jsonb('performance_profile').$type<TDPProfile>(),

    // Quality metrics
    reportCount: integer('report_count').default(0),
    confidenceLevel: text('confidence_level'),
    overallVerdict: overallRatingEnum('overall_verdict'),
    weightedScore: real('weighted_score'),

    lastCalculated: timestamp('last_calculated').defaultNow(),
    isStale: boolean('is_stale').default(false),
  },
  (table) => [
    uniqueIndex('idx_consensus_game_device').on(table.gameId, table.deviceId),
  ],
);

// ============ COMMENTS ============

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .references(() => games.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    parentId: uuid('parent_id'),
    depth: integer('depth').default(0),

    body: text('body').notNull(),
    bodyHtml: text('body_html').notNull(),

    upvotes: integer('upvotes').default(0),
    downvotes: integer('downvotes').default(0),

    isEdited: boolean('is_edited').default(false),
    editedAt: timestamp('edited_at'),
    isDeleted: boolean('is_deleted').default(false),
    isFlagged: boolean('is_flagged').default(false),
    isShadowBanned: boolean('is_shadow_banned').default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_comments_game').on(table.gameId),
    index('idx_comments_parent').on(table.parentId),
    index('idx_comments_user').on(table.userId),
  ],
);

// Comment reactions
export const commentReactions = pgTable(
  'comment_reactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    commentId: uuid('comment_id')
      .references(() => comments.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    emoji: varchar('emoji', { length: 10 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_reaction_unique').on(
      table.commentId,
      table.userId,
      table.emoji,
    ),
  ],
);

// Comment votes
export const commentVotes = pgTable(
  'comment_votes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    commentId: uuid('comment_id')
      .references(() => comments.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    isUpvote: boolean('is_upvote').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_comment_vote_unique').on(table.commentId, table.userId),
  ],
);

// ============ NOTIFICATIONS ============

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    url: text('url'),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user').on(table.userId),
    index('idx_notifications_unread').on(table.userId, table.isRead),
  ],
);

// ============ GAME FOLLOWS ============

export const gameFollows = pgTable(
  'game_follows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    gameId: uuid('game_id')
      .references(() => games.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_follow_unique').on(table.userId, table.gameId),
  ],
);

// ============ BADGES ============

export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  category: text('category'),
});

export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    badgeId: uuid('badge_id')
      .references(() => badges.id)
      .notNull(),
    earnedAt: timestamp('earned_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_badge').on(table.userId, table.badgeId),
  ],
);

// ============ GAME VERSIONS ============

export const gameVersions = pgTable(
  'game_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .references(() => games.id, { onDelete: 'cascade' })
      .notNull(),
    versionString: text('version_string').notNull(),
    steamBuildId: text('steam_build_id'),
    detectedAt: timestamp('detected_at').defaultNow().notNull(),
    releaseNotesUrl: text('release_notes_url'),
    isMajor: boolean('is_major').default(false),
    performanceImpact: integer('performance_impact'), // -2..+2
  },
  (table) => [
    index('idx_game_versions_game').on(table.gameId),
    uniqueIndex('idx_game_versions_unique').on(
      table.gameId,
      table.steamBuildId,
    ),
  ],
);

// ============ DEVICE OS VERSIONS ============

export const deviceOsVersions = pgTable(
  'device_os_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: uuid('device_id')
      .references(() => devices.id)
      .notNull(),
    osName: text('os_name').notNull(),
    osVersion: text('os_version').notNull(),
    driverVersion: text('driver_version'),
    detectedAt: timestamp('detected_at').defaultNow(),
    notes: text('notes'),
  },
  (table) => [
    uniqueIndex('idx_device_os_unique').on(
      table.deviceId,
      table.osVersion,
      table.driverVersion,
    ),
  ],
);

// ============ SETTINGS PRESETS ============

export const settingsPresets = pgTable('settings_presets', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id')
    .references(() => games.id)
    .notNull(),
  deviceId: uuid('device_id').references(() => devices.id),
  name: text('name').notNull(),
  settings: jsonb('settings').notNull(),
  source: text('source'),
  usageCount: integer('usage_count').default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============ NEWS & ARTICLES ============

export const newsCategoryEnum = pgEnum('news_category', [
  'device_launch',
  'device_update',
  'os_update',
  'driver_update',
  'game_patch',
  'game_launch',
  'sale_event',
  'performance_analysis',
  'industry',
  'editorial',
]);

export const newsStatusEnum = pgEnum('news_status', [
  'draft',
  'in_review',
  'published',
  'archived',
]);

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 300 }).notNull().unique(),
    title: text('title').notNull(),
    lead: text('lead').notNull(),
    body: text('body').notNull(),
    bodyHtml: text('body_html').notNull(),
    coverImage: text('cover_image'),
    category: newsCategoryEnum('category').notNull(),
    tags: jsonb('tags').$type<string[]>().default([]),
    devices: jsonb('devices').$type<string[]>().default([]),
    authorId: uuid('author_id').references(() => users.id),
    relatedGameIds: jsonb('related_game_ids').$type<string[]>().default([]),
    status: newsStatusEnum('status').default('draft'),
    publishedAt: timestamp('published_at'),
    aiGenerated: boolean('ai_generated').default(false),
    aiModel: text('ai_model'),
    sourceUrls: jsonb('source_urls').$type<string[]>().default([]),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    viewCount: integer('view_count').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_articles_slug').on(table.slug),
    index('idx_articles_published').on(table.publishedAt),
    index('idx_articles_status').on(table.status),
  ],
);

export const newsSources = pgTable('news_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  url: text('url').notNull(),
  isActive: boolean('is_active').default(true),
  lastChecked: timestamp('last_checked'),
  checkIntervalMinutes: integer('check_interval_minutes').default(60),
});

export const newsIngested = pgTable(
  'news_ingested',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .references(() => newsSources.id)
      .notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    url: text('url'),
    content: text('content'),
    ingestedAt: timestamp('ingested_at').defaultNow().notNull(),
    processed: boolean('processed').default(false),
    articleId: uuid('article_id').references(() => articles.id),
    discarded: boolean('discarded').default(false),
  },
  (table) => [
    uniqueIndex('idx_ingested_external').on(table.sourceId, table.externalId),
  ],
);
