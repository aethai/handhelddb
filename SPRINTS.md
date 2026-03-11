# HandheldDB — Sprint Plan

Generated: 2026-03-11
Status: ACTIVE

---

## Sprint 0: FUNDAMENT (fix what's broken)
**Goal:** Schema in sync, no broken pages, clean dead code
**Estimate:** 1 session

### Tasks:
- [x] S0-01: Add `proton_version` to Drizzle schema — already existed (DONE 2026-03-11)
- [x] S0-02: Add `recommended_profile` to Drizzle schema (DONE 2026-03-11)
- [x] S0-03: Complete TDP profile refactor — removed 3-bucket, kept `recommended_profile` only (DONE 2026-03-11)
- [x] S0-04: Update `cron-consensus.ts` to write `recommended_profile` (DONE 2026-03-11)
- [x] S0-05: Update GameDetailPanel + [device].astro to read `recommended_profile` (DONE 2026-03-11)
- [x] S0-06: Removed `settings_presets`, `game_versions`, `device_os_versions`, `comment_reactions` from schema (DONE 2026-03-11)
- [x] S0-07: Removed duplicate `utils/slugify.ts`, kept `utils.ts` with npm slugify (DONE 2026-03-11)
- [x] S0-08: Build clean, 156/156 unit tests pass (DONE 2026-03-11)
- [x] S0-09: Deploy + smoke test — all pages 200, zero 500 errors (DONE 2026-03-11)

**Status: COMPLETE** — All 9 tasks done in 1 session

---

## Sprint 1: CORE FLOW — Game Discovery → Detail → Report
**Goal:** The #1 user journey works perfectly end-to-end
**Estimate:** 2-3 sessions

### Tasks:

#### Search & Discovery
- [ ] S1-01: Verify Meilisearch index is up-to-date (run `cron-reindex-meilisearch.ts`, check result count vs DB)
- [ ] S1-02: Test search for 10 popular games — verify results, thumbnails, links all work
- [ ] S1-03: Test `/games` page filters (genre, deck compat, sort) — each combination returns correct results
- [ ] S1-04: Test `/discover` page — verify all curated lists show real games (no empty sections)
- [ ] S1-05: Fix empty state on `/games` when filters return 0 results

#### Game Detail Page
- [ ] S1-06: Audit `/games/[slug]` — verify ALL data renders: title, description, metadata, screenshots, consensus, reports
- [ ] S1-07: Audit `/games/[slug]/[device]` — verify device-specific view shows correct data
- [ ] S1-08: Fix any missing images (header_image, capsule_image) — add fallback placeholder
- [ ] S1-09: Verify game metadata: genres, developers, publishers, release date, Steam link, Deck compat badge
- [ ] S1-10: Test consensus display — does it show FPS, verdict, TDP, battery correctly for games that have it?
- [ ] S1-11: Test "no consensus yet" state — games with 0 reports should show clear CTA to submit one
- [ ] S1-12: Verify similar games section shows relevant results (not random/empty)

#### Report Submission
- [ ] S1-13: Test full report submission flow: login → select game → select device → fill form → submit
- [ ] S1-14: Verify ReportForm validation: required fields, FPS range (1-240), enum validation
- [ ] S1-15: Verify submitted report appears in game detail page (moderation_status handling)
- [ ] S1-16: Test duplicate report detection (one per user/game/device)
- [ ] S1-17: Verify report voting works: upvote, downvote, toggle, score recalculation

#### Consensus Pipeline
- [ ] S1-18: Run `cron-consensus.ts` manually — verify it produces correct results for existing reports
- [ ] S1-19: Verify consensus updates are reflected on game detail pages after cron run
- [ ] S1-20: Test consensus confidence levels (low/medium/high) display correctly

**Definition of Done:** A new user can search for a game, see its performance data (or "no data yet"), submit a report, and see it reflected in consensus after cron run.

---

## Sprint 2: DEVICE PAGES & COMPARISON
**Goal:** Device pages fully functional, comparison tool works
**Estimate:** 1-2 sessions

### Tasks:

