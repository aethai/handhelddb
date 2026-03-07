# Krytyczna Analiza Planu: Handheld GameDB

## Kontekst

Analiza biznesowo-techniczna planu "Handheld GameDB — The Universal Handheld Gaming Performance Database". Przeprowadzono pogłębiony, wielowarstwowy research: analiza 6 konkurentów, badanie rynku newsowego, analiza modeli biznesowych porównywalnych projektów (PCGamingWiki, HowLongToBeat, SystemRequirementsLab), ocena zagrożenia AI Overviews, weryfikacja tech stacku i kosztów. Repozytorium jest puste (tylko zainicjalizowany git).

---

## 1. KRYTYCZNE PROBLEMY PLANU

### 1.1. Bezpośredni konkurent istnieje — ale jest SŁABY

**DeckVerified Games (deckverified.games)** to działająca, open-source'owa baza danych wydajności handheldów. Plan go całkowicie ignoruje, co jest błędem w researchu. Jednak po pogłębionej analizie:

**Co mają:**
- Multi-device: Steam Deck, ROG Ally, Legion Go, Zotac Zone, MSI Claw
- Aplikacje mobilne Android/iOS (18 recenzji na Google Play — mikro-skala)
- Plugin Decky do przeglądania danych na Steam Decku
- 491 commitów na stronie, 324 otwarte raporty gier

**Dlaczego NIE są realnym zagrożeniem:**
- **1 maintainer** (Josh5 = 115 z 117 commitów) — krytyczne ryzyko bus-factor
- **8 GitHub stars** na repo strony, 20 na repo danych — hobby-project scale
- **Brak SEO** — nie pojawiają się w Google na kluczowe frazy ("elden ring steam deck settings")
- **Zero monetyzacji** — volunteer-only, ryzyko porzucenia
- **GitHub Issues jako "baza danych"** — słaby UX, nieintuicyjne przeglądanie
- **Brak walidacji danych** — surowe raporty bez expert review
- **Brak narzędzi porównawczych** — żadnych wykresów, side-by-side, trendów
- **Szacowany ruch**: <10-50K/mies (brak danych Similarweb)
- **Brak dedykowanego Discorda ani subreddita**

**Werdykt**: DeckVerified to proof-of-concept, nie dojrzały produkt. Można go łatwo przebić jakością UX, SEO i danymi. Ale plan powinien go wymienić i jasno się od niego odróżnić.

**Pełna mapa konkurencji (zaktualizowana):**

| Konkurent | Ruch/mies | Multi-device | Dane wydajności | SEO | Zagrożenie |
|---|---|---|---|---|---|
| **SteamDeckHQ** | 1.36M | Nie (tylko SD) | Redakcyjne testy | Silne | Średnie (inny scope) |
| **DeckVerified** | <50K | Tak | Crowdsource | Brak | Niskie |
| **ProtonDB** | Wysokie | Nie | Kompatybilność, nie FPS | Silne | Niskie (inny cel) |
| **ShareDeck** | Niskie | Nie (tylko SD) | 2,475 raportów | Słabe | Niskie |
| **PCGamingWiki** | Wysokie | Nie | Desktop-focused | Bardzo silne | Niskie (inny focus) |
| **DeckuDB** | ? | Tak | Agregator danych | ? | Średnie |

### 1.2. Zawyżone liczby rynkowe (2-3x)

| Metryka | Plan twierdzi | Realne dane |
|---|---|---|
| Steam Deck sprzedane | 8-10M | ~4M (źródło: GamingOnLinux, 2025) |
| ROG Ally sprzedane | 2-3M | ~860K (źródło: Pure Xbox) |
| Total PC handheldów 2025 | nie podano | 2.3M/rok (źródło: Omdia) |
| Baza zainstalowana | 15-20M | 6-8M kumulatywnie |
| Rynek globalny | $8-12B | ~$2B w 2025, prognoza $10B do 2033 |

Rynek rośnie szybko (CAGR ~25%), ale jest 2-3x mniejszy niż plan sugeruje.

### 1.3. Harmonogram 24 tygodni to fantazja

Plan wymaga zbudowania **15+ różnych systemów** przez jednego developera w 6 miesięcy: Next.js app z SSR, PostgreSQL schema, Steam API, importery ProtonDB/ShareDeck, auth, AI pipeline, CMS, moderacja, wyszukiwarka, komentarze, reputacja, Discord bot, 20+ artykułów, testowanie 100 gier, newsletter, YouTube.

**Realistycznie**: 9-12 miesięcy na pełny zakres, 10-12 tygodni na sensowne MVP po drastycznym obcięciu.

### 1.4. Cold start gorszy niż plan zakłada

- **Steam Deck Verified** = etykiety "verified/playable/unsupported", **NIE dane o FPS/ustawieniach**
- **ShareDeck** = 2,475 raportów dla 1,376 gier = ~2% pokrycia Steam (70K+ gier)
- **ProtonDB** = kompatybilność Linux, nie wydajność handheldów
- Dla urządzeń nie-Steam-Deck baza będzie praktycznie pusta na premierze

### 1.5. Ryzyko wypalenia solo-foundera

Codzienna obsługa wg planu: pipeline newsów (30-45 min), moderacja, bugfixy, content, YouTube (1-2 filmy/tyg!), testowanie gier, marketing Reddit/Discord = **60-80h/tydzień**. Nieustabilne.

---

## 2. CO JEST DOBRZE PRZEMYŚLANE

### 2.1. System poziomów jakości danych (Verified / Community Confirmed / Reported / AI Estimated)
Transparentność jakości danych to realny wyróżnik. DeckVerified tego nie robi tak dobrze. Warto zachować i rozbudować.

### 2.2. Strategia SEO na long-tail
Celowanie w "[gra] + [urządzenie] + settings/performance" to solidna strategia. 40K+ unikalnych stron = potężny long-tail. To główny kanał akwizycji.

### 2.3. Integracja AI do automatyzacji
Pragmatyczne podejście do skalowania jednego człowieka. Claude API kosztuje ~$5-20/mies dla tego use case'u — negligible cost.

### 2.4. Pozycjonowanie multi-device
Rynek fragmentuje się szybko. Porównywanie wydajności między urządzeniami adresuje realny ból użytkowników.

---

## 3. REKOMENDACJE ZMIAN W TECH STACKU

### 3.1. Astro zamiast Next.js (silna rekomendacja)

Dla serwisu, który jest w 80%+ statyczną bazą danych z treścią:

| Kryterium | Next.js 15 | Astro |
|---|---|---|
| Prędkość ładowania | Dobra | 2-3x lepsza (zero JS domyślnie) |
| Koszt hostingu | $50-90/mies (Vercel Pro) | $0-20/mies (Cloudflare Pages) |
| ISR/generacja stron | Limit 200K writes/mies na Vercel | Static build + on-demand regen |
| SEO | Wymaga konfiguracji | Wbudowane, domyślne |
| Interaktywność | Natywna React | Islands architecture (React/Vue) |

