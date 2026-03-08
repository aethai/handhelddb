# Handheld GameDB — Plan Implementacji v2.0

> **Data aktualizacji**: 8 marca 2026
> Zaktualizowany plan uwzględniający analizy 6 agentów specjalistycznych (architektura, features, rynek, newsy, dane, biznes) oraz decyzje architektoniczne.

---

## Podsumowanie zmian vs v1.0

- **Hosting**: VPS OVH (self-hosted) zamiast Cloudflare Pages/Workers — Astro z adapterem `@astrojs/node`
- **Auth**: Supabase Auth zamiast Better Auth — wbudowany, darmowy, mniej kodu
- **Formularz raportu**: 4 kroki zamiast 7 — wyższy completion rate
- **Newsy**: Od startu z MVP (nie odłożone na Fazę 7) — SEO + traffic od dnia 1
- **Schema**: Nowe tabele (`game_versions`, `device_os_versions`, `settings_presets`), UUID v7
- **Urządzenia**: 4 na start (+ Steam Deck LCD), nie 3
- **Budżet**: Elastyczny ($5-10/mo na start, skalowanie z ruchem)
- **Launch**: Budowa MVP od razu, bez walidacji landing page

---

## 1. Wizja projektu

**Handheld GameDB** — uniwersalna baza danych wydajności gier na handheldach PC. Użytkownik wybiera grę + urządzenie → dostaje optymalne ustawienia w 3 profilach TDP (Battery Saver / Balanced / Performance).

**USP**: "Optimal Settings Finder" — jedyne miejsce, które daje konkretne ustawienia dla konkretnej kombinacji gra × urządzenie, zamiast ogólnych recenzji.

**Grupa docelowa**: Właściciele handheldów PC (Steam Deck, ROG Ally, Legion Go, MSI Claw, AYANEO) — szacunkowo 6-8M globalnie.

---

## 2. Stack technologiczny

### 2.1 Frontend: Astro 5 + React 19 + Tailwind 4

**Astro 5** z Island Architecture — 80%+ stron to statyczny HTML, interaktywne fragmenty (formularz, głosowanie, komentarze) jako React islands.

```astro
<!-- Strona gry — główna treść statyczna, wyspy dynamiczne -->
<GameHeader game={game} />
<PerformanceTable device={device} reports={cachedReports} />

<!-- Server Island — odroczone, zawsze świeże -->
<RecentReports server:defer gameId={game.id}>
  <LoadingSkeleton slot="fallback" />
</RecentReports>

<!-- React Island — interaktywne -->
<SubmitReportForm client:visible gameId={game.id} />
```

**React 19** z opcjonalnym aliasem na **Preact** (~4KB vs ~42KB):

```javascript
// astro.config.mjs — opcjonalna optymalizacja
export default defineConfig({
  vite: {
    resolve: {
      alias: {
        'react': 'preact/compat',
        'react-dom': 'preact/compat',
        'react-dom/client': 'preact/compat/client',
      }
    }
  }
});
```

**Tailwind 4** — utility-first CSS.

### 2.2 Backend: Astro Node.js SSR na VPS

Astro w trybie `output: 'server'` z adapterem `@astrojs/node`:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',  // Node.js HTTP server
  }),
  integrations: [react(), tailwind()],
});
```

Astro Actions zamiast ręcznych API routes:

```typescript
// src/actions/index.ts
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
  submitReport: defineAction({
    accept: 'form',
    input: z.object({
      gameId: z.string().uuid(),
      deviceId: z.string().uuid(),
      fpsAvg: z.number().min(1).max(240),
      preset: z.enum(['ultra_low', 'low', 'medium', 'high', 'ultra', 'custom']),
      overallRating: z.enum(['excellent', 'good', 'fair', 'poor', 'unplayable']),
      notes: z.string().max(2000).optional(),
    }),
    handler: async (input, context) => {
      const user = context.locals.user;
      if (!user) throw new ActionError({ code: 'UNAUTHORIZED' });
      // ... zapis do Supabase
    }
  }),
};
```

### 2.3 Baza danych: Supabase (PostgreSQL 15)

- **Free tier** na start (500MB DB, 50K auth users, 5GB bandwidth)
- **Pro ($25/mo)** gdy przekroczymy limity
- **RLS (Row Level Security)** dla bezpieczeństwa UGC
- **Realtime** dla live komentarzy i głosów
- Bezpośrednie połączenie PostgreSQL (nie HTTP proxy — nie jesteśmy na edge)

```typescript
// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = import.meta.env.DATABASE_URL;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