#### Device Pages
- [ ] S2-01: Audit `/devices` index — verify all 6 devices display with correct specs
- [ ] S2-02: Audit `/devices/[slug]` — verify FULL page renders (was flagged as HALF-DONE)
- [ ] S2-03: Verify PerformanceHeatmap component shows correct data on device pages
- [ ] S2-04: Test device page with no performance data — should show meaningful empty state
- [ ] S2-05: Verify device specs are correct: TDP range, screen, chip, battery, weight
- [ ] S2-06: Remove hardcoded featured device slugs (`steam-deck-oled`, `rog-ally-x`) — fetch from DB or use data-driven logic

#### Comparison Tool
- [ ] S2-07: Audit `/compare` — verify CompareTable loads and all devices can be selected
- [ ] S2-08: Audit `/compare/[...slugs]` — verify dynamic URL comparison works (e.g., `/compare/steam-deck/rog-ally`)
- [ ] S2-09: Test comparison with 2 and 3 devices — specs table, shared games, winner highlighting
- [ ] S2-10: Test comparison battery estimator — does it produce reasonable numbers?
- [ ] S2-11: Fix empty state when compared devices have no shared games

**Definition of Done:** Every device page loads with real data, comparison tool works for any 2-3 device combo.

---

## Sprint 3: AUTH & USER PROFILES
**Goal:** Complete auth flow, user profiles work, user settings work
**Estimate:** 1-2 sessions

### Tasks:

#### Authentication
- [ ] S3-01: Test email/password registration end-to-end (register → confirm email → login)
- [ ] S3-02: Test Google OAuth login end-to-end
- [ ] S3-03: Test forgot password flow (request → email → reset → login)
- [ ] S3-04: Test change password (from profile settings)
- [ ] S3-05: Verify auth middleware: protected pages redirect to login, redirect back after auth
- [ ] S3-06: Verify session persistence: refresh page, close/reopen browser
- [ ] S3-07: Test logout — session cleared, cookies removed

#### User Profiles
- [ ] S3-08: Audit `/profile` page — verify all sections render: info, devices, reports, badges, settings
- [ ] S3-09: Test DevicePicker — add/remove devices from setup
- [ ] S3-10: Test SteamImport — import Steam library, verify games matched
- [ ] S3-11: Test BadgeGrid — verify badges display (earned vs locked)
- [ ] S3-12: Test profile editing: display name, username, notification preferences
- [ ] S3-13: Audit `/profile/[userId]` — public profile view works for any user
- [ ] S3-14: Verify user points and level calculations are correct

#### Leaderboard
- [ ] S3-15: Verify `/leaderboard` shows real users ranked by points
- [ ] S3-16: Test with only 1 user — should still render cleanly

**Definition of Done:** New user can register, set up profile, import Steam library, and appear on leaderboard.

---

## Sprint 4: SOCIAL FEATURES
**Goal:** Comments, notifications, follows all working and integrated
**Estimate:** 2 sessions

### Tasks:

#### Comments
- [ ] S4-01: Integrate CommentSection into game detail pages (currently not connected)
- [ ] S4-02: Test comment posting: write → submit → appears in thread
- [ ] S4-03: Test nested replies (up to depth 3)
- [ ] S4-04: Test comment voting: upvote/downvote with score display
- [ ] S4-05: Test comment editing (15-min window) and deletion
- [ ] S4-06: Test comment flagging
- [ ] S4-07: Verify HTML sanitization on comment body (XSS prevention)
- [ ] S4-08: Test empty comment section state (no comments yet)

#### Notifications
- [ ] S4-09: Integrate NotificationBell into Header component
- [ ] S4-10: Test notification creation: comment reply → notification appears
- [ ] S4-11: Test notification creation: report upvote → notification appears
- [ ] S4-12: Test mark as read (individual + mark all read)
- [ ] S4-13: Test notification polling (60s interval)
- [ ] S4-14: Verify notification count badge displays correctly

#### Follows
- [ ] S4-15: Integrate FollowButton into game detail pages
- [ ] S4-16: Test follow/unfollow toggle
- [ ] S4-17: Test follower count display
- [ ] S4-18: Consider: notifications when followed game gets new report?

**Definition of Done:** Users can comment on games, follow games, receive and read notifications.

---