Astro + Cloudflare Pages = **80% redukcja kosztów hostingu**.

### 3.2. Lucia Auth jest ZDEPRECJONOWANA — użyj Auth.js v5

Plan wymienia Lucia jako alternatywę — projekt jest martwy. Opcje:
- **Auth.js v5 (NextAuth)** — darmowe, Steam OAuth przez custom OpenID
- **Better Auth** — nowszy, aktywnie rozwijany
- **Supabase Auth** — darmowe do 50K MAU, zero maintanance

### 3.3. Supabase zamiast Neon + osobny auth + osobny storage

Supabase = Postgres + Auth + Realtime + Storage w jednym za $25/mies Pro. Mniej ruchomych części dla solo-developera.

### 3.4. Meilisearch self-hosted na VPS $5-10/mies

8.9x tańsze niż Algolia. Wystarczające dla game search z typo tolerance.

### 3.5. Realna kalkulacja kosztów

| Usługa | Plan mówi | Opcja A (Next.js) | Opcja B (Astro) |
|---|---|---|---|
| Hosting | $20 | $50-90 | $0-20 |
| Baza danych | $19 | $19-50 | $25 (Supabase Pro) |
| Wyszukiwarka | ? | $20 (VPS) | $5-10 (VPS) |
| AI (Claude API) | ? | $10-30 | $10-30 |
| CDN/obrazki | ? | $5-15 | $0 (CF) |
| Email | ? | $0-30 | $0-30 |
| **TOTAL** | **$50-150** | **$100-235** | **$40-115** |

---

## 4. REKOMENDOWANY ZAKRES MVP

### 4.1. WYRZUĆ z MVP (każda z tych rzeczy to tygodnie pracy):

- ~~Bot Discord~~ — brak społeczności = brak potrzeby
- ~~System reputacji~~ — over-engineering, wystarczy verified/unverified
- ~~AI pipeline newsów~~ — 2-3 newsy tygodniowo ręcznie na start
- ~~Newsletter~~ — zero subskrybentów
- ~~Kanał YouTube~~ — gigantyczny time sink
- ~~20 artykułów~~ — 3-5 pilotażowych wystarczy

### 4.2. MVP Core (14-16 tygodni):

Masz czas — robimy solidne MVP z własnymi komponentami, bez shortcutów:

1. **Baza danych gier** — import metadanych ze Steam API
2. **3 urządzenia** — Steam Deck OLED, ROG Ally X, Legion Go
3. **Formularz raportu wydajności** — gra + urządzenie + FPS + ustawienia + komentarz
4. **Import Steam Deck Verified** — jako punkt wyjścia (etykiety, nie pełne dane)
5. **Auth** — logowanie przez Steam/Google
6. **SEO-zoptymalizowane strony gier** — główny kanał akwizycji
7. **Własny system komentarzy** — pełna kontrola, moderacja, threaded comments, markdown
8. **Wyszukiwarka z Meilisearch** — typo-tolerant, instant search, filtry po urządzeniu/gatunku/FPS
9. **10-20 własnych, high-quality testów** — content moat, budowanie wiarygodności

### 4.3. Realistyczny harmonogram MVP:

| Tydzień | Zakres |
|---|---|
| 1-2 | Research, design, schema bazy, wireframes, konfiguracja projektu |
| 3-6 | Core backend: baza danych, Steam API, auth, CRUD raportów |
| 7-9 | Frontend: strony gier/urządzeń, formularz raportu |
| 10-11 | Własny system komentarzy: threaded comments, moderacja, markdown, reactions |
| 12-13 | Wyszukiwarka Meilisearch: instant search, filtry, autocomplete, faceted search |
| 14 | SEO + deploy: generacja stron, sitemap, meta tagi, structured data |
| 15 | Soft launch: Reddit post, 3-5 artykułów, feedback |
| 16-22 | Iteracja na podstawie feedbacku (NIE na podstawie roadmapy) |
| 23+ | AI pipeline, newsletter, rozbudowa |

---

## 5. JAK SIĘ RÓŻNIĆ OD DECKVERIFIED.GAMES

### Rekomendowana strategia: "Wirecutter for Handhelds" (Opcja A+B)

**DeckVerified** = crowdsource, surowe dane, techniczny interfejs
**Handheld GameDB** = redakcyjna jakość + lepsza wizualizacja

Konkretnie:
1. **Standaryzowana metodologia testów** — powtarzalna, przejrzysta, z benchmarkami
2. **"Optimal Settings Finder"** — użytkownik wybiera grę + urządzenie → dostaje najlepsze ustawienia dla 30/40/60 FPS
3. **Porównania side-by-side** — wykresy, wizualizacje, nie surowe tabele
4. **System tier'ów jakości** — złoto/niebieski/szary/kreskowany — widoczny na pierwszy rzut oka
5. **Redakcyjny głos** — nie "wiki", a "zaufany ekspert"

---

## 6. ALTERNATYWNE STRATEGIE DO ROZWAŻENIA

### 6.1. Open-source partial (rekomendowane)
- Open-source: API raportów, schema danych, formularze
- Proprietary: frontend, warstwa redakcyjna, wizualizacje
- Model: "open data, proprietary presentation" (jak OpenStreetMap vs Google Maps)

### 6.2. Plugin Decky jako uzupełnienie (nie jako core)
- Po zbudowaniu core'a — plugin podpowiadający ustawienia na urządzeniu
- Ale nie jako główny produkt — brak SEO, brak monetyzacji

### 6.3. Jedno USP zamiast "wszystkiego" (najsilniejsza rekomendacja)
- **"Optimal Settings Finder"** — jedna strona, jedna gra, jedno urządzenie, jasna odpowiedź
- To jest coś, czego Google nie daje w jednym kliknięciu, Reddit wymaga przeszukiwania wątków, a DeckVerified nie robi dobrze

---

## 7. REALISTYCZNE SCENARIUSZE

### Najlepszy (10% szans)
- MVP w 12 tygodni, viralowy Reddit post, 10K użytkowników w tydzień 1
- 200+ raportów w miesiącu 1, 20K monthly visitors po 6 mies
- Pierwsze affiliate income ($200-500/mies) po 9 mies

### Realistyczny (50% szans)
- MVP w 14-16 tygodni, launch przynosi 2-5K użytkowników
- 50-100 raportów w miesiącu 1 (większość własnych)
- 5-8K monthly visitors po 6 mies, zero przychodu przez 12 mies