### 2.4 ORM: Drizzle

Drizzle ORM — type-safe, lekki (~50KB), SQL-bliski API. Najlepszy wybór dla tego projektu:
- Pełny type-safety z inferred typami ze schematu
- Migracje przez Drizzle Kit CLI
- Brak ciężkiego engine'a (vs Prisma ~2MB)

### 2.5 Wyszukiwarka: Meilisearch (Docker na VPS)

Meilisearch jako Docker container na tym samym VPS. ~256MB RAM.

```yaml
# docker-compose.meilisearch.yml
services:
  meilisearch:
    image: getmeili/meilisearch:latest
    container_name: handhelddb-meilisearch
    restart: unless-stopped
    ports:
      - "127.0.0.1:7700:7700"
    volumes:
      - meilisearch_data:/meili_data
    environment:
      - MEILI_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
      - MEILI_ENV=production
      - MEILI_MAX_INDEXING_MEMORY=256MB

volumes:
  meilisearch_data:
```

Konfiguracja indeksu:

```typescript
export const GAMES_INDEX_CONFIG = {
  primaryKey: 'id',
  searchableAttributes: ['name', 'description', 'developers', 'publishers', 'tags'],
  filterableAttributes: ['genres', 'deckCompatibility', 'protondbTier', 'isFreeToPlay', 'performanceTier'],
  sortableAttributes: ['name', 'releaseDate', 'metacriticScore', 'steamReviewScore'],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
};
```

### 2.6 Autentykacja: Supabase Auth

Wbudowany w Supabase, zero dodatkowej konfiguracji. Providery:
- **Steam** (OpenID 2.0 — wymaga custom provider)
- **Google** OAuth2
- **Discord** OAuth2
- **Email/password** (fallback)

```typescript
// src/lib/auth.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
);

// Login z Google
await supabase.auth.signInWithOAuth({ provider: 'google' });
```

### 2.7 Hosting: VPS OVH + nginx

**Serwer**: `vps-9416dfe2.vps.ovh.net` (6 vCPU, 12GB RAM, 96GB SSD)
**URL**: `https://vps-9416dfe2.vps.ovh.net/`
**SSL**: Let's Encrypt (już skonfigurowany)

```nginx
# /etc/nginx/sites-available/handhelddb
server {
    listen 443 ssl http2;
    server_name vps-9416dfe2.vps.ovh.net;

    ssl_certificate /etc/letsencrypt/live/vps-9416dfe2.vps.ovh.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vps-9416dfe2.vps.ovh.net/privkey.pem;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Static assets (Astro build output)
    location /_astro/ {
        root /home/ubuntu/handhelddb/dist/client;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Reverse proxy do Astro Node.js server
    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name vps-9416dfe2.vps.ovh.net;
    return 301 https://$host$request_uri;
}
```

### 2.8 Storage: Cloudflare R2

- **Screenshoty użytkowników**: R2 ($0 egress, $0.015/GB storage)
- **Obrazy gier**: Hotlink z Steam CDN (dozwolone w ToS)
- **OG images**: Generowane via satori, cache na dysku VPS
- **Max upload**: 5MB per screenshot, max 3 per raport

### 2.9 AI: Claude API (news pipeline)

- **Claude Haiku 4.5**: Drafty newsów ($0.003/artykuł)
- **Claude Sonnet 4.5**: Edytorskie artykuły featured ($0.03/artykuł)
- Koszt: ~$3/miesiąc na 100-150 artykułów

### 2.10 Analytics & Monitoring

- **Plausible**: Privacy-friendly analytics ($9/mo lub self-hosted $0)
- **Sentry**: Error tracking (free tier)
- **UptimeRobot**: Monitoring uptime (free)

---

## 3. Architektura danych

### 3.1 Nowe tabele (vs v1.0)

#### game_versions — śledzenie patchy gier