## Sprint 5: CONTENT PIPELINE
**Goal:** All cron jobs work correctly, data quality is good
**Estimate:** 2 sessions

### Tasks:

#### Game Data
- [ ] S5-01: Run `cron-import-top-games.ts` — verify new games imported correctly
- [ ] S5-02: Run `cron-sync-steam.ts` — verify game metadata updated (descriptions, images, prices)
- [ ] S5-03: Run `cron-sync-protondb.ts` — verify ProtonDB tiers updated
- [ ] S5-04: Run `cron-enrich-games.ts` — verify HLTB hours, IGDB data enriched
- [ ] S5-05: Verify game images: how many games have header_image? capsule_image? Fix missing ones.
- [ ] S5-06: Run `cron-reindex-meilisearch.ts` — verify search index is complete and current

#### AI Reports
- [ ] S5-07: Run `cron-generate-reports.ts` — verify AI-generated reports are reasonable quality
- [ ] S5-08: Review AI report quality_tier = 'ai_estimated' — are they clearly marked in UI?
- [ ] S5-09: Verify AI reports don't pollute consensus (weight = 0.5 in algorithm)

#### News & Articles
- [ ] S5-10: Run `cron-ingest-news.ts` — verify RSS sources are being polled
- [ ] S5-11: Run `cron-generate-articles.ts` — verify articles generated from ingested news
- [ ] S5-12: Run `cron-youtube-import.ts` — verify YouTube videos imported as articles
- [ ] S5-13: Verify `/news` page shows recent articles with correct formatting
- [ ] S5-14: Verify `/news/[slug]` article detail page renders correctly
- [ ] S5-15: Check article quality — are AI-generated articles clearly marked?

#### Badges
- [ ] S5-16: Run `cron-award-badges.ts` — verify badges awarded to qualifying users
- [ ] S5-17: Verify badge definitions in seed data are complete

**Definition of Done:** All 11 cron jobs run without errors, data quality is acceptable, news pipeline produces readable content.

---

## Sprint 6: ADMIN PANEL
**Goal:** Full admin panel for content moderation
**Estimate:** 2 sessions

### Tasks:
- [ ] S6-01: Audit `/admin/index.astro` — verify dashboard stats are accurate
- [ ] S6-02: Complete `/admin/reports.astro` — list pending reports, approve/reject/flag actions
- [ ] S6-03: Complete `/admin/comments.astro` — moderate flagged comments, delete/unflag actions
- [ ] S6-04: Complete `/admin/users.astro` — user list, ban/unban, verify tester status, role assignment
- [ ] S6-05: Complete `/admin/devices.astro` — add/edit devices with all spec fields
- [ ] S6-06: Complete `/admin/articles.astro` — article list with status filter
- [ ] S6-07: Complete `/admin/articles/new.astro` — create article form (title, body, category, tags, cover)
- [ ] S6-08: Complete `/admin/articles/[id].astro` — edit existing article
- [ ] S6-09: Verify ALL admin API endpoints have proper admin auth guards
- [ ] S6-10: Test admin actions end-to-end: approve report → consensus updates → game page reflects

**Definition of Done:** Admin can manage all content types (reports, comments, users, devices, articles) from the panel.

---

## Sprint 7: TESTING & QUALITY
**Goal:** Automated tests, no regressions
**Estimate:** 2 sessions

### Tasks:

#### Unit Tests
- [ ] S7-01: Verify existing 9 test files pass
- [ ] S7-02: Add unit tests for all API route validation (reports, comments, votes, follows)
- [ ] S7-03: Add unit tests for consensus algorithm edge cases
- [ ] S7-04: Add unit tests for auth helpers (token refresh, session management)
- [ ] S7-05: Add unit tests for cache module (TTL, invalidation)

#### Integration Tests
- [ ] S7-06: Add API integration tests: POST report → GET report → verify data
- [ ] S7-07: Add API integration tests: POST comment → GET comments → verify threading
- [ ] S7-08: Add API integration tests: register → login → protected endpoint access