### Najgorszy (40% szans)
- Scope creep → 6-8 mies development, cichy launch, 500 użytkowników
- Użytkownicy wolą DeckVerified (więcej danych), wypalenie po 4-5 mies

### Metryki product-market fit (miesiące 1-3):

| Metryka | Cel miesiąc 1 | Cel miesiąc 3 | Red flag |
|---|---|---|---|
| Raporty wydajności (nie Twoje) | 50 | 300 | <20 po 3 mies = brak PMF |
| Powracający użytkownicy/tydzień | 100 | 500 | <50 = brak retencji |
| Organiczny ruch z Google | 500 | 3,000 | <500 po 3 mies = problem SEO |
| Czas na stronie gry | >2 min | >2 min | <30s = zła treść |

---

## 8. PROPONOWANY TECH STACK (ZREWIDOWANY)

| Kategoria | Rekomendacja | Uzasadnienie |
|---|---|---|
| Framework | **Astro 5** | Zero JS domyślnie, tańszy hosting, lepsze SEO |
| Interaktywność | React Islands | Formularze, wyszukiwarka, komentarze |
| Baza danych | **Supabase** (PostgreSQL) | Auth + DB + Storage w jednym, $25/mies |
| ORM | **Drizzle** | Lekki, SQL-bliski, dobry dla złożonych zapytań |
| Search | **Meilisearch** (self-hosted) | $5-10/mies VPS, typo-tolerant |
| Auth | **Supabase Auth** lub **Auth.js v5** | Supabase = zero maintenance; Auth.js = custom Steam OAuth |
| AI | **Claude API** (Haiku dla bulk, Sonnet dla redakcji) | $5-20/mies, batch API 50% taniej |
| Hosting | **Cloudflare Pages** | Darmowy, globalny CDN, edge rendering |
| Storage | **Cloudflare R2** lub **Supabase Storage** | Darmowy egress |
| Analytics | **Plausible** | Privacy-first, GDPR, $9/mies |
| Monitoring | **Sentry** (free tier) | Error tracking |

**Szacowany koszt miesięczny**: $40-100/mies (vs $100-250 z oryginalnym stackiem)

---

## 9. WERDYKT KOŃCOWY

### Ten projekt MOŻE się udać jako:
Niszowy, content-driven serwis z silnym SEO, redakcyjną jakością i "Optimal Settings Finder" jako core feature.

### Ten projekt NIE MOŻE się udać jako:
"Uniwersalna platforma z AI, społecznością, YouTube'em, newsletterem, Discordem i monetyzacją" budowana przez jednego człowieka w 24 tygodnie.

### 5 rzeczy do zrobienia ZANIM zaczniesz kodować:
1. Przeanalizuj deckverified.games dogłębnie — znajdź ich słabości
2. Obetnij zakres do MVP (10-12 tygodni)
3. Zdecyduj się na Astro vs Next.js (rekomendacja: Astro)
4. Przygotuj budżet na 12-18 mies bez przychodu ($100-200/mies infra)
5. Zdefiniuj metryki product-market fit i deadline na pivot (3 miesiące po launch)

---

## 10. POGŁĘBIONA ANALIZA RYNKU NEWSOWEGO

### Krajobraz newsów handheldowych (stan na marzec 2026)

**Istniejące źródła newsów:**

| Źródło | Ruch/mies | Scope | Model |
|---|---|---|---|
| **SteamDeckHQ** | 1.36M wizyt (+122% wzrost) | Steam Deck only | Reklamy + community |
| **Retro Handhelds** (retrohandhelds.gg) | ? | Retro handheldy | Community |
| **Tom's Hardware / PC Gamer / The Verge** | Masowy | Handheldy jako podzbiór | Reklamy |
| **Reddit (r/SteamDeck)** | 900K+ subskrybentów | Steam Deck | Community |

**YouTube — duża publiczność, ale brak news-aggregatora:**

| Kanał | Subskrybenci | Focus |
|---|---|---|
| ETA Prime | 1.34M | Hardware reviews, emulacja |
| Retro Game Corps | ~778K | Retro/modern, poradniki |
| NerdNest | 152K | Gaming handheld |
| Gardiner Bryant | 130K+ | Linux gaming, SteamOS |
| Fan The Deck | 104K | Steam Deck exclusive |

### Kluczowa luka: BRAK multi-device news aggregatora

SteamDeckHQ dominuje newsy Steam Decka. Mainstream media pokrywa handheldy fragmentarycznie. **Nikt nie agreguje newsów ze świata WSZYSTKICH handheldów w jednym miejscu.**

### Werdykt: News jako standalone = marginalne. News jako komponent DB = wysokie.

- **RPM w gamingu**: $0.80-$2.20/1000 wyświetleń — jedne z najniższych w sieci
- **Potrzeba 500K+ wizyt/mies** żeby news się monetyzował samodzielnie
- **ALE**: news jako retention mechanism dla bazy danych = wysoka wartość:
  - Użytkownicy wracają po newsy → widzą bazę danych → generują raporty
  - Cross-linking news → strony gier = SEO juice
  - Niski koszt produkcji z AI (3-5 newsów/dzień, 20-30 min review)

### Rekomendacja dla newsów:
- **Częstotliwość**: 3-5 newsów dziennie (nie 5-8 jak plan zakłada)
- **Scope**: Multi-device (jedyny taki na rynku)
- **AI workflow**: Scraping RSS/Reddit → AI draft → ludzki review → publish
- **Nie monetyzuj newsów osobno** — traktuj jako engagement tool dla bazy danych
- **Newsletter**: dopiero po osiągnięciu 5K+ regularnych czytelników

---

## 11. POGŁĘBIONA ANALIZA BIZNESOWA

### Porównywalne projekty — co działa, co nie:

| Projekt | Model | Ruch | Przychód | Status |
|---|---|---|---|---|
| **PCGamingWiki** | Patreon + reklamy | 10K+ UV/dzień | Niejawny (Patreon) | Działa, 12+ lat |
| **HowLongToBeat** | Solo → przejęcie Ziff Davis (2021) | Masowy | Przejęte za nieokreśloną kwotę | Exit success |
| **SystemRequirementsLab** | Reklamy | 7.5M wizyt/mies | ~$267K/rok | Stabilne |
| **IsThereAnyDeal** | Affiliate + reklamy | ~globalne #24K | Niejawny | Stabilne |
| **ProtonDB** | Volunteer/community | Wysokie | ~$0 (brak monetyzacji) | Community-driven |

**Kluczowy wniosek**: Niszowe bazy gamingowe działają w dwóch modelach:
1. **Hobby + Patreon** (PCGamingWiki, ProtonDB) — zrównoważone, ale nie zarabiają
2. **Masowy ruch + reklamy** (SystemRequirementsLab) — wymaga milionów wizyt
3. **Exit** (HowLongToBeat) — solo founder → przejęcie przez media company

### Potencjał przychodowy (realistyczna projekcja):

| Faza | Wizyt/mies | Reklamy | Affiliate | Patreon | TOTAL |
|---|---|---|---|---|---|
| Miesiąc 1-6 | 5-10K | $15-50 | $20-50 | $0 | **$35-100** |
| Miesiąc 6-12 | 50-100K | $150-500 | $100-200 | $50-200 | **$300-900** |
| Miesiąc 12-18 | 100-250K | $500-1,500 | $200-500 | $100-500 | **$800-2,500** |
| Miesiąc 18-36 | 250K-1M | $1,500-5,000 | $500-2,000 | $200-1,000 | **$2,200-8,000** |

**Wniosek**: $2K/mies (minimum opłacalności) realnie osiągalne po **12-18 miesiącach** ciągłej pracy.

### Affiliate stawki w gamingu:
- Amazon gaming hardware: **1-2%** prowizji (niskie!)
- Klucze gier (Fanatical): **5%**
- Akcesoria gaming: **3-5%**
- **Affiliate NIE będzie głównym źródłem dochodu** — za niskie stawki na hardware

### KRYTYCZNE ZAGROŻENIE: Google AI Overviews

- AI Overviews pojawiają się w **35%+ wyszukiwań** w USA
- Strony informacyjne raportują **15-70% spadki ruchu**
- **50%+ mniej kliknięć** gdy AI odpowiada na pytanie
- Zapytania typu "best settings X game on Steam Deck" = idealne do AI Overviews

**Mitygacja**: Baza danych z interaktywnymi narzędziami (filtry, porównania, wykresy) jest trudniejsza do zastąpienia przez AI niż statyczny tekst. "Optimal Settings Finder" jako interaktywny tool > artykuł.

### Timeline do opłacalności:

- **Miesiące 1-6**: Budowanie contentu, SEO foundation. Minimalny ruch/przychód.
- **Miesiące 6-12**: Powolny wzrost organiczny. $300-900/mies jeśli SEO zadziała.
- **Miesiące 12-18**: Punkt zwrotny. $800-2,500/mies możliwe.
- **50% niszowych stron upada w roku 1** bo "przychody nie nadchodzą wystarczająco szybko"

### Wymagany runway: **$15-30K oszczędności** (12-18 mies × $100-200/mies infra + opportunity cost)

---

## 12. FINALNY WERDYKT: CZY WARTO BUDOWAĆ?

### Odpowiedź: **WARUNKOWO TAK** — ale nie tak, jak plan zakłada

### ✅ BUDUJ JEŚLI:

1. **Masz 18-24 miesiące cierpliwości** do pierwszych znaczących przychodów
2. **Masz $15-30K runway** (oszczędności na infrastrukturę + życie bez dochodu z projektu)
3. **Obetniesz zakres o 60%** — MVP w 10-12 tygodni, nie "wszystko naraz"
4. **Budujesz interaktywne narzędzie** ("Optimal Settings Finder"), nie kolejną statyczną bazę danych
5. **Celujesz w "Wirecutter for handhelds"** — redakcyjna jakość + dane, nie wiki
6. **News traktujesz jako retencję**, nie standalone produkt
7. **Jesteś gotowy na $0-100/mies przychodu przez 6-12 miesięcy**

### ❌ NIE BUDUJ JEŚLI:

1. **Potrzebujesz dochodu w ciągu 6 miesięcy**
2. **Nie możesz jasno powiedzieć, czym się różnisz** od SteamDeckHQ + DeckVerified
3. **Planujesz budować "wszystko"** (DB + news + YouTube + community + newsletter + Discord) naraz
4. **Nie masz runway** na 12-18 mies bez przychodu
5. **Twój value prop to "to samo, ale ładniejsze"** — to za mało

### Kluczowe zmiany vs oryginalny plan:

| Aspekt | Oryginalny plan | Rekomendacja |
|---|---|---|
| Pozycjonowanie | "Uniwersalna platforma" | "Optimal Settings Finder + redakcja" |
| Timeline MVP | 24 tygodnie (pełny scope) | 10-12 tygodni (obcięty scope) |
| Timeline przychody | "From launch" | 12-18 mies do $2K/mies |
| Tech stack | Next.js + Vercel ($100-250/mies) | Astro + CF Pages + Supabase ($40-100/mies) |
| News | 5-8/dzień + pełny pipeline | 3-5/dzień, AI-assisted, jako retencja |
| YouTube | 1-2 filmy/tydzień | Odroczone na po MVP |
| Konkurencja | "Nikt tego nie robi" | DeckVerified + SteamDeckHQ + DeckuDB istnieją |
| Rynek | 15-20M userów | 6-8M kumulatywnie |
| Monetyzacja | Affiliate + ads | Patreon + ads hybrid (affiliate za niskie stawki) |

### Szansa na sukces (zrewidowana):

- **Sukces** (>$2K/mies po 18 mies): **25-35%** — jeśli konsekwentnie budujesz, masz PMF po 3 mies
- **Przetrwanie** (hobby, pokrywa koszty): **40-50%** — jeśli nie wypalasz się
- **Porażka** (porzucenie): **25-35%** — scope creep, brak retencji, wypalenie

To są uczciwe liczby. Projekt jest wart podjęcia jeśli masz realistyczne oczekiwania i cierpliwość.

---

## 13. PEŁNA LISTA FEATURE'ÓW — FULLY FLEDGED PRODUCT

Skompilowana z pogłębionej analizy: research najlepszych baz gier (IGDB, RAWG, HowLongToBeat, Backloggd, GG.deals), baz wydajności (PCGamingWiki, ProtonDB, UserBenchmark, SteamDeckHQ), modeli monetyzacji (Backloggd 1,300 patronów, IsThereAnyDeal, SteamDeckHQ) i pipeline'ów danych (Steam API, IGDB, SteamSpy, ProtonDB).

---

### 13.1. STRONA GRY (najważniejsza strona — tu trafia SEO traffic)

**URL**: `/games/elden-ring`

**Sekcja 1: Hero**
- Header image z Steam + nazwa gry + developer/publisher
- Tagi: gatunek, silnik, Metacritic/OpenCritic score, HLTB czas gry
- **"Quick verdict" badge** per urządzenie: ✅ 60fps / ⚡ 40fps / ⚠️ 30fps / ❌ Unplayable
- ProtonDB tier (Platinum/Gold/Silver/Bronze) + Steam Deck Verified status
- Cena + link do najtańszego sklepu (affiliate)

