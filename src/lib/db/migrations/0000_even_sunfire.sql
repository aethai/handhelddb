CREATE TYPE "public"."anticheat_status" AS ENUM('works', 'broken', 'not_applicable', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."controller_status" AS ENUM('works_oob', 'needs_remap', 'broken', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."deck_compat" AS ENUM('verified', 'playable', 'unsupported', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."fan_noise" AS ENUM('silent', 'quiet', 'audible', 'loud');--> statement-breakpoint
CREATE TYPE "public"."fps_stability" AS ENUM('stable', 'mostly_stable', 'unstable');--> statement-breakpoint
CREATE TYPE "public"."fps_target" AS ENUM('30', '40', '60', '120');--> statement-breakpoint
CREATE TYPE "public"."fsr_mode" AS ENUM('quality', 'balanced', 'performance', 'ultra_performance');--> statement-breakpoint
CREATE TYPE "public"."news_category" AS ENUM('device_launch', 'device_update', 'os_update', 'driver_update', 'game_patch', 'game_launch', 'sale_event', 'performance_analysis', 'industry', 'editorial');--> statement-breakpoint
CREATE TYPE "public"."news_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."overall_rating" AS ENUM('excellent', 'good', 'fair', 'poor', 'unplayable');--> statement-breakpoint
CREATE TYPE "public"."preset" AS ENUM('ultra_low', 'low', 'medium', 'high', 'ultra', 'custom');--> statement-breakpoint
CREATE TYPE "public"."protondb_tier" AS ENUM('platinum', 'gold', 'silver', 'bronze', 'borked', 'pending');--> statement-breakpoint
CREATE TYPE "public"."quality_tier" AS ENUM('verified', 'community_confirmed', 'reported', 'ai_estimated', 'imported');--> statement-breakpoint
CREATE TYPE "public"."suspend_status" AS ENUM('works', 'issues', 'broken', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."thermal" AS ENUM('cool', 'warm', 'hot');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(300) NOT NULL,
	"title" text NOT NULL,
	"lead" text NOT NULL,
	"body" text NOT NULL,
	"body_html" text NOT NULL,
	"cover_image" text,
	"category" "news_category" NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"devices" jsonb DEFAULT '[]'::jsonb,
	"author_id" uuid,
	"related_game_ids" jsonb DEFAULT '[]'::jsonb,
	"status" "news_status" DEFAULT 'draft',
	"published_at" timestamp,
	"ai_generated" boolean DEFAULT false,
	"ai_model" text,
	"source_urls" jsonb DEFAULT '[]'::jsonb,
	"meta_title" text,
	"meta_description" text,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"category" text,
	CONSTRAINT "badges_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_upvote" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"depth" integer DEFAULT 0,
	"body" text NOT NULL,
	"body_html" text NOT NULL,
	"upvotes" integer DEFAULT 0,
	"downvotes" integer DEFAULT 0,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"is_flagged" boolean DEFAULT false,
	"is_shadow_banned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consensus_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"fps_avg" real,
	"fps_low" real,
	"recommended_preset" "preset",
	"recommended_resolution" text,
	"recommended_tdp" real,
	"estimated_battery" real,
	"typical_thermal" "thermal",
	"typical_fan_noise" "fan_noise",
	"battery_saver_profile" jsonb,
	"balanced_profile" jsonb,
	"performance_profile" jsonb,
	"report_count" integer DEFAULT 0,
	"confidence_level" text,
	"overall_verdict" "overall_rating",
	"weighted_score" real,
	"last_calculated" timestamp DEFAULT now(),
	"is_stale" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "device_os_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"os_name" text NOT NULL,
	"os_version" text NOT NULL,
	"driver_version" text,
	"detected_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"manufacturer" text NOT NULL,
	"chip" text,
	"gpu" text,
	"ram_gb" integer,
	"storage_gb" integer,
	"screen_resolution" text,
	"screen_size" real,
	"screen_type" text,
	"battery_wh" real,
	"tdp_min" real,
	"tdp_max" real,
	"tdp_default" real,
	"weight_grams" integer,
	"default_os" text,
	"supports_windows" boolean DEFAULT true,
	"msrp_usd" real,
	"buy_url" text,
	"image" text,
	"chipset_generation" text,
	"form_factor" text,
	"release_date" timestamp,
	"is_active" boolean DEFAULT true,
	"discontinued" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "game_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"version_string" text NOT NULL,
	"steam_build_id" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"release_notes_url" text,
	"is_major" boolean DEFAULT false,
	"performance_impact" integer
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_appid" integer,
	"igdb_id" integer,
	"name" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"short_description" text,
	"header_image" text,
	"capsule_image" text,
	"screenshots" jsonb DEFAULT '[]'::jsonb,
	"genres" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"developers" jsonb DEFAULT '[]'::jsonb,
	"publishers" jsonb DEFAULT '[]'::jsonb,
	"metacritic_score" integer,
	"metacritic_url" text,
	"steam_review_score" integer,
	"steam_review_count" integer,
	"protondb_tier" "protondb_tier" DEFAULT 'pending',
	"deck_compatibility" "deck_compat" DEFAULT 'unknown',
	"release_date" timestamp,
	"price_usd" real,
	"is_free_to_play" boolean DEFAULT false,
	"hltb_main_hours" real,
	"hltb_extra_hours" real,
	"hltb_completionist_hours" real,
	"steamspy_owners" text,
	"steamspy_ccu" integer,
	"performance_tier" text,
	"anticheat_engine" text,
	"cached_stats" jsonb DEFAULT '{}'::jsonb,
	"steam_build_id" text,
	"last_steam_sync" timestamp,
	"last_igdb_sync" timestamp,
	"last_protondb_sync" timestamp,
	"last_major_update" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_steam_appid_unique" UNIQUE("steam_appid"),
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "news_ingested" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"content" text,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	"processed" boolean DEFAULT false,
	"article_id" uuid,
	"discarded" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "news_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_checked" timestamp,
	"check_interval_minutes" integer DEFAULT 60
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"url" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"user_id" uuid,
	"fps_avg" real NOT NULL,
	"fps_low" real,
	"fps_target" "fps_target",
	"fps_stability" "fps_stability",
	"resolution" text,
	"preset" "preset",
	"fsr_enabled" boolean DEFAULT false,
	"fsr_mode" "fsr_mode",
	"custom_settings" jsonb,
	"tdp_limit_watts" real,
	"gpu_clock_mhz" integer,
	"battery_life_hours" real,
	"thermal" "thermal",
	"fan_noise" "fan_noise",
	"controller_status" "controller_status" DEFAULT 'unknown',
	"anticheat_status" "anticheat_status" DEFAULT 'unknown',
	"suspend_status" "suspend_status" DEFAULT 'unknown',
	"overall_rating" "overall_rating" NOT NULL,
	"notes" text,
	"screenshots" jsonb DEFAULT '[]'::jsonb,
	"game_version" text,
	"steam_build_id" text,
	"os_version" text,
	"gpu_driver_version" text,
	"quality_tier" "quality_tier" DEFAULT 'reported',
	"upvotes" integer DEFAULT 0,
	"downvotes" integer DEFAULT 0,
	"is_flagged" boolean DEFAULT false,
	"is_stale" boolean DEFAULT false,
	"stale_reason" text,
	"moderation_status" text DEFAULT 'approved',
	"source" text DEFAULT 'manual',
	"crash_count" smallint DEFAULT 0,
	"import_source" text,
	"import_source_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_upvote" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"device_id" uuid,
	"name" text NOT NULL,
	"settings" jsonb NOT NULL,
	"source" text,
	"usage_count" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"playtime_minutes" integer DEFAULT 0,
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"username" varchar(50),
	"display_name" text,
	"avatar_url" text,
	"steam_id" text,
	"google_id" text,
	"points" integer DEFAULT 0,
	"level" text DEFAULT 'new_tester',
	"is_verified_tester" boolean DEFAULT false,
	"is_admin" boolean DEFAULT false,
	"is_moderator" boolean DEFAULT false,
	"is_banned" boolean DEFAULT false,
	"primary_device_id" uuid,
	"supporter_tier" text,
	"supporter_since" timestamp,
	"email_notifications" boolean DEFAULT true,
	"notify_on_reply" boolean DEFAULT true,
	"notify_on_vote" boolean DEFAULT false,
	"weekly_digest" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_steam_id_unique" UNIQUE("steam_id"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consensus_ratings" ADD CONSTRAINT "consensus_ratings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consensus_ratings" ADD CONSTRAINT "consensus_ratings_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_os_versions" ADD CONSTRAINT "device_os_versions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_follows" ADD CONSTRAINT "game_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_follows" ADD CONSTRAINT "game_follows_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_versions" ADD CONSTRAINT "game_versions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_ingested" ADD CONSTRAINT "news_ingested_source_id_news_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."news_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_ingested" ADD CONSTRAINT "news_ingested_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reports" ADD CONSTRAINT "performance_reports_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reports" ADD CONSTRAINT "performance_reports_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reports" ADD CONSTRAINT "performance_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_votes" ADD CONSTRAINT "report_votes_report_id_performance_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."performance_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_votes" ADD CONSTRAINT "report_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_presets" ADD CONSTRAINT "settings_presets_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_presets" ADD CONSTRAINT "settings_presets_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_presets" ADD CONSTRAINT "settings_presets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_library" ADD CONSTRAINT "user_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_library" ADD CONSTRAINT "user_library_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_primary_device_id_devices_id_fk" FOREIGN KEY ("primary_device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_articles_slug" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_articles_published" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_articles_status" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reaction_unique" ON "comment_reactions" USING btree ("comment_id","user_id","emoji");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_comment_vote_unique" ON "comment_votes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_comments_game" ON "comments" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_comments_user" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_consensus_game_device" ON "consensus_ratings" USING btree ("game_id","device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_device_os_unique" ON "device_os_versions" USING btree ("device_id","os_version","driver_version");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_follow_unique" ON "game_follows" USING btree ("user_id","game_id");--> statement-breakpoint
CREATE INDEX "idx_game_versions_game" ON "game_versions" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_game_versions_unique" ON "game_versions" USING btree ("game_id","steam_build_id");--> statement-breakpoint
CREATE INDEX "idx_games_steam_appid" ON "games" USING btree ("steam_appid");--> statement-breakpoint
CREATE INDEX "idx_games_slug" ON "games" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_games_release_date" ON "games" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "idx_games_metacritic" ON "games" USING btree ("metacritic_score");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ingested_external" ON "news_ingested" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_reports_game" ON "performance_reports" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_reports_device" ON "performance_reports" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "idx_reports_game_device" ON "performance_reports" USING btree ("game_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_reports_user" ON "performance_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reports_quality" ON "performance_reports" USING btree ("quality_tier");--> statement-breakpoint
CREATE INDEX "idx_reports_created" ON "performance_reports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vote_unique" ON "report_votes" USING btree ("report_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_badge" ON "user_badges" USING btree ("user_id","badge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_device" ON "user_devices" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_library" ON "user_library" USING btree ("user_id","game_id");