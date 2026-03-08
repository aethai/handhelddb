# HandheldDB Design System v4

## Direction

**Personality:** Data & Analysis — functional gaming database, not luxury brand
**Foundation:** Cool (blue-gray gaming tones)
**Depth:** Subtle-shadows (cards lift slightly, not flat but not heavy)

## Intent

A gamer with a handheld PC wants to quickly find performance data for their game.
The interface should feel like a well-organized tech reference — confident, readable, fast.
Not luxury. Not flashy. **Useful with quiet craft.**

## Tokens

### Spacing
Base: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 48, 64

### Colors
```
/* Surfaces */
--bg-base: #0F1115          /* app background — not pure black, slight blue tint */
--bg-raised: #16181D        /* card backgrounds — distinct from base */
--bg-elevated: #1E2128      /* hover states, active elements */
--bg-overlay: #252830       /* modals, dropdowns */

/* Borders */
--border-subtle: #1E2128    /* barely there, structure only */
--border-default: #2A2D35   /* standard card/element borders */
--border-strong: #3A3D45    /* hover, focus states */

/* Text */
--text-primary: #E8EAED     /* main text — off-white, not pure white */
--text-secondary: #9CA3AF   /* descriptions, metadata */
--text-tertiary: #6B7280    /* timestamps, minor labels */
--text-muted: #4B5563       /* disabled, placeholder */

/* Accent — blue (primary interactive) */
--accent: #60A5FA           /* links, active tabs, focus rings */
--accent-hover: #93C5FD     /* hover state */
--accent-muted: rgba(96, 165, 250, 0.12)  /* backgrounds */

/* Performance tiers — THE signature */
--perf-great: #4ADE80       /* Verified / Excellent / 60fps */
--perf-ok: #FBBF24          /* Playable / Good / 30fps */
--perf-bad: #F87171         /* Unsupported / Poor */

/* Brand — kept minimal */
--brand: #60A5FA            /* same as accent, not a separate color */
```

### Radius
Scale: 4px (badges), 6px (buttons, inputs), 8px (cards), 12px (modals, large containers)

### Typography
Font: Inter (headings + body, unified)
Mono: JetBrains Mono (fps numbers, stats, technical data)
Scale: 12, 13, 14 (base), 16, 18, 20, 24, 30, 36
Weights: 400 (body), 500 (labels, nav), 600 (headings), 700 (hero only)
**NO UPPERCASE on headings** — sentence case everywhere except tiny labels (xs tracking-wide)

### Shadows
```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.2)
--shadow-card: 0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)
--shadow-elevated: 0 4px 16px rgba(0,0,0,0.25)
```

## Patterns

### Button Primary
- Height: 36px
- Padding: 8px 16px
- Radius: 6px
- Font: 14px, 500 weight
- Background: --accent
- Hover: --accent-hover
- No uppercase

### Button Secondary
- Same dimensions
- Background: transparent
- Border: 1px solid --border-default
- Color: --text-secondary
- Hover: border --border-strong, color --text-primary

### Card Default
- Border: 1px solid --border-subtle
- Radius: 8px
- Background: --bg-raised
- Shadow: --shadow-card on hover only
- Padding: 0 (image fills top) or 16px (content cards)

### Game Card
- Image: aspect-[460/215], fills width, rounded-t-lg
- Body: p-3, below image (NOT overlaid)
- Title: 14px, 500 weight, --text-primary
- Meta row: genre tag + metacritic score, 12px, --text-secondary
- Hover: border --border-strong, shadow-card appears
- Deck badge: small colored dot + text, not a full pill

### Input
- Height: 40px
- Padding: 8px 12px
- Radius: 6px
- Border: 1px solid --border-default
- Background: --bg-base
- Focus: border --accent, ring 2px --accent-muted

### Nav Link
- Font: 14px, 500 weight
- Color: --text-secondary
- Active: --text-primary with bottom border --accent (2px)
- NO uppercase, NO wide letter-spacing

## Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Inter over Oswald | Oswald uppercase screams; Inter is readable, neutral, professional | 2026-03-08 |
| Blue-gray over copper | Gaming domain = Steam/launcher blue tones. Copper felt forced/luxury | 2026-03-08 |
| Image+body cards over overlay | Overlay kills readability on busy game art. Separate body = always readable | 2026-03-08 |
| Performance colors as signature | Green/yellow/red tiers ARE the product. Make them prominent, consistent | 2026-03-08 |
| No uppercase headings | Uppercase Oswald was the #1 "ugly" factor. Normal case = modern, calm | 2026-03-08 |
| Cool bg (#0F1115) over warm (#0C0A09) | Blue tint matches gaming software. Warm stone felt like furniture catalog | 2026-03-08 |