**Sekcja 2: Optimal Settings Finder (CORE USP)**
- Użytkownik wybiera urządzenie z dropdown'a
- Pokazuje 3 karty profili wydajności (jak pricing tiers):
  - **🔋 Battery Saver**: najniższy TDP utrzymujący 30 FPS → szacowany czas baterii
  - **⚖️ Balanced**: średni TDP, 40 FPS target
  - **🚀 Performance**: wysoki TDP, 60 FPS target
- Każda karta zawiera: TDP (W), GPU clock, rozdzielczość, FSR mode, kluczowe ustawienia grafiki, szacowany czas baterii, thermal note (cool/warm/hot), fan noise (silent/audible/loud)
- Źródło danych: algorytm consensus z raportów community + redakcyjna walidacja
- **Confidence badge**: "High (23 reports)" / "Medium (5 reports)" / "Low (2 reports)"

**Sekcja 3: Device Performance Grid**
- Tabela: urządzenia na osi X, metryki na osi Y
- Kolory komórek: zielony (60fps), żółty (30-40fps), czerwony (<30fps)
- Metryki: FPS avg, typowy preset, TDP, czas baterii, thermal
- Klikalne — prowadzi do strony game+device combo

**Sekcja 4: Kompatybilność (beyond performance)**
- Checklist z ikonami ✅/⚠️/❌:
  - Controller mapping (działa OOB / wymaga remapu / broken)
  - Anti-cheat status (działa / broken / online-only broken)
  - Suspend/resume (działa / traci progress / crash)
  - Cloud save sync
  - Gyro/trackpad support (Steam Deck specific)

**Sekcja 5: Community Reports**
- Lista raportów wydajności posortowanych wg upvotes + recency
- Każdy raport: user avatar + badge, urządzenie, FPS, preset, TDP, czas baterii, notatki
- Przycisk "Did these settings work for you? [Yes] [No]" pod każdym raportem
- Filtry: po urządzeniu, FPS target, TDP range
- Przycisk "Submit your report" (prominent CTA)

**Sekcja 6: Komentarze (własny system)**
- Threaded comments z markdown support
- Reakcje (👍 ❤️ 🔥 🤔)
- Moderacja: flag, delete, shadow-ban
- Sortowanie: newest, most upvoted, most helpful

**Sekcja 7: Metadata sidebar**
- Metacritic/OpenCritic score
- HowLongToBeat (Main / Main+Extras / Completionist)
- Aktualna najniższa cena (affiliate link)
- SteamSpy popularity (owner estimate, CCU)
- Powiązane gry (IGDB related games)
- Tagi Steam (z SteamSpy, bo Steam API ich nie daje)

**SEO**: Schema.org VideoGame + Review markup, meta title "[Game] Performance on Handhelds — Best Settings for Steam Deck, ROG Ally, Legion Go", auto-generated FAQ section

---

### 13.2. STRONA GRA+URZĄDZENIE (money page dla SEO)

**URL**: `/games/elden-ring/steam-deck-oled`

**Sekcja 1: Performance Summary Card**
- Duży verdict: "GOOD — 40 FPS at Medium, 9W TDP, ~3.2h battery"
- Confidence level z liczbą raportów
- Shareable performance card (designed for Reddit/Discord/Twitter) z one-click share
- Porównywalny URL: `?compare=rog-ally-x`

**Sekcja 2: TDP Profile Cards (3 karty)**
- Identyczne jak na stronie gry, ale z pełnymi detalami dla tego urządzenia
- Każda karta: pełna lista ustawień graficznych (nie tylko "Medium preset" ale "Shadows: Medium, Draw Distance: High, AA: TAA...")
- Slider "Battery Life vs Performance" — użytkownik przesuwa między Battery Saver a Performance i widzi jak zmienia się FPS/battery/thermal w real-time

**Sekcja 3: Trend wydajności**
- Wykres liniowy: FPS over time, adnotowany z patch notes i driver updates
- "Cyberpunk 2077 on Steam Deck: Was 25 FPS at launch, now 42 FPS after Patch 2.2"
- Automatyczne flagowanie: "Game updated since last report — performance may have changed"

**Sekcja 4: FPS Distribution Chart**
- Histogram: ile userów raportuje 30fps? 40? 60?
- Pokazuje variance — niektóre gry działają spójnie, inne mają duży rozrzut

**Sekcja 5: All Community Reports**
- Pełna lista raportów dla tego game+device combo
- Filtrowanie po: game version, OS version, TDP range, FPS range
- Flagowanie stale reports (starsze niż major driver update)

**Sekcja 6: Komentarze + discussion**

---

### 13.3. STRONA URZĄDZENIA

**URL**: `/devices/steam-deck-oled`

**Sekcja 1: Device Hero**
- Zdjęcie urządzenia, specs, cena, link do kupna (affiliate)
- Key stats: łączna liczba przetestowanych gier, % gier na 60/40/30 fps, średni czas baterii

**Sekcja 2: Device "Report Card"**
- "Steam Deck OLED runs 73% of tested AAA titles at 40+ FPS"
- "Average battery life: 2.4 hours (all games), 3.8 hours (indie games)"
- Porównanie z innymi urządzeniami w kluczowych metrykach

**Sekcja 3: Best Games for This Device**
- Top 10 gier: highest rated performance, filtrowane po gatunku
- Auto-generowane listy: "Best RPGs for Steam Deck OLED", "60 FPS Games for Steam Deck OLED"

**Sekcja 4: All Tested Games**
- Tabela z filtrami: gatunek, FPS tier, rok wydania, cena
- Color-coded cells: green/yellow/red performance indicators

**Sekcja 5: Recent Reports**
- Najnowsze raporty wydajności dla tego urządzenia

---

### 13.4. PORÓWNANIE URZĄDZEŃ

**URL**: `/compare/steam-deck-oled/rog-ally-x` lub `/compare/elden-ring/steam-deck-oled/rog-ally-x`

**Dwa tryby:**

**A) Device vs Device (ogólne)**:
- Tabela specs side-by-side
- Aggregate stats: % gier na 60/40/30 fps, avg battery, avg thermal
- "Winner" per kategoria z ikoną

**B) Device vs Device for specific game**:
- FPS porównanie per TDP tier
- Battery life porównanie
- Thermal behavior
- "Which device is better for this game?" verdict

**Performance Heatmap Grid** (unikalna wizualizacja):
- Grid: gry na Y-axis, urządzenia na X-axis, komórki color-coded po FPS tier
- Filtry: gatunek, rok, confidence level
- Screenshot-worthy — idealne do share'owania na Reddit

---

### 13.5. WYSZUKIWARKA (Meilisearch)