```typescript
export const gameVersions = pgTable('game_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').references(() => games.id, { onDelete: 'cascade' }).notNull(),
  versionString: text('version_string').notNull(),
  steamBuildId: text('steam_build_id'),
  detectedAt: timestamp('detected_at').defaultNow().notNull(),
  releaseNotesUrl: text('release_notes_url'),
  isMajor: boolean('is_major').default(false),
  performanceImpact: integer('performance_impact'), // -2..+2
}, (table) => [
  index('idx_game_versions_game').on(table.gameId),
  uniqueIndex('idx_game_versions_unique').on(table.gameId, table.steamBuildId),
]);
```

#### device_os_versions — firmware/driver tracking

```typescript
export const deviceOsVersions = pgTable('device_os_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  osName: text('os_name').notNull(),
  osVersion: text('os_version').notNull(),
  driverVersion: text('driver_version'),
  detectedAt: timestamp('detected_at').defaultNow(),
  notes: text('notes'),
}, (table) => [
  uniqueIndex('idx_device_os_unique').on(table.deviceId, table.osVersion, table.driverVersion),
]);
```

#### settings_presets — znormalizowane ustawienia

```typescript
export const settingsPresets = pgTable('settings_presets', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id),
  name: text('name').notNull(),
  settings: jsonb('settings').notNull(),
  source: text('source'),
  usageCount: integer('usage_count').default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

#### articles + news_sources + news_ingested — sekcja newsowa

```typescript
export const newsCategoryEnum = pgEnum('news_category', [
  'device_launch', 'device_update', 'os_update', 'driver_update',
  'game_patch', 'game_launch', 'sale_event', 'performance_analysis',
  'industry', 'editorial',
]);

export const newsStatusEnum = pgEnum('news_status', [
  'draft', 'in_review', 'published', 'archived',
]);

export const articles = pgTable('articles', {
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
}, (table) => [
  index('idx_articles_slug').on(table.slug),
  index('idx_articles_published').on(table.publishedAt),
  index('idx_articles_status').on(table.status),
]);

export const newsSources = pgTable('news_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  url: text('url').notNull(),
  isActive: boolean('is_active').default(true),
  lastChecked: timestamp('last_checked'),
  checkIntervalMinutes: integer('check_interval_minutes').default(60),
});

