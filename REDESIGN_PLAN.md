# HandheldDB — Full Redesign Plan

## Design Direction: Clean Tech + Brutalist Touch

**Filozofia**: Czytelna, profesjonalna baza (Linear/Raycast) z odważną typografią i ostrymi krawędziami na kluczowych elementach. Neon lime `#D4FF00` jako jedyny akcent kolorystyczny — energetyczny, gamingowy, wyrazisty.

---

## 1. DESIGN SYSTEM (global.css — pełna przebudowa)

### Paleta kolorów

```
DARK MODE                          LIGHT MODE
──────────────────────────────     ──────────────────────────────
--bg-primary:    #09090b           --bg-primary:    #fafafa
--bg-secondary:  #111113           --bg-secondary:  #ffffff
--bg-tertiary:   #18181b           --bg-tertiary:   #f4f4f5
--bg-elevated:   #1c1c1f           --bg-elevated:   #e8e8ec

--text-primary:  #fafafa           --text-primary:  #09090b
--text-secondary:#a1a1aa           --text-secondary:#71717a
--text-tertiary: #52525b           --text-tertiary: #a1a1aa

--border:        #27272a           --border:        #e4e4e7
--border-subtle: #1f1f23           --border-subtle: #f0f0f2
--border-strong: #3f3f46           --border-strong: #d4d4d8

--accent:        #D4FF00           --accent:        #D4FF00
--accent-hover:  #e0ff33           --accent-hover:  #c0e600
--accent-muted:  #D4FF0015         --accent-muted:  #D4FF0020
--accent-text:   #09090b           --accent-text:   #09090b

FPS Tier Colors (wspólne dla obu trybów):
--fps-excellent: #D4FF00  (neon lime — 55+ fps)
--fps-good:      #86efac  (soft green — 45-54)
--fps-fair:      #fde047  (yellow — 35-44)
--fps-poor:      #fb923c  (orange — 25-34)
--fps-bad:       #f87171  (red — <25)
```

### Typografia

```
Heading/Display: "Space Grotesk" (700, 600) — geometryczny, brutalistyczny
Body/UI:         "Inter" (400, 500, 600) — czytelny, neutralny
Monospace/Data:  "JetBrains Mono" (500, 700) — wyrazisty, dane techniczne

Hero headings:   Space Grotesk, 800, tracking -0.04em, UPPERCASE
Section heads:   Space Grotesk, 700, tracking -0.02em
Body text:       Inter, 400-500, 15px, 1.6 line-height
Data values:     JetBrains Mono, 700
Labels/Badges:   JetBrains Mono, 500, 11px, uppercase, tracking 0.06em
```

### Border Radius (brutalist mix)

```
--radius-none: 0px     — buttons, CTAs, nav tabs (brutalist sharp)
--radius-sm:   4px     — badges, pills, tags
--radius-md:   8px     — cards, inputs, dropdowns
--radius-lg:   12px    — modals, panels
--radius-full: 9999px  — avatars, dots
```

### Shadows & Effects

```
--shadow-sm:    0 1px 2px rgba(0,0,0,0.05)
--shadow-md:    0 2px 8px rgba(0,0,0,0.08)
--shadow-lg:    0 8px 24px rgba(0,0,0,0.12)
--shadow-glow:  0 0 20px #D4FF0025

Hover na kartach: border-color zmiana + subtle glow
Brak translateY na hover — za "gimmicky"
Focus rings: 2px solid #D4FF00, offset 2px
```

### Spacing System

```
4px grid baseline
--space-1: 4px     --space-6: 24px
--space-2: 8px     --space-7: 28px
--space-3: 12px    --space-8: 32px
--space-4: 16px    --space-10: 40px
--space-5: 20px    --space-12: 48px

Max-width container: 1200px (up from 1080px)
Section gaps: 64px (up from 48px — more breathing room)
```

---

## 2. HEADER (Header.astro)

### Obecne problemy
- Logo + nav + search + user menu zbite razem
- Mobile drawer z inline styles
- Brak jasnego visual hierarchy

### Nowy design
```
┌──────────────────────────────────────────────────────────────┐
│  ▪ HandheldDB          Games  Devices  Compare  News        │
│                                              [Search] [User] │
└──────────────────────────────────────────────────────────────┘
```

- **Logo**: "▪ HandheldDB" — kwadratowy marker + bold text, Space Grotesk
- **Nav links**: Inter 500, uppercase 12px, tracking 0.04em, underline na hover (brutalist touch)
- **Active state**: neon lime underline (2px solid #D4FF00)
- **Search**: ikona lupy, kliknięcie otwiera Command Palette (Cmd+K)
- **Sticky header**: blur backdrop, border-bottom
- **Mobile**: hamburger → slide-in drawer z klasami CSS (nie inline styles)
- **Theme toggle**: ikona sun/moon w headerze

---

## 3. FOOTER (Footer.astro)

### Nowy design
```
┌──────────────────────────────────────────────────────────────┐
│  ▪ HandheldDB                                                │
│  Performance database for handheld gaming.                   │
│                                                              │
│  Browse          Community        Legal                      │
│  Games           Report           Privacy                    │
│  Devices         Leaderboard      Terms                      │
│  Compare         News             About                      │
│  Discover                                                    │
│                                                              │
│  ──────────────────────────────────────────────              │
│  © 2025 HandheldDB                   Built with community ♥ │
└──────────────────────────────────────────────────────────────┘
```

- 3-kolumnowy grid z linkami
- Minimalistyczny, wydzielony border-top
- Brak fancy gradientów

---

## 4. HOMEPAGE (index.astro — przebudowa od zera)

### Nowa struktura (6 sekcji zamiast 9):

#### Sekcja 1: HERO
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  REAL FPS.                                                   │
│  EVERY HANDHELD.                                             │
│                                                              │
│  Community-tested performance data. 9,800+ games.            │
│  10 devices. Find settings that work.                        │
│                                                              │
│  ┌──────────────────────────────────────────────┐            │
│  │  🔍 Search 9,800+ games...                   │            │
│  └──────────────────────────────────────────────┘            │
│                                                              │
│  [Deck] [Ally] [Legion Go] [Claw] [All devices →]           │
│                                                              │
│  9,847          342           10          580                │
│  GAMES          REPORTS       DEVICES     CONTRIBUTORS       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Heading**: Space Grotesk, 900, UPPERCASE, letter-spacing -0.04em, ~56px
- "EVERY HANDHELD." w kolorze #D4FF00
- Search bar jako centralny element
- Device pills pod searchem — sharp edges (border-radius: 0)
- Stats w jednym wierszu pod hero — monospace, duże liczby
- **BEZ**: background image, showcase card, overlay, grain — czysty tekst

#### Sekcja 2: FEATURED / TOP GAMES
```
┌──────────────────────────────────────────────────────────────┐
│  TOP RATED                                          All →    │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  img    │ │  img    │ │  img    │ │  img    │           │
│  │         │ │         │ │         │ │         │           │
│  │ Elden   │ │ BG3     │ │ Hades 2 │ │ Cyber   │           │
│  │ Ring    │ │         │ │         │ │ punk    │           │
│  │ 96 · ★  │ │ 92 · ★  │ │ 88 · ★  │ │ 86 · ★  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  ...    │ │  ...    │ │  ...    │ │  ...    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└──────────────────────────────────────────────────────────────┘
```

- Równy grid 4x2 (nie bento z jedną dużą kartą)
- Karty: img + nazwa + metacritic + genres
- border-radius: 8px na kartach
- Hover: border accent, subtle glow

#### Sekcja 3: PERFORMANCE TABLE (Best on Deck)
```
┌──────────────────────────────────────────────────────────────┐
│  BEST ON DECK                                       All →    │
│  ────────────────────────────────────────────────────────    │
│  GAME                    FPS      VERDICT      BATTERY       │
│  ────────────────────────────────────────────────────────    │
│  [img] Elden Ring        60       EXCELLENT    ~2.5h         │
│  [img] Cyberpunk 2077    45       GOOD         ~2.0h         │
│  [img] Baldur's Gate 3   38       FAIR         ~3.0h         │
│  ────────────────────────────────────────────────────────    │
└──────────────────────────────────────────────────────────────┘
```

- Czysta tabela, monospace dane
- FPS w kolorze tier (neon lime dla 55+)
- Verdict badge z kolorowym tłem
- Header tabeli: JetBrains Mono, uppercase, muted text

#### Sekcja 4: LATEST NEWS (max 3 artykuły)
```
┌──────────────────────────────────────────────────────────────┐
│  LATEST NEWS                                    All news →   │
│                                                              │
│  ┌──────────────────────────┐  ┌────────────┐               │
│  │  cover image             │  │ EDITORIAL  │               │
│  │                          │  │ Title...   │               │
│  │  EDITORIAL               │  │ Mar 8      │               │
│  │  Steam Deck OLED 2...    │  ├────────────┤               │
│  │  Mar 10, 2025            │  │ UPDATE     │               │
│  └──────────────────────────┘  │ Title...   │               │
│                                │ Mar 5      │               │
│                                └────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

- Featured article duży (2/3) + lista mniejszych (1/3)
- Category badge: monospace, uppercase, neon lime / colored
- Clean typografia, daty w monospace

#### Sekcja 5: DEVICES
```
┌──────────────────────────────────────────────────────────────┐
│  DEVICES                                    All devices →    │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ VALVE    │ │ ASUS     │ │ LENOVO   │ │ MSI      │       │
│  │ Steam    │ │ ROG Ally │ │ Legion   │ │ Claw 8   │       │
│  │ Deck     │ │          │ │ Go       │ │          │       │
│  │ OLED     │ │ Z1E      │ │ Z1E      │ │ Ultra 9  │       │
│  │          │ │          │ │          │ │          │       │
│  │ 50Wh     │ │ 80Wh    │ │ 49.2Wh   │ │ 80Wh     │       │
│  │ $549     │ │ $699     │ │ $729     │ │ $799     │       │
│  │          │ │          │ │          │ │          │       │
│  │ View →   │ │ View →   │ │ View →   │ │ View →   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└──────────────────────────────────────────────────────────────┘
```

- 4 kolumny, clean bordered cards
- Manufacturer jako muted uppercase label
- Kluczowe specyfikacje w monospace
- Hover: border → neon lime

#### Sekcja 6: CTA
```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  HELP US BENCHMARK                                     │  │
│  │  HANDHELD GAMING                                       │  │
│  │                                                        │  │
│  │  Every report makes the database better.               │  │
│  │                                                        │  │
│  │  [████████████████████░░░░] 342 / 500 reports          │  │
│  │                                                        │  │
│  │  [■ SUBMIT A REPORT]                                   │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

- Wydzielona sekcja z border
- Heading: Space Grotesk, uppercase, bold
- Progress bar z neon lime
- CTA button: filled #D4FF00, black text, sharp edges (0 radius)

### USUNIĘTE sekcje z obecnego homepage:
- FPS Ticker (marquee) — szum wizualny
- Community Activity (Recent Reports + Most Tested) — przenieść na dedicated page
- FPS Showcase Card z hero — za skomplikowany, za dużo danych w hero

---

## 5. GAMES LIST (games/index.astro + GamesBrowser.tsx + GameGrid.tsx)

### Zmiany:
- **Toolbar**: filtry w jednym wierszu — genre dropdown, compat filter, sort dropdown
- **Grid**: 4 kolumny desktop, 2 mobile — równe karty (nie bento)
- **Game card redesign**:
  - Header image z gradient overlay na dole
  - Nazwa gry: Space Grotesk, 600, 14px
  - Genres: monospace, 10px, muted
  - Metacritic badge: top-right corner
  - Deck compat icon: bottom-left
- **Search**: integrated w toolbar (nie osobny komponent)
- **Pagination/Infinite scroll**: load more button zamiast infinite scroll
- Usunięcie inline styles z GameGrid.tsx — przeniesienie do klas CSS

---

## 6. GAME DETAIL (games/[slug]/index.astro + GameDetailPanel.tsx)

### Nowy layout:
```
┌──────────────────────────────────────────────────────────────┐
│  Games > Elden Ring                                          │
│                                                              │
│  ┌─────────────────────────────────┐  ┌──────────────────┐  │
│  │  header image                   │  │ PERFORMANCE      │  │
│  │                                 │  │                  │  │
│  │  ELDEN RING                     │  │ Deck    60 fps   │  │
│  │  FromSoftware · RPG · 2022      │  │ Ally    48 fps   │  │
│  │  Metacritic: 96                 │  │ Legion  35 fps   │  │
│  │                                 │  │                  │  │
│  │  [♥ Follow] [📝 Report]         │  │ [Compare →]      │  │
│  └─────────────────────────────────┘  └──────────────────┘  │
│                                                              │
│  COMMUNITY REPORTS                                           │
│  ────────────────────────────────────                        │
│  [report cards with votes]                                   │
│                                                              │
│  COMMENTS                                                    │
│  ────────────────────────────────────                        │
│  [threaded comments]                                         │
└──────────────────────────────────────────────────────────────┘
```

- 2/3 + 1/3 layout (content + sidebar)
- Performance sidebar: lista urządzeń z FPS w odpowiednich kolorach
- Breadcrumb na górze
- Clean karty raportów z vote buttons
- Komentarze z threaded indent

---

## 7. DEVICES LIST (devices/index.astro)

### Zmiany:
- Grid 3 kolumn desktop
- Karty z: manufacturer label, device name, kluczowe specs (chip, battery, price)
- Grupowanie po manufacturer z dividerami
- Hover: border → accent

---

## 8. DEVICE DETAIL (devices/[slug].astro)

### Nowy layout:
```
┌──────────────────────────────────────────────────────────────┐
│  Devices > Steam Deck OLED                                   │
│                                                              │
│  STEAM DECK OLED                                             │
│  Valve · $549                                                │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ AMD      │ │ 7.4"     │ │ 50 Wh    │ │ 6-15W    │       │
│  │ Z1E      │ │ 800p     │ │ battery  │ │ TDP      │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  PERFORMANCE HEATMAP                                         │
│  [Sort: FPS ▼] [Filter: All ▼]                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│  │ 60   │ │ 48   │ │ 42   │ │ 35   │ │ 28   │             │
│  │ Game │ │ Game │ │ Game │ │ Game │ │ Game │             │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
└──────────────────────────────────────────────────────────────┘
```

- Specs w grid z ikonami
- Heatmap z kolorowymi FPS kartami
- Sortowanie i filtrowanie

---

## 9. COMPARE (compare/ + CompareTable.tsx)

### Zmiany:
- Max 3 urządzenia side-by-side
- Tabela z kategoriami (Display, Performance, Battery, etc.)
- Winner highlighting z neon lime tłem na lepszej wartości
- Device picker z dropdown
- Mobile: horizontal scroll na tabeli

---

## 10. NEWS (news/index.astro + news/[slug].astro)

### Lista:
- Featured article na górze (duży)
- Reszta w 2-kolumnowym gridzie
- Category badges: monospace, neon lime / blue / orange
- Data w monospace

### Artykuł:
- Prose typography (@tailwindcss/typography)
- Cover image full-width
- Sidebar z metadanymi (author, date, tags, devices)
- Related articles na dole

---

## 11. LEADERBOARD (leaderboard.astro)

### Zmiany:
- Top 3 z wyróżnieniem (duże karty)
- Reszta w czystej tabeli
- Kolumny: rank, username, points, level, reports, badges
- #1 z neon lime border/glow
- Monospace na danych numerycznych

---

## 12. AUTH PAGES (login, register, forgot/reset password)

### Zmiany:
- Wycentrowany card na neutralnym tle
- Logo + heading na górze
- Clean inputy z neon lime focus ring
- CTA button: filled accent, sharp edges
- Link do alternatywnej akcji (Don't have an account? Register)
- Google OAuth button: outlined, z ikoną

---

## 13. PROFILE (profile/index.astro, profile/[userId].astro)

### Zmiany:
- Avatar + username + level na górze
- Stats grid: reports, points, badges, joined date
- Tabbed content: Reports | Badges | Settings
- Badge grid z ikonami
- Device setup card

---

## 14. REPORT FORM (report/new.astro + ReportForm.tsx)

### Zmiany:
- 4-step wizard z progress indicator na górze
- Step indicator: numbered dots, active = neon lime
- Clean form fields z jasnym labelingiem
- Game search: autocomplete dropdown
- Device picker: radio cards
- FPS/TDP/Resolution: monospace inputs
- Submit button: large, filled accent

---

## 15. ADMIN PANEL (admin/*.astro)

### Zmiany:
- Sidebar navigation (nie top tabs)
- Dashboard z stat cards
- Tabele z sortowaniem, filtrami, paginacją
- Status badges: approved/pending/rejected z kolorami
- Quick action buttons na każdym wierszu

---

## 16. ERROR PAGES (404.astro, 500.astro)

### Zmiany:
- Wycentrowany content
- Duży numer błędu w Space Grotesk, bold
- Krótki opis + link home
- Minimalistyczne, spójne z resztą

---

## 17. DISCOVER (discover.astro + FpsChecker.tsx)

### Zmiany:
- Kolekcje gier jako sekcje z nagłówkami
- Karty gier w gridzie
- FPS Checker: clean input + device picker + wynik

---

## 18. STATIC PAGES (about, privacy, terms)

### Zmiany:
- Prose layout z @tailwindcss/typography
- Table of contents sidebar (optional)
- Clean headings, readable body text

---

## 19. KOMPONENTY WSPÓLNE — redesign

### SearchBar.tsx
- Command Palette style (Cmd+K)
- Modal overlay z input na górze
- Wyniki w liście pod inputem
- Neon lime highlight na matching text
- Keyboard navigation (↑↓ Enter Esc)

### GameCard.astro
- Clean bordered card, 8px radius
- Image z aspect-ratio: 16/9
- Nazwa: Space Grotesk 600
- Metacritic badge: top-right
- Hover: border → accent color

### DeviceCard.astro
- Bordered, 8px radius
- Manufacturer: monospace uppercase label
- Device name: Space Grotesk 700
- Specs: monospace, muted text
- Hover: border → accent

### PerformanceBadge.astro
- Pill shape (4px radius)
- Background: tier color z 10% opacity
- Text: tier color, monospace, bold
- No Unicode icons — text only (EXCELLENT, GOOD, FAIR, etc.)

### VoteButtons.tsx
- Minimal: ▲ count ▼
- Active state: neon lime (upvote) / red (downvote)

### CommentSection.tsx
- Clean threaded layout
- Author + date header
- Reply indent z border-left
- Vote buttons inline

---

## 20. LIGHT/DARK MODE IMPLEMENTATION

### Approach:
- CSS custom properties w `@theme`
- `data-theme="dark"` / `data-theme="light"` na `<html>`
- Toggle button w header
- Preferencja systemowa jako default (`prefers-color-scheme`)
- Zapamiętywanie w localStorage
- Płynna tranzycja: `transition: background-color 0.15s, color 0.15s, border-color 0.15s`

### CSS structure:
```css
:root { /* light mode defaults */ }
[data-theme="dark"] { /* dark overrides */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark when no explicit choice */ }
}
```

---

## 21. KOLEJNOŚĆ IMPLEMENTACJI

Wszystko w jednym podejściu, ale w logicznej kolejności:

### Faza 1: Foundation
1. Przebudowa `global.css` — nowy design system, zmienne, typografia, kolory
2. Import fontów (Space Grotesk, Inter, JetBrains Mono)
3. Light/dark mode setup
4. `BaseLayout.astro` — theme toggle, base structure

### Faza 2: Shell
5. `Header.astro` — nowy design
6. `Footer.astro` — nowy design

### Faza 3: Homepage
7. `index.astro` — kompletna przebudowa od zera (6 nowych sekcji)

### Faza 4: Core Components
8. `SearchBar.tsx` — Command Palette redesign
9. `GameCard.astro` — nowy design
10. `DeviceCard.astro` — nowy design
11. `PerformanceBadge.astro` — nowy design
12. `SectionHeader.astro` — nowy design

### Faza 5: Core Pages
13. `games/index.astro` + `GamesBrowser.tsx` + `GameGrid.tsx`
14. `games/[slug]/index.astro` + `GameDetailPanel.tsx`
15. `games/[slug]/[device].astro`
16. `devices/index.astro`
17. `devices/[slug].astro`
18. `compare/` + `CompareTable.tsx`

### Faza 6: Secondary Pages
19. `news/index.astro` + `news/[slug].astro`
20. `leaderboard.astro`
21. `discover.astro` + `FpsChecker.tsx`
22. Auth pages (login, register, forgot/reset)
23. `profile/` pages
24. `report/new.astro` + `ReportForm.tsx`

### Faza 7: Supporting
25. Admin panel pages
26. Static pages (about, privacy, terms)
27. Error pages (404, 500)
28. Remaining components (CommentSection, VoteButtons, BadgeGrid, etc.)

### Faza 8: Polish
29. Animacje i micro-interactions
30. Mobile responsiveness pass
31. Accessibility audit (focus states, aria, contrast)
32. Performance check (font loading, CSS bundle size)
33. Usunięcie legacy CSS classes i inline styles

---

## SUMMARY

- **Fonty**: Space Grotesk (headings) + Inter (body) + JetBrains Mono (data)
- **Accent**: #D4FF00 neon lime
- **Bazy**: zinc scale (#09090b ↔ #fafafa)
- **Radius**: 0px buttons/CTAs, 4px badges, 8px cards, 12px modals
- **Headings**: UPPERCASE, bold, tight tracking (brutalist)
- **Data**: monospace, kolorowe FPS tiers
- **Layout**: generous spacing, 1200px max-width
- **Modes**: dark + light z system preference detection
- **Usunięte**: glow effects, text-shadow, translateY hover, Unicode tier icons, background grain, ticker marquee
- **Dodane**: Command Palette search, theme toggle, sharp CTA buttons, cleaner tables