- **Instant search** z autocomplete (as-you-type)
- **Typo tolerance** (Meilisearch domyślnie obsługuje)
- **Faceted search**: filtry po urządzeniu, gatunku, FPS tier, cenie, compatibility status
- **Sortowanie**: po popularności, nazwie, dacie premiery, performance score
- **"What Should I Play?" mode**: user wybiera urządzenie + gatunek + FPS target + max czas gry (battery constraint) → ranked lista gier
- **Quick filters**: "Only games I own" (po Steam Library import), "Only Verified data", "Only games under $20"

---

### 13.6. SYSTEM KOMENTARZY (własny)

- **Threaded replies** (max 3 levels deep)
- **Markdown** support (GFM subset: bold, italic, links, code, lists)
- **Reakcje**: thumbs up, heart, fire, thinking (emoji select)
- **Moderacja**: report/flag, admin delete, shadow-ban, auto-flag (regex patterns for spam)
- **Sortowanie**: best (upvotes - downvotes), newest, oldest
- **Rate limiting**: max 10 komentarzy/h per user
- **Edit window**: 15 min po opublikowaniu
- **Powiadomienia**: email when someone replies to your comment (opt-in)

---

### 13.7. FORMULARZ RAPORTU WYDAJNOŚCI

**Krok 1**: Wybierz grę (autocomplete search)
**Krok 2**: Wybierz urządzenie (3+ do wyboru)
**Krok 3**: Performance data:
- FPS avg (number input) + FPS low/1% (optional)
- FPS target (30/40/60/120 radio)
- FPS stability (stable / mostly stable / unstable)
- Resolution (dropdown: native, 960x600, 720p, custom)
- Graphics preset (low/medium/high/ultra/custom)
- FSR enabled? (toggle) + FSR mode (quality/balanced/performance/ultra performance)

**Krok 4**: Power & thermal:
- TDP limit (slider, device-specific range)
- GPU clock override (optional)
- Battery life (slider: <1h, 1-2h, 2-3h, 3-4h, 4h+)
- Thermal (cool / warm / hot — z tooltip wyjaśniającym)
- Fan noise (silent / quiet / audible / loud)

**Krok 5**: Compatibility:
- Controller (works OOB / needs remap / broken)
- Anti-cheat (works / broken / N/A)
- Suspend/resume (works / issues / broken)

**Krok 6**: Custom settings (opcjonalne):
- Key-value pairs per game-specific options (JSONB)
- Screenshot upload (proof)
- Notes (freeform text, markdown)

**Krok 7**: Software versions (auto-detect where possible):
- Game version / Steam build ID
- OS version (SteamOS 3.6.x / Windows 11)
- GPU driver version

**Overall rating**: Excellent / Good / Fair / Poor / Unplayable

**Walidacja**: Duplicate detection (same user + game + device within 7 days = update, not new report)

---

### 13.8. STEAM LIBRARY IMPORT + DASHBOARD

**Onboarding flow:**
1. User loguje się przez Steam OAuth
2. System pobiera listę posiadanych gier (Steam API `GetOwnedGames`)
3. **"Your Library Performance Dashboard"**:
   - "142 of your 350 games have performance data"
   - "89 run at 60 FPS on Steam Deck OLED"
   - "12 have known issues"
   - "23 games need testing — be the first to report!"
4. Filtry: po urządzeniu, FPS tier, compatibility status
5. Sortowanie: by performance score, by play time, by recently added

**Retention value**: Personalized data = reason to come back. RAWG i Backloggd dowodzą, że import biblioteki tworzy investment.

**Growth value**: "23 games need testing" naturalnie zachęca do tworzenia raportów.

---

### 13.9. "MY SETUP" — PERSISTENT DEVICE PROFILE

- User zapisuje swoje urządzenie(a) raz
- Cała strona adaptuje się: game pages domyślnie pokazują dane dla jego urządzenia
- Search results priorytetyzują jego urządzenie
- Dashboard pokazuje kompatybilność z jego setupem
- Toggle w headerze do przełączania między urządzeniami (jeśli ma >1)

---

### 13.10. SYSTEM GŁOSOWANIA NA RAPORTY

- Pod każdym raportem: "Did these settings work for you? [Yes] [No]"
- Raporty z wysokim % "Yes" → float to top
- Raporty z wysokim % "No" → flagowane do review
- **Self-correcting data quality** bez ciężkiej moderacji (model ProtonDB)

---

### 13.11. AUTO-GENEROWANE STRONY DLA NOWYCH GIER

- Monitoring Steam API `IStoreService/GetAppList` (daily cron)
- Nowa gra na Steam → auto-generuj stub page z metadanymi
- Prominent CTA: "No performance data yet — be the first to report!"
- Alert do userów, którzy mają grę na wishliście
- **Captures peak search traffic** w dniu premiery

---

### 13.12. SHAREABLE PERFORMANCE CARDS

- Wizualnie atrakcyjna karta PNG/SVG: "[Game] on [Device]: 45 FPS at High Settings, Battery: 2.5hrs"
- Designed for: Twitter/X, Reddit, Discord, Instagram Stories aspect ratios
- One-click share buttons
- Branded footer z URL strony
- QR code do pełnej strony
- **"My Setup" card**: roczne/kwartalne podsumowanie (inspiracja Spotify Wrapped):
  - "You tested 47 games on your ROG Ally X"
  - "Your top genre: RPGs"
  - "Most-played verified game: Baldur's Gate 3"

---

### 13.13. GAMIFIKACJA I CONTRIBUTOR SYSTEM

**System punktów:**

| Akcja | Punkty |
|---|---|
| Nowy raport | 10 |
| Raport zweryfikowany | 25 |
| Raport z 5+ upvotes | 15 |
| Pierwszy raport dla game+device combo | 50 |
| 10 raportów w miesiącu | Bonus 100 |
| Raport dla nowej gry (<7 dni od premiery) | 30 |

**Poziomy:**

| Punkty | Tytuł | Uprawnienia |
|---|---|---|
| 0-50 | New Tester | Podstawowe |
| 50-200 | Contributor | Może flagować raporty |
| 200-500 | Veteran Tester | Może edytować cudze raporty |
| 500-1000 | Expert Tester | Raporty auto-approved |
| 1000+ | Elite Tester | Kandydat na Verified Tester, może moderować |

**Leaderboardy:**
- Monthly top contributors (reset co miesiąc — szansa dla nowych)
- All-time top contributors
- Top contributors per device
- "Most Helpful" (wg upvotes na raportach)

**Monthly Challenges:**
- "March Madness: Test every FromSoft game on your handheld"
- "Indie Month: Submit 5 indie game reports"
- "New Device Challenge: First 50 reports for MSI Claw get a special badge"
- "Day One Challenge: Be the first to report settings for this week's new release"

---

### 13.14. NOTIFICATIONS / ALERTS

**Tier 1: Spersonalizowane triggery (automated)**
- "Elden Ring just got tested on your ROG Ally — see the results"
- "New game you own was verified at 60fps on Steam Deck"
- "Your report was verified! Here's how it compares"