export const newsIngested = pgTable('news_ingested', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => newsSources.id).notNull(),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  url: text('url'),
  content: text('content'),
  ingestedAt: timestamp('ingested_at').defaultNow().notNull(),
  processed: boolean('processed').default(false),
  articleId: uuid('article_id').references(() => articles.id),
  discarded: boolean('discarded').default(false),
}, (table) => [
  uniqueIndex('idx_ingested_external').on(table.sourceId, table.externalId),
]);
```

### 3.2 Zmiany w istniejących tabelach

**games** — dodane kolumny:
- `lastMajorUpdate TIMESTAMPTZ`
- `anticheatEngine TEXT` — "EAC", "BattlEye", "Vanguard", null
- `cachedStats JSONB DEFAULT '{}'` — denormalizowane statystyki

**devices** — dodane kolumny:
- `chipsetGeneration TEXT` — "RDNA 2", "RDNA 3.5"
- `discontinued BOOLEAN DEFAULT false`
- `formFactor TEXT`

**performance_reports** — dodane kolumny:
- `moderationStatus TEXT DEFAULT 'approved'` — oddzielne od quality_tier
- `source TEXT DEFAULT 'manual'` — "manual", "decky_plugin", "desktop_app"
- `crashCount SMALLINT DEFAULT 0`

### 3.3 Kluczowe decyzje architektoniczne

| Decyzja | Wybór | Uzasadnienie |
|---------|-------|--------------|
| **ID publiczne** | UUID v7 | Sekwencyjny B-tree, bezpieczny |
| **ID junction tables** | BIGINT | Oszczędność 8B/wiersz |
| **TDP profiles** | JSONB (zachowane) | Refaktor na kolumny przy >500K wierszy |
| **Consensus** | Tabela + cron co godzinę | Prostsze niż MV, wystarczające |
| **Komentarze** | Adjacency list + parent_id | Szybki INSERT |
| **quality_tier** | Rozszerzony o 'disputed', 'outdated' | Lepsze śledzenie stanu |

---

## 4. Formularz raportu wydajności (4 kroki)

### Krok 1: Gra + Urządzenie
- Autocomplete wyszukiwarka gry (Meilisearch)
- Wybór urządzenia z listy
- Auto-detect wersji gry (Steam API)

### Krok 2: Ustawienia i wydajność
- FPS target/average/low
- Preset graficzny, rozdzielczość, FSR/DLSS
- TDP limit (suwak), GPU clock

### Krok 3: Ocena ogólna
- Overall rating (5 opcji)
- Stability, Thermal, Fan noise
- Battery life, Compatibility checklist

### Krok 4: Podsumowanie i submit
- Notatki (opcjonalne, max 2000 znaków)
- Screenshoty (max 3, drag & drop)
- Podgląd → Submit

---

## 5. Sekcja newsowa (od MVP)

### Harmonogram startu

| Tydzień | Treści | Cel |
|---------|--------|-----|
| 1 | Zero newsów, focus na core | Fundament |
| 2-3 | 1 artykuł/tydzień | Test pipeline |
| 4-8 | 2-3 artykuły/tydzień + weekly digest | Budowa rytmu |
| 9+ | 3-5 newsów/tydzień (AI pipeline) | Pełna moc |

### Typy treści (priorytet)

**TIER S**: Weekly Handheld Digest + Performance Changelog
**TIER A**: Porównania urządzeń, Firmware Tracker, Breaking news
**TIER B**: Guides/Tutorials, Game deep-dives

### AI News Pipeline

```
ŹRÓDŁA (RSS/Reddit/API) → AI AGGREGATION (Claude Haiku) → HUMAN REVIEW (20-30 min/dzień) → PUBLISH
```

Koszt: ~$3/miesiąc.

---

## 6. Roadmap implementacji

### Faza 1: Fundament (tydzień 1-4)

**Tydzień 1**: Astro init, Supabase setup, Steam API import (~600 gier), 4 urządzenia
**Tydzień 2**: Supabase Auth (Google + Steam), landing page, games list, pierwszy artykuł
**Tydzień 3**: Meilisearch Docker, strona gry, strona urządzenia
**Tydzień 4**: IGDB/HLTB enrichment, ShareDeck import, /games/[slug]/[device]

### Faza 2: Core Features (tydzień 5-9)

**Tydzień 5**: Formularz raportu (4 kroki), Astro Action
**Tydzień 6**: Wyszukiwarka z filtrami fasetowymi, "What Should I Play?"
**Tydzień 7**: Voting (Yes/No/Partially), Consensus Algorithm, TDP clustering
**Tydzień 8**: TDP Profile Cards (3 tiers), Battery Estimator
**Tydzień 9**: AI News Pipeline (RSS, Reddit, Claude Haiku, admin panel)

### Faza 3: Engagement (tydzień 10-13)

**Tydzień 10**: System komentarzy (threaded, markdown, moderation)
**Tydzień 11**: My Setup, Steam Library Import, Library Dashboard
**Tydzień 12**: Shareable Performance Cards (OG images, satori)
**Tydzień 13**: Cron setup, content seeding, auto-detect new releases

### Faza 4: Polish + Launch (tydzień 14-16)

**Tydzień 14**: SEO (sitemap, JSON-LD, meta, Core Web Vitals)
**Tydzień 15**: QA, security audit, Sentry, Plausible
**Tydzień 16**: Deploy, Reddit launch, community outreach

### Faza 5: Post-launch (tydzień 17-22)

Device comparison, heatmaps, badges, notifications, AI predictor, browser extension

---

## 7. Infrastruktura i deployment

### systemd service

```ini
[Unit]
Description=Handheld GameDB (Astro SSR)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/handhelddb
ExecStart=/usr/bin/node dist/server/entry.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=4321