#### E2E Tests
- [ ] S7-09: Set up Playwright
- [ ] S7-10: E2E: Homepage loads, search works, game page navigable
- [ ] S7-11: E2E: Register → login → submit report → see on game page
- [ ] S7-12: E2E: Device comparison flow
- [ ] S7-13: E2E: Admin login → approve report → verify

#### Performance
- [ ] S7-14: Lighthouse audit on homepage, game detail, device page (target: 90+ performance)
- [ ] S7-15: Check all pages render under 2s on server
- [ ] S7-16: Verify Nginx caching is working (check cache hit headers)

**Definition of Done:** All existing tests pass, 40%+ coverage, E2E covers critical flows, Lighthouse 90+.

---

## Sprint 8: POLISH & UX
**Goal:** Mobile responsive, accessible, no rough edges
**Estimate:** 2 sessions

### Tasks:

#### Mobile
- [ ] S8-01: Test ALL pages at 480px width — fix layout breaks
- [ ] S8-02: Test ALL pages at 768px width — fix tablet layout
- [ ] S8-03: Test touch interactions: search, filters, dropdowns, modals
- [ ] S8-04: Test mobile menu navigation

#### Accessibility
- [ ] S8-05: All images have alt text
- [ ] S8-06: All interactive elements keyboard-navigable
- [ ] S8-07: Color contrast meets WCAG AA (especially neon lime on dark)
- [ ] S8-08: Screen reader test on game detail page

#### Error States
- [ ] S8-09: Audit every page for proper error states (API down, no data, network error)
- [ ] S8-10: Verify 404 page works for invalid game slugs
- [ ] S8-11: Verify 500 page renders when server errors occur
- [ ] S8-12: Add rate limit exceeded user-facing message

#### UI Consistency
- [ ] S8-13: Audit spacing, fonts, colors across all pages (match design system)
- [ ] S8-14: Remove unused CSS from global.css (~8-12% estimated dead code)
- [ ] S8-15: Verify dark/light theme toggle works on all pages
- [ ] S8-16: Check loading skeletons/spinners are consistent

**Definition of Done:** Pixel-perfect on mobile, all error states handled, WCAG AA compliant.

---

## Sprint 9: SEO & GROWTH
**Goal:** Discoverable, shareable, ready for users
**Estimate:** 1 session

### Tasks:
- [ ] S9-01: Verify sitemap.xml includes all game, device, and article URLs
- [ ] S9-02: Verify robots.txt is correct (no blocking of important pages)
- [ ] S9-03: Add JSON-LD structured data to game pages (VideoGame schema)
- [ ] S9-04: Verify OG meta tags on all page types (test with social media debuggers)
- [ ] S9-05: Add canonical URLs to all pages
- [ ] S9-06: Verify RSS feed is valid and includes recent articles
- [ ] S9-07: Set up Plausible/analytics (check if already configured)
- [ ] S9-08: Add social sharing buttons to game pages and articles
- [ ] S9-09: Create landing pages for top searched terms (e.g., "Elden Ring Steam Deck settings")

**Definition of Done:** Google Search Console shows pages indexed, social shares show correct previews.

---

## PRIORITY ORDER

| Priority | Sprint | Sessions | Impact |
|----------|--------|----------|--------|
| P0 | Sprint 0: FUNDAMENT | 1 | Fix broken foundation |
| P1 | Sprint 1: CORE FLOW | 2-3 | Main user journey works |
| P2 | Sprint 2: DEVICES | 1-2 | Second most important pages |
| P3 | Sprint 3: AUTH | 1-2 | Users can actually use the site |
| P4 | Sprint 4: SOCIAL | 2 | Community engagement |
| P5 | Sprint 5: CONTENT | 2 | Automated data quality |
| P6 | Sprint 6: ADMIN | 2 | Content moderation |
| P7 | Sprint 7: TESTING | 2 | Regression prevention |
| P8 | Sprint 8: POLISH | 2 | Production-ready UX |
| P9 | Sprint 9: SEO | 1 | Growth & discoverability |

**Total: ~100 tasks across 9 sprints (~16-19 sessions)**

---

## TRACKING

When starting a sprint, move tasks to "In Progress" in this file.
When done, mark with [x] and add completion date.

Format: `- [x] S0-01: Task description (DONE 2026-03-11)`