**Tier 2: Weekly digest**
- "This Week: 47 new games tested, 3 new device reviews"
- Top 5 most-tested games this week
- "Trending: These games just got major performance patches"

**Tier 3: Event-driven**
- "Steam Sale: best-performing handheld deals" (affiliate opportunity)
- "New device launched: ROG Ally 2 — here's what we know"

**Kanały**: in-app notifications + email (opt-in) + push (later)

---

### 13.15. MONETYZACJA — SUPPORTER TIERS

**Tier 1: Supporter ($2/mies)**
- Ad-free experience
- Supporter badge na profilu
- Imię na stronie supporterów
- Dostęp do supporter Discord channel

**Tier 2: Pro ($5/mies)**
- Wszystko z Tier 1
- Advanced comparison tools (do 5 urządzeń side-by-side)
- Custom alerts ("Notify when Elden Ring gets tested on Legion Go S")
- CSV/JSON export danych
- Early access do nowych feature'ów
- Priority report verification
- Custom profile themes

**Tier 3: Creator ($10/mies)**
- Wszystko z Pro
- API access (1,000 req/dzień)
- "Verified Tester" badge (po procesie weryfikacji)
- Wpływ na roadmapę (voting)

**NIGDY za paywallem**: core performance data, basic search, submitting reports, reading comments

---

### 13.16. AD NETWORKS & REVENUE

| Sieć | Min traffic | Gaming fit | Szac. RPM |
|---|---|---|---|
| **NitroPay** (Overwolf) | 100K pv/mies | Dedykowana gamingowi, adblock recovery | $3-8 |
| **Mediavine** | 50K sessions/mies | Dobra dla blogów | $11-14 |
| **Raptive** | 100K pv/mies | Premium | Wyższe niż Mediavine |
| **Google AdSense** | Brak | Fallback only | $1-4 |

**Problem**: 40-60% adblock rate wśród gamerów → Patreon/supporter model ważniejszy niż ads.

**Realistyczne projekcje przychodu (zaktualizowane):**

| Kanał | Mies 6 | Mies 12 | Mies 18 | Mies 24+ |
|---|---|---|---|---|
| Display Ads | $50-150 | $200-600 | $500-1,500 | $1,000-3,000 |
| Patreon/Supporters | $0-50 | $100-400 | $300-800 | $500-1,500 |
| Affiliate (gry) | $20-50 | $50-150 | $100-300 | $200-500 |
| Affiliate (hardware) | $0-20 | $50-100 | $100-300 | $200-500 |
| Hardware sponsorships | $0 | $0-200 | $200-1,000 | $500-2,000 |
| **TOTAL** | **$70-270** | **$400-1,450** | **$1,200-3,900** | **$2,400-7,500** |

---

### 13.17. GROWTH HACKS

1. **Browser extension** — pokazuje HandheldDB ratings na stronach Steam Store (model ProtonDB extension)
2. **Shareable comparison links** — `handheldgamedb.com/compare/elden-ring/steam-deck-vs-rog-ally` → SEO goldmine + Reddit bait
3. **Embeddable performance badge** — `<iframe>` widget "Verified 60fps on Steam Deck" do forów/blogów
4. **Reddit/Discord bot** — `/handheld Elden Ring Steam Deck` → formatted performance summary
5. **Steam Library scan** — "Connect Steam, see what runs on your handheld" → personal investment → reports

---

### 13.18. DATA PIPELINE — SOURCES & RATE LIMITS

| Source | Co daje | Rate limit | Koszt |
|---|---|---|---|
| **Steam appdetails** | Metadata, ceny, requirements, screenshots | 200 req/5 min | Darmowe |
| **Steam Deck Compat API** | Verified/Playable/Unsupported labels | — | Darmowe |
| **SteamSpy** | Tagi, owner estimates, CCU, review scores | 1 "all" req/min | Darmowe |
| **IGDB** (Twitch OAuth) | Related games, franchises, game modes, ratings | 4 req/sec | Darmowe (non-commercial) |
| **ProtonDB** | Linux compatibility tiers | Open API | Darmowe |
| **OpenCritic** (RapidAPI) | Review scores | Varies | Freemium |
| **HowLongToBeat** | Completion times | Unofficial wrappers | Darmowe |
| **SteamGridDB** | High-quality artwork | API v2 | Darmowe |
| **PCGamingWiki** (Cargo API) | Graphics API, config locations, fixes | MediaWiki API | Darmowe |

**UNIKAJ**: RAWG API (unmaintained, unreliable — wiele projektów migrowało na IGDB)

**Seeding timeline:**
1. Pull Steam catalog: `IStoreService/GetAppList` (~49K apps, 1 call)
2. Enrich z SteamSpy (tags, popularity): ~1 hour
3. Fetch `appdetails` for top 600 games: ~15 min at rate limit
4. Fetch Deck compat for all: ~6 hours
5. Fetch ProtonDB tiers: ~8K calls
6. Import ShareDeck reports (scrape)
7. AI extraction z Reddit threads dla top 100 gier
8. Manualne testy: 10-20 gier

**Launch coverage**: ~500 gier z danymi wydajności, ~6,000 z metadanymi + Valve labels

---

### 13.19. DATABASE SCHEMA (kluczowe tabele)

**Game**: steam_appid, igdb_id, name, slug, description, genres[], tags[] (SteamSpy), developers[], release_date, price, protondb_tier, deck_compatibility, metacritic_score, opencritic_score, hltb_hours, last_sync

**Device**: name, manufacturer, chip, gpu, ram_gb, screen_resolution, screen_size, battery_wh, tdp_range, default_tdp, os, release_date, msrp_usd

**PerformanceReport**: game_id, device_id, user_id, fps_avg, fps_low, fps_target (30/40/60/120), fps_stability, resolution, preset, fsr_enabled, fsr_mode, tdp_limit_watts, gpu_clock_mhz, battery_life_hours, thermal_throttling, fan_noise, overall_rating, custom_settings (JSONB), game_version, os_version, gpu_driver_version, quality_tier (verified/community_confirmed/reported/ai_estimated), upvotes, downvotes, flagged, screenshots[], notes

**Consensus Rating Algorithm:**
1. Filter non-flagged, non-stale reports
2. Weight: verified=5x, community_confirmed=3x, reported=1x, ai_estimated=0.5x
3. Recency: exponential decay, half-life=90 days
4. Upvote ratio: Bayesian smoothing `(up+1)/(up+down+2)`
5. Confidence: `<3 reports = Low, 3-10 = Medium, >10 = High`