[Install]
WantedBy=multi-user.target
```

### Uwaga o RAM

VPS ma 12GB RAM, z czego ~5.5GB wolne. Swap pełny (2GB/2GB). Po dodaniu Meilisearch (~256MB) zostanie ~5GB. Monitorować `htop` i `docker stats`. Jeśli RAM będzie ciasny — rozważyć wyłączenie nieużywanego LiveKit lub przeniesienie Meilisearch na osobny VPS ($5/mo).

---

## 8. Budżet

### Start: $3-14/mo

| Pozycja | Koszt |
|---------|-------|
| Supabase Free | $0 |
| VPS (istniejący) | $0 |
| Meilisearch (Docker) | $0 |
| Claude API | $3-5 |
| R2 | $0 |
| Plausible (self-hosted) | $0 |

### Skalowanie: $33-49/mo (przy 5K+ visitors)

Supabase Pro $25 + osobny VPS Meilisearch $5 + R2 $0-5

---

## 9. Metryki sukcesu

| Okres | Visitors | Reports | Google clicks |
|-------|----------|---------|---------------|
| Tydzień 1 | 1,000+ | 20+ | — |
| Miesiąc 1 | 5,000+ | 50+ | 500+ |
| Miesiąc 3 | 15,000+ | 300+ | 3,000+ |

**Red flag → pivot**: <3K visitors i <50 reports po 3 miesiącach.

---

## 10. Monetyzacja

1. **Dzień 1**: Affiliate links (Steam, Amazon)
2. **10K visits/mo**: Reklamy (Carbon Ads)
3. **Community asks**: Patreon
4. **50K visits/mo**: Hardware sponsors

---

## 11. Ryzyka i mitygacja

| Ryzyko | Mitygacja |
|--------|-----------|
| Cold start (pusta baza) | Steam API + ProtonDB + ShareDeck bootstrap |
| Solo dev burnout | Max 30% na newsy, automatyzacja, side project |
| AI Overviews | Structured data + interactive tools |
| RAM pressure | Monitoring, opcja wyłączenia LiveKit |

---

## 12. Pre-launch checklist

- [ ] Supabase projekt
- [ ] Meilisearch Docker
- [ ] nginx config (zastępuje Bonfire)
- [ ] systemd service
- [ ] Steam API Key, Google OAuth, IGDB, Anthropic
- [ ] 600+ gier, 4 urządzenia, ~2K imported reports
- [ ] Sitemap, JSON-LD, OG images
- [ ] 3-5 artykułów, landing page, FAQ, Privacy Policy
- [ ] Mobile responsive, security audit, Core Web Vitals

---

## 13. Zmienne środowiskowe

```bash
# .env.example
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
MEILISEARCH_HOST=http://127.0.0.1:7700
MEILISEARCH_MASTER_KEY=...
STEAM_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
IGDB_CLIENT_ID=...
IGDB_CLIENT_SECRET=...
ANTHROPIC_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=handhelddb
PLAUSIBLE_DOMAIN=vps-9416dfe2.vps.ovh.net
SENTRY_DSN=...
PUBLIC_SITE_URL=https://vps-9416dfe2.vps.ovh.net
PUBLIC_SITE_NAME=Handheld GameDB
NODE_ENV=production
HOST=127.0.0.1
PORT=4321
```

---

## 14. Istniejąca struktura kodu

```
src/
├── components/astro/     # DeviceCard, Footer, GameCard, Header, PerformanceBadge
├── layouts/              # BaseLayout.astro
├── lib/
│   ├── api/              # rate-limiter.ts
│   ├── consensus.ts      # Consensus algorithm
│   ├── db/               # client.ts, schema.ts ← wymaga aktualizacji
│   ├── search/           # client.ts, config.ts
│   └── utils.ts
├── pages/
│   ├── compare/          # [...slugs].astro
│   ├── devices/          # [slug].astro, index.astro
│   ├── games/            # [slug].astro, index.astro
│   ├── discover.astro
│   ├── index.astro
│   └── report/new.astro
├── styles/global.css
└── types/                # comment.ts, device.ts, game.ts, report.ts, user.ts
```

**Do dodania**:
- `src/actions/index.ts` — Astro Actions
- `src/lib/auth.ts` — Supabase Auth client
- `src/lib/news/pipeline.ts` — AI news pipeline
- `src/pages/news/` — news pages
- `src/pages/admin/` — admin panel
- `src/pages/auth/` — auth callbacks
- `src/components/react/` — interactive islands