**Staleness detection:**
- Game update (Steam build ID change) → "Game updated since this report" banner
- Major driver release → flag all older reports for that platform
- Time decay (>6 months without corroboration) → "May be outdated" badge
- Contradiction (new report differs >20 FPS from consensus) → flag old reports

---

### 13.20. AI FEATURES ($5-30/mies budget)

| Feature | Model | Koszt/operacja | Użycie |
|---|---|---|---|
| Synteza optymalnych ustawień z raportów | Haiku | ~$0.004/grę | Auto-generate 3 TDP profiles z community data |
| SEO descriptions | Haiku bulk, Sonnet featured | ~$0.02/stronę | Meta descriptions, FAQ sections, intros |
| Kategoryzacja gier po performance tier | Haiku | ~$0.002/grę | Lightweight/Medium/Demanding/Very Demanding |
| Predykcja performance (untested combos) | Sonnet | ~$0.02/predykcję | Cross-reference device ratios (AI Estimated tier) |
| Reddit/Discord extraction | Sonnet | ~$0.03/wątek | Extract FPS, settings, TDP z dyskusji |
| Staleness detection | Haiku | ~$0.001/raport | Detect outdated/invalid reports |

**Batch API = 50% taniej**. 5,000 game+device combinations = ~$20-50 jednorazowo.

---

### 13.21. PRIORYTETYZACJA FEATURE'ÓW — ROADMAP

#### FAZA 1: Core Product (tydzień 1-16)

| # | Feature | Effort | Impact | Priorytet |
|---|---|---|---|---|
| 1 | Baza danych gier + Steam API import | 2 tyg | Critical | P0 |
| 2 | 3 urządzenia + device pages | 1 tyg | Critical | P0 |
| 3 | Performance report form (pełny) | 2 tyg | Critical | P0 |
| 4 | Auth (Steam + Google) | 1 tyg | Critical | P0 |
| 5 | Game pages z SEO | 2 tyg | Critical | P0 |
| 6 | TDP Profile Cards (Optimal Settings Finder) | 3 tyg | Critical — core USP | P0 |
| 7 | Battery Life Estimator | 2 tyg | High — #1 user question | P0 |
| 8 | Własny system komentarzy | 2 tyg | High | P0 |
| 9 | Meilisearch wyszukiwarka | 2 tyg | High | P0 |
| 10 | Report voting (Yes/No) | 1 tyg | High — data quality | P0 |
| 11 | "My Setup" persistent profile | 1 tyg | High — personalizacja | P0 |
| 12 | Game metadata enrichment (IGDB, scores, HLTB) | 2 tyg | High — one-stop shop | P1 |
| 13 | Steam Library Import + Dashboard | 3 tyg | High — stickiest feature | P1 |
| 14 | New release auto-pages | 2 tyg | High — captures peak traffic | P1 |
| 15 | Shareable performance URLs/cards | 1 tyg | High — growth | P1 |
| 16 | Import Steam Deck Verified + ProtonDB | 1 tyg | Medium — bootstrap data | P1 |

#### FAZA 2: Post-Launch miesiąc 1-3

| # | Feature | Effort | Impact |
|---|---|---|---|
| 17 | Thermal & fan noise indicators | 1 tyg | Medium |
| 18 | Compatibility checklist (controller, anti-cheat, suspend) | 2 tyg | Medium |
| 19 | Device comparison tool | 2 tyg | High (SEO) |
| 20 | "What Should I Play?" discovery tool | 3 tyg | High (retention) |
| 21 | Contributor badges/levels | 1 tyg | Medium |
| 22 | Follow/watch games (notifications) | 1 tyg | Medium |
| 23 | Performance heatmap grid | 2 tyg | High (shareable) |
| 24 | Device "report card" pages | 2 tyg | High (SEO) |

#### FAZA 3: Miesiąc 3-6

| # | Feature | Effort | Impact |
|---|---|---|---|
| 25 | Visual comparison slider (screenshots) | 3 tyg | Medium |
| 26 | Performance trend tracker (FPS over time) | 2 tyg | Medium |
| 27 | Monthly testing challenges | 2 tyg | Medium |
| 28 | Public API (read-only) | 2 tyg | Medium (ecosystem) |
| 29 | CSV/JSON export | 3 dni | Low |
| 30 | FPS distribution charts | 1 tyg | Medium |
| 31 | Browser extension (Steam Store integration) | 3 tyg | High (growth) |
| 32 | AI pipeline (settings synthesis, SEO gen) | 2 tyg | High (scaling) |
| 33 | Supporter tiers (Patreon integration) | 1 tyg | Medium (revenue) |

#### FAZA 4: Miesiąc 6+

| # | Feature | Effort | Impact |
|---|---|---|---|
| 34 | Newsletter (po 5K+ subskrybentów) | 1 tyg | Medium |
| 35 | Decky Loader plugin | 4 tyg | High (defer) |
| 36 | Reddit/Discord bot | 2 tyg | Medium |
| 37 | News section (AI-assisted, multi-device) | 3 tyg | Medium (retention) |
| 38 | Hardware manufacturer outreach | — | High (revenue) |

---

### 13.22. KLUCZOWE WNIOSKI Z RESEARCHU

1. **HowLongToBeat to model** — sukces bo odpowiada na JEDNO pytanie idealnie. "Optimal Settings Finder" musi być równie jasny i prosty.

2. **Steam Library Import = silnik retencji** — RAWG i Backloggd dowodzą, że personal data tworzy stickiness. Gdy user widzi "your library" ocenioną, jest zaangażowany.

3. **Battery life = największa luka** — nikt nie robi battery life per-game per-device per-TDP dobrze. Trudne do zastąpienia przez AI Overviews jako interaktywny tool.

4. **ProtonDB's simplicity = gold standard** — tiered ratings (Platinum→Borked) są natychmiast zrozumiałe. TDP Profile Cards (Battery Saver/Balanced/Performance) powinny być równie czytelne.

5. **UserBenchmark = cautionary tale** — transparentność metodologii jest nie-negotiowalna. Dokumentuj i wyjaśniaj scoring.

6. **Backloggd potwierdza model solo-developera** — 350K+ userów, 1,300 patronów, 1 developer poszedł full-time w 2025. Ale wymaga social features tworzących network effects.

7. **40-60% adblock rate wśród gamerów** — Patreon/supporter model ważniejszy niż reklamy. NitroPay (Overwolf) ma adblock recovery ale to nie zastąpi supporter revenue.

8. **RAWG API jest martwe** — unmaintained, frequent downtime. Użyj IGDB jako secondary metadata source.

9. **Steam appdetails rate limit (200 req/5 min)** = binding constraint. Batch jobs overnight. ~20h na pełny catalog.

10. **AI features kosztują $5-30/mies** — negligible. Focus na: settings synthesis, SEO gen, Reddit extraction, staleness detection.
