# HANDHELDDB — MVP TASK LIST

Kompletna lista zadan od A do Z
~170 taskow | 10 faz | 17 obszarow
Wygenerowano: marzec 2026

---

## Jak korzystac z tej listy

Taski sa ponumerowane (np. 1.01, 2.03) i ulozone w kolejnosci wykonania. Kazdy task to jedno konkretne zadanie ktore mozesz zrobic w jednej sesji. Nie skacz miedzy fazami — koncz faze przed przejsciem do nastepnej.

- **KRYTYCZNE** = musi dzialac
- **WYSOKIE** = bardzo wazne
- **NORMALNE** = potrzebne
- **NISKIE** = nice to have dla MVP

Po kazdym ukonczonym tasku: commit z opisem co zrobiles. Male commity > duze commity.

---

## Pre-sprint 0: FUNDAMENT (schema cleanup)

**Status: COMPLETE (2026-03-11)**

- [x] 0.01: Add `recommended_profile` to Drizzle schema (consensusRatings)
- [x] 0.02: Complete TDP refactor: 3-bucket → single `recommended_profile`
- [x] 0.03: Update `cron-consensus.ts` to write `recommended_profile`
- [x] 0.04: Update GameDetailPanel + [device].astro to read `recommended_profile`
- [x] 0.05: Remove unused tables: settings_presets, game_versions, device_os_versions, comment_reactions
- [x] 0.06: Remove duplicate slugify, fix tests
- [x] 0.07: Build clean, 156/156 unit tests pass, all pages 200

---

## FAZA 1 — BAZA DANYCH I DANE SEED

**Status: COMPLETE (2026-03-11)**

- [x] 1A: Schema audit — all 3 tables match Drizzle, FKs/indexes verified, enums synced
- [x] 1.04: DB migration — added `recommended_profile`, dropped legacy 3-bucket columns
- [x] 1.07-1.09: RLS hardened — INSERT/UPDATE restricted to authenticated owners
- [x] 1.10: Backup saved (29MB pre-seed)
- [x] 1B: Seeded 2648 reports for 98 games x 6 devices (3-6 reports per pair)
- [x] 1C: Consensus calculated — 590 ratings, 0 failures, all with recommended_profile
- [x] 1D: API endpoints verified — consensus (+ profile/score), reports (+ sort), devices-list all 200

### 1A. Schemat bazy danych

Zanim cokolwiek zaczniesz budowac, upewnij sie ze fundamenty sa solidne.

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 1.01 | Audyt schematu performance_reports | Uruchom drizzle-kit studio. Sprawdz czy tabela ma wszystkie kolumny: fps_avg, fps_low, preset, resolution, fsr_enabled, fsr_mode, tdp_limit_watts, battery_life_hours, thermal, fan_noise, overall_rating, quality_tier, moderation_status, source. Zapisz brakujace. | KRYTYCZNE | 30min |
| 1.02 | Audyt schematu consensus_ratings | Sprawdz tabele: fps_avg, fps_low, recommended_preset, recommended_tdp, estimated_battery, overall_verdict, recommended_profile (jsonb), report_count, confidence_level, weighted_score. Unique constraint na (game_id, device_id). | KRYTYCZNE | 30min |
| 1.03 | Audyt schematu report_votes | Sprawdz: report_id (FK), user_id (FK), is_upvote (bool). Unique na (report_id, user_id). | KRYTYCZNE | 15min |
| 1.04 | Migracja brakujacych kolumn | Na podstawie audytu 1.01-1.03 napisz i uruchom migracje Drizzle. Testuj na lokalnej bazie przed produkcja. | KRYTYCZNE | 1-2h |
| 1.05 | Weryfikacja FK i indexow | Sprawdz ze game_id i device_id w performance_reports maja FK do games i devices. Index na (game_id, device_id) w consensus_ratings. | WYSOKIE | 30min |
| 1.06 | Weryfikacja enumow w Drizzle | Upewnij sie ze pgEnum dla preset, thermal, fan_noise, overall_rating, quality_tier, moderation_status sa zdefiniowane i zsynchronizowane z baza. | WYSOKIE | 30min |
| 1.07 | RLS policies na performance_reports | SELECT: wszyscy moga czytac approved. INSERT: wszyscy. UPDATE: tylko wlasciciel. DELETE: tylko admin. Testuj kazda policy. | WYSOKIE | 1h |
| 1.08 | RLS policies na consensus_ratings | SELECT: publiczny. INSERT/UPDATE: tylko service role (cron). DELETE: tylko service role. | WYSOKIE | 30min |
| 1.09 | RLS policies na report_votes | SELECT: publiczny. INSERT: authenticated. UPDATE: authenticated (tylko swoje). DELETE: authenticated (tylko swoje). | WYSOKIE | 30min |
| 1.10 | Backup bazy przed seedowaniem | pg_dump pelnej bazy do pliku z data. Przechowaj lokalnie. | NORMALNE | 15min |

### 1B. Seed: dane performance

Bez danych strony gier sa puste. Stworz realistyczne dane seedowe dla 100 gier na 6 urzadzeniach.

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 1.11 | Lista 100 gier do seed | JSON/TS z lista 100 popularnych gier handheld: Elden Ring, BG3, Cyberpunk, Hades, Stardew Valley, Hollow Knight, God of War, Spider-Man, Hogwarts Legacy, itp. Dla kazdej: steam_appid, nazwa, slug. | KRYTYCZNE | 1h |
| 1.12 | Sprawdz czy gry istnieja w tabeli games | Dla kazdej z 100 gier sprawdz po steam_appid lub slug. Zapisz ktore brakuja. | KRYTYCZNE | 30min |
| 1.13 | Import brakujacych gier | Uzyj cron-import-top-games.ts lub skrypt ktory pobiera brakujace ze Steam API i wstawia do games. | KRYTYCZNE | 2h |
| 1.14 | Seed: 5 raportow Elden Ring + Steam Deck | seed-reports.ts: 5 raportow z roznymi presetami (low/medium/high), roznymi FPS (25-55), roznym TDP (10-25W), roznym battery (1.5-3h). Realistyczne dane. | KRYTYCZNE | 1h |
| 1.15 | Testuj seed na jednej grze | Uruchom seed, sprawdz w bazie ze 5 wierszy jest w performance_reports z poprawnymi FK. Napraw bledy. | KRYTYCZNE | 30min |
| 1.16 | Rozszerz seed na 100 gier x Steam Deck | Dla kazdej gry 3-8 raportow. Gry demanding (Cyberpunk) = niski FPS. Gry lekkie (Stardew) = wysoki FPS. Rozne presety i TDP. | WYSOKIE | 2-3h |
| 1.17 | Seed raporty dla ROG Ally | Z1 Extreme = mocniejszy niz SD. FPS ~10-20% wyzszy niz SD dla tych samych ustawien. | WYSOKIE | 1-2h |
| 1.18 | Seed raporty dla ROG Ally X | Ten sam chip co Ally ale wieksza bateria (80 vs 40 Wh). FPS podobny, battery ~2x dluzszy. | NORMALNE | 1h |
| 1.19 | Seed raporty dla Legion Go | Z1 Extreme, 49.2 Wh. Podobne FPS do Ally, battery miedzy Ally i Ally X. | NORMALNE | 1h |
| 1.20 | Seed raporty dla Legion Go S | Z2 Go = slabszy chip. FPS ~20% nizszy niz Z1 Extreme. 55.5 Wh battery. | NORMALNE | 1h |
| 1.21 | Seed raporty dla MSI Claw 8 AI+ | Intel Ultra 7 258V. Inne charakterystyki niz AMD. 80 Wh battery. | NISKIE | 1h |
| 1.22 | Walidacja seeded data | Skrypt: kazda gra ma min 3 raporty na min 1 device. Brak null w wymaganych polach. FPS 5-200. Battery 0.5-10h. | WYSOKIE | 1h |

### 1C. Algorytm Consensus

Consensus to serce projektu — agreguje raporty w jedna ocene per gra+device.

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 1.23 | Przeczytaj i zrozum cron-consensus.ts | Przejdz caly plik. Zapisz: jakie query robi, jak liczy wagi, jak liczy median, jak buduje TDP profile. Zapisz watpliwosci. | KRYTYCZNE | 1h |
| 1.24 | Uruchom consensus dla jednej pary | Odpal cron-consensus.ts z filtrem na Elden Ring + Steam Deck. Sprawdz logi. Sprawdz wynik w consensus_ratings. | KRYTYCZNE | 30min |
| 1.25 | Debug consensus jesli nie dziala | Typowe: brak approved raportow, zle FK, brak weighted median, blad w query. Napraw i powtorz 1.24. | KRYTYCZNE | 1-3h |
| 1.26 | Weryfikacja wag quality_tier | verified=5.0, community=3.0, reported=1.0, ai=0.5, imported=0.3. Seeded raporty = community lub reported. | WYSOKIE | 30min |
| 1.27 | Weryfikacja recency decay | 90-day half-life. Raport sprzed 90 dni = 0.5x waga. Seeded raporty z roznymi datami. | WYSOKIE | 30min |
| 1.28 | Uruchom consensus batch (wszystkie pary) | Odpal cron-consensus.ts bez filtrow. ~100-600 par. Sprawdz czas i logi. | KRYTYCZNE | 30min |
| 1.29 | Walidacja wynikow consensus | Skrypt: kazda para game+device z raportami ma wiersz w consensus_ratings. Verdikty sensowne. FPS median w zakresie min-max raportow. | WYSOKIE | 1h |
| 1.30 | recommended_profile w consensus | Sprawdz ze recommended_profile (jsonb) jest wypelniony: tdpWatts, fpsTarget, fpsAvg, resolution, preset, fsrEnabled, estimatedBatteryHours, thermal, fanNoise, reportCount, confidence. | WYSOKIE | 30min |
| 1.31 | Confidence levels | low (<3 reports), medium (3-10), high (>10). Poprawnie przypisane. Wieksze gry = medium/high. | NORMALNE | 15min |

### 1D. API Endpoints (odczyt)

Endpointy czytajace dane z bazy dla frontendu.

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 1.32 | GET /api/consensus — endpoint istnieje | Sprawdz w src/pages/api/. Query params: gameId, deviceId (opcjonalne). | KRYTYCZNE | 30min |
| 1.33 | GET /api/consensus — zwraca dane | curl /api/consensus?gameId=X&deviceId=Y. JSON z fps_avg, verdict, recommended_preset, recommended_profile. | KRYTYCZNE | 1h |
| 1.34 | GET /api/consensus — bez filtra = wszystkie | /api/consensus bez params = wszystkie consensus ratings. | NORMALNE | 30min |
| 1.35 | GET /api/consensus — cache 2min | In-memory cache (Map z TTL). Klucz: gameId+deviceId. TTL: 2min. | NORMALNE | 30min |
| 1.36 | GET /api/reports — endpoint istnieje | Query params: gameId, deviceId, sort (newest/oldest/highest_rated), limit, offset. | KRYTYCZNE | 30min |
| 1.37 | GET /api/reports — zwraca raporty | /api/reports?gameId=X. Lista raportow z user info, vote counts, wszystkie pola performance. | KRYTYCZNE | 1h |
| 1.38 | GET /api/reports — sortowanie | sort=newest/oldest/highest_rated dziala. Default: newest. | NORMALNE | 30min |
| 1.39 | GET /api/reports — pagination | limit=20, offset=0 default. Zwraca tez total_count. | NORMALNE | 30min |
| 1.40 | GET /api/devices-list | Wszystkie active devices: id, name, slug, manufacturer, chip, battery_wh, screen_resolution. Cache 10min. | WYSOKIE | 30min |

---

## FAZA 2 — WYSWIETLANIE DANYCH

### 2. Strona gry (GameDetailPanel)

Najwazniejsza strona w serwisie. Tu user widzi odpowiedz na "czy ta gra dziala na moim handheldzie".

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 2.01 | GameDetailPanel — fetch consensus | Komponent fetchuje /api/consensus?gameId=X. Sprawdz useEffect/fetch. Debug network tab. | KRYTYCZNE | 1h |
| 2.02 | GameDetailPanel — device tabs | Tab bar z urzadzeniami. Default: Steam Deck. Klik taba zmienia dane. Fetch per device. | KRYTYCZNE | 1-2h |
| 2.03 | GameDetailPanel — verdict display | Duzy badge: Excellent/Good/Fair/Poor/Unplayable w kolorze (green/yellow/orange/red). Pod spodem FPS avg. | KRYTYCZNE | 1h |
| 2.04 | GameDetailPanel — FPS counter animation | Animowany licznik od 0 do wartosci. requestAnimationFrame. Kolor wg FPS range. | NORMALNE | 1h |
| 2.05 | GameDetailPanel — recommended settings | Grid: Preset, Resolution, FSR mode, TDP watts. Dane z consensus recommended_preset + recommended_profile. | KRYTYCZNE | 1h |
| 2.06 | GameDetailPanel — battery estimate | Ikona baterii + estimated_battery hours. Kolor: green >3h, yellow 2-3h, orange 1-2h, red <1h. | WYSOKIE | 30min |
| 2.07 | GameDetailPanel — thermal/fan info | thermal (cool/warm/hot) i fan_noise (silent/quiet/audible/loud) z ikonami. | NORMALNE | 30min |
| 2.08 | GameDetailPanel — confidence indicator | low/medium/high z ikona. Low: "Few reports". Medium: "Based on X reports". High: "Well tested". | NORMALNE | 30min |
| 2.09 | GameDetailPanel — community reports | Lista raportow z /api/reports?gameId=X. Kazdy: user, date, preset, FPS, TDP, rating, notes. Sort dropdown. | KRYTYCZNE | 2h |
| 2.10 | GameDetailPanel — raport expand/collapse | Klik rozwija pelne detale: wszystkie settings, battery, thermal, fan, custom settings, notatki. | NORMALNE | 1h |
| 2.11 | GameDetailPanel — empty state | Gra bez raportow: "No performance data yet. Be the first to submit a report!" + link /report/new?game=SLUG. | WYSOKIE | 30min |
| 2.12 | GameDetailPanel — empty state per device | Gra ma dane na SD ale nie na Ally: tab Ally = "No reports for this device yet" + CTA. | WYSOKIE | 30min |
| 2.13 | GameDetailPanel — loading state | Skeleton/spinner podczas fetch. Nie pokazuj pustego stanu podczas ladowania. | NORMALNE | 30min |
| 2.14 | GameDetailPanel — error state | API blad: "Failed to load performance data. Try refreshing." Nie crashuj strony. | NORMALNE | 30min |
| 2.15 | Game+Device page (/games/[slug]/[device]) | Szczegolowy breakdown per para. Wszystkie raporty, TDP profile. | NORMALNE | 2h |

---

## FAZA 3 — ZBIERANIE DANYCH

### 3. Formularz raportu (ReportForm)

User musi moc latwo zglosic jak gra chodzi na jego handheldzie.

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 3.01 | ReportForm — renderowanie 4 stepow | /report/new renderuje sie? Nawigacja next/back dziala? Step indicator widoczny? | KRYTYCZNE | 1h |
| 3.02 | ReportForm — step 1: game search | Input szuka przez /api/search. Dropdown z wynikami (art, nazwa, genres). gameId w state. | KRYTYCZNE | 1-2h |
| 3.03 | ReportForm — step 1: device select | Dropdown/cards z /api/devices-list. deviceId w state. Pokaz chip i battery. | KRYTYCZNE | 1h |
| 3.04 | ReportForm — step 1: walidacja | Nie przejsc do step 2 bez gry I urzadzenia. Komunikat bledu. | WYSOKIE | 30min |
| 3.05 | ReportForm — step 2: FPS fields | fps_avg: number (1-240). fps_low: number (1-240). fps_low <= fps_avg walidacja. | KRYTYCZNE | 30min |
| 3.06 | ReportForm — step 2: preset select | Dropdown: ultra_low, low, medium, high, ultra, custom. | KRYTYCZNE | 15min |
| 3.07 | ReportForm — step 2: resolution | Dropdown: 1280x800, 1920x1080, 1200x800, custom. Domyslna per device. | WYSOKIE | 30min |
| 3.08 | ReportForm — step 2: FSR toggle | Checkbox fsr_enabled. Jesli on: dropdown fsr_mode (quality/balanced/performance/ultra_performance). | NORMALNE | 30min |
| 3.09 | ReportForm — step 2: TDP | Number input tdp_limit_watts. Range per device (SD: 3-15W, Ally: 9-30W). | WYSOKIE | 30min |
| 3.10 | ReportForm — step 2: walidacja | FPS > 0, <= 240. Preset wybrany. Resolution wypelnione. TDP w zakresie. | WYSOKIE | 30min |
| 3.11 | ReportForm — step 3: overall rating | 5 opcji: excellent/good/fair/poor/unplayable. Cards z kolorami i opisami. | KRYTYCZNE | 30min |
| 3.12 | ReportForm — step 3: thermal | 3 opcje: cool/warm/hot. Cards z ikonami. | NORMALNE | 15min |
| 3.13 | ReportForm — step 3: fan noise | 4 opcje: silent/quiet/audible/loud. | NORMALNE | 15min |
| 3.14 | ReportForm — step 3: battery life | Number input battery_life_hours (0.5-10). Opcjonalne. | WYSOKIE | 15min |
| 3.15 | ReportForm — step 3: walidacja | overall_rating wymagane. Reszta opcjonalna. | NORMALNE | 15min |
| 3.16 | ReportForm — step 4: notes | Textarea max 2000 znakow. Opcjonalne. Placeholder z przykladami. | NORMALNE | 15min |
| 3.17 | ReportForm — step 4: game version | Text input opcjonalny. Np. "1.12", "patch 1.5". | NISKIE | 15min |
| 3.18 | ReportForm — step 4: email (anonymous) | Niezalogowany: pole email (wymagane). Zalogowany: ukryte, user_id z sesji. | WYSOKIE | 30min |
| 3.19 | ReportForm — step 4: summary | Przed submitem: podsumowanie gra/device/FPS/preset/rating. User moze wrocic i edytowac. | NORMALNE | 1h |
| 3.20 | POST /api/reports — endpoint | Stworz/napraw. JSON body ze wszystkimi polami. Walidacja server-side. | KRYTYCZNE | 1-2h |
| 3.21 | POST /api/reports — walidacja servera | gameId istnieje, deviceId istnieje, FPS w zakresie, preset z enum, required fields. 400 z opisem bledu. | KRYTYCZNE | 1h |
| 3.22 | POST /api/reports — zapis do bazy | INSERT do performance_reports. moderation_status='approved', quality_tier='reported', source='manual'. | KRYTYCZNE | 30min |
| 3.23 | POST /api/reports — user_id | Zalogowany: user_id z sesji. Nie: user_id=null, email z body. | WYSOKIE | 30min |
| 3.24 | POST /api/reports — response | 201 z { id, message }. Blad: 400/500 z { error }. | NORMALNE | 15min |
| 3.25 | ReportForm — submit handler | Submit -> POST /api/reports. Loading spinner. Disable button. | KRYTYCZNE | 1h |
| 3.26 | ReportForm — success feedback | 201: toast "Report submitted!" + redirect na strone gry po 2s. | WYSOKIE | 30min |
| 3.27 | ReportForm — error feedback | 400/500: toast z bledem. Formularz nie resetuje sie. Mozna poprawic. | WYSOKIE | 30min |
| 3.28 | ReportForm — duplicate detection | User submitowal raport dla tej gry+device? Warning. | NORMALNE | 1h |
| 3.29 | ReportForm — rate limiting | Max 5 raportow na IP na godzine. 429 Too Many Requests. | NORMALNE | 30min |
| 3.30 | E2E test: submit i wyswietlenie | Wypelnij -> submit -> strona gry -> nowy raport widoczny. Caly flow bez bledow. | KRYTYCZNE | 1h |

---

## FAZA 4 — KONTA UZYTKOWNIKOW

### 4. Autentykacja

Konta potrzebne do votowania, profili i powiazania raportow.

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 4.01 | Supabase Auth konfiguracja | Email auth + Google OAuth. Callback URL na handhelddb.com/auth/callback/google. | KRYTYCZNE | 30min |
| 4.02 | Tabela users zsynchronizowana | auth.users ma trigger tworzacy wiersz w public.users. Jesli nie: stworz trigger lub sync. | KRYTYCZNE | 1h |
| 4.03 | Strona /auth/register | Formularz: email, password (min 8), display_name. Submit -> POST /api/auth/register. | KRYTYCZNE | 1h |
| 4.04 | POST /api/auth/register | signUp(email, password). Stworz wiersz w public.users. 201 lub 400. | KRYTYCZNE | 1h |
| 4.05 | Register: walidacja | Email format. Password min 8. Display name 2-30 znakow. Email exists -> blad. | WYSOKIE | 30min |
| 4.06 | Register: success flow | Po rejestracji -> redirect /auth/login z "Account created. Please sign in." | NORMALNE | 15min |
| 4.07 | Strona /auth/login | Formularz: email, password. Link do /auth/register. | KRYTYCZNE | 1h |
| 4.08 | POST /api/auth/login | signInWithPassword. Cookie z session token. 200 lub 401. | KRYTYCZNE | 1h |
| 4.09 | Login: redirect | ?redirect=/profile -> idz tam. Brak -> /. | WYSOKIE | 30min |
| 4.10 | Auth middleware | Czytaj cookie. supabase.auth.getUser(token). Astro.locals.user = user lub null. | KRYTYCZNE | 1h |
| 4.11 | Header: stan zalogowania | User: avatar + display_name + dropdown (Profile, Logout). Brak: Login/Register. | KRYTYCZNE | 1h |
| 4.12 | Logout | POST endpoint: usun cookie. Redirect /. signOut(). | KRYTYCZNE | 30min |
| 4.13 | Protected route: /profile | !user -> redirect /auth/login?redirect=/profile. | WYSOKIE | 30min |
| 4.14 | Strona /profile — minimal | display_name, email, data rejestracji. Lista zlozonych raportow. | WYSOKIE | 1-2h |
| 4.15 | Google OAuth: przycisk | "Sign in with Google" na /auth/login. signInWithOAuth({ provider: 'google' }). | NORMALNE | 30min |
| 4.16 | Google OAuth: callback | /auth/callback/google -> token z URL -> cookie -> redirect. | NORMALNE | 1h |
| 4.17 | Google OAuth: sync user | Pierwszy OAuth: stworz public.users z danymi Google. Istnieje: update avatar. | NORMALNE | 1h |
| 4.18 | ReportForm: user_id z sesji | Zalogowany: user_id auto. Ukryj email. "Submitting as [name]". | WYSOKIE | 30min |
| 4.19 | Security headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy. | NORMALNE | 30min |
| 4.20 | E2E: register -> login -> submit report | Register -> login -> submit raport -> raport ma user_id -> widoczny na /profile. | KRYTYCZNE | 1h |

---

## FAZA 5 — WERYFIKACJA DANYCH

### 5. System glosowania

Glosy pozwalaja community weryfikowac jakosc raportow.

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 5.01 | VoteButtons — renderowanie | Przy raporcie: thumbs up/down, score. Kolory: green/red/gray. | KRYTYCZNE | 1h |
| 5.02 | POST /api/votes — endpoint | { reportId, isUpvote }. Auth required (401). Rate limit: 60/15min. | KRYTYCZNE | 1h |
| 5.03 | POST /api/votes — logika toggle | Nie glosowal: insert. Tak samo: usun (toggle). Inaczej: update. | KRYTYCZNE | 1h |
| 5.04 | POST /api/votes — update counts | Po glosie: update upvotes/downvotes w performance_reports. | WYSOKIE | 30min |
| 5.05 | VoteButtons — fetch stanu | Zalogowany user glosowal? Podswietl button. | WYSOKIE | 30min |
| 5.06 | VoteButtons — optimistic update | Klik -> zmien UI natychmiast -> API fail: cofnij. | NORMALNE | 1h |
| 5.07 | VoteButtons — niezalogowany | Klik -> redirect /auth/login lub modal "Sign in to vote". | WYSOKIE | 30min |
| 5.08 | Consensus: uwzglednij glosy | Waga raportu *= Wilson score: (upvotes+1)/(upvotes+downvotes+2). Sprawdz. | WYSOKIE | 1h |
| 5.09 | E2E: zaloguj -> zaglosuj -> score | Zaloguj -> strona gry -> vote up -> score +1 -> vote again -> score wraca. | KRYTYCZNE | 30min |

---

## FAZA 6 — STRONY PUBLICZNE

### 6. Homepage

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 6.01 | Hero search dziala | SearchBar fetchuje /api/search. Wyniki w dropdown. Klik -> strona gry. | KRYTYCZNE | 1h |
| 6.02 | Community Tested Games | 8-12 gier z najwiecej raportow. JOIN games + consensus_ratings ORDER BY report_count DESC. | KRYTYCZNE | 1-2h |
| 6.03 | Top Rated Catalog | Gry z najwyzszym verdict. excellent/good. Sort po weighted_score. | WYSOKIE | 1h |
| 6.04 | Device cards | 6 cards: nazwa, chip, battery, COUNT gier z consensus_ratings. | WYSOKIE | 1h |
| 6.05 | Statystyki | Prawdziwe COUNT games, devices, reports, consensus. | NORMALNE | 30min |
| 6.06 | CTA section | "Submit a Report" -> /report/new. "Browse All Games" -> /games. | NORMALNE | 15min |
| 6.07 | Loading/error states | Skeleton + error fallback. | NORMALNE | 30min |

### 7. Games Browser (/games)

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 7.01 | Search input | Text input -> /api/search. Debounce 200ms. Grid ponizej. | KRYTYCZNE | 1h |
| 7.02 | Genre filters | Chips: Action, RPG, Indie, Strategy... Multi-select. | WYSOKIE | 1h |
| 7.03 | Deck compatibility filter | Verified/Playable/Unsupported/Unknown. | NORMALNE | 30min |
| 7.04 | Sortowanie | Name (A-Z), Metacritic (high-low), Release date (new-old), Most reports. | WYSOKIE | 30min |
| 7.05 | Grid/list view toggle | Grid = karty. List = kompaktowa. localStorage zapamietuje. | NISKIE | 1h |
| 7.06 | Load more / pagination | 24 gier default. "Load More" dodaje 24. | WYSOKIE | 1h |
| 7.07 | GameCard performance badge | Badge z FPS + verdict dla Steam Deck. Dane z consensus. | WYSOKIE | 1h |
| 7.08 | Empty state | "No games found matching your filters." | NORMALNE | 15min |

### 8. Device pages

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 8.01 | /devices: lista | Active devices grouped by manufacturer. Card: nazwa, chip, GPU, RAM, battery, MSRP, game count. | WYSOKIE | 1-2h |
| 8.02 | /devices/[slug]: specs | Pelna tabela: chip, GPU, RAM, storage, screen, battery, TDP, weight, MSRP. | WYSOKIE | 1h |
| 8.03 | /devices/[slug]: performance heatmap | Grid gier z FPS. Kolory wg range. Sort po FPS/name/rating. | NORMALNE | 2h |
| 8.04 | /devices/[slug]: summary stats | Count: excellent/good/fair/poor. Procentowy breakdown. | NORMALNE | 30min |
| 8.05 | /devices/[slug]: empty heatmap | "No games tested yet on this device." | NORMALNE | 15min |

### 9. Compare tool

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 9.01 | /compare: entry point | 2-3 device picker sloty. "Compare" -> /compare/[slug1]/[slug2]. | WYSOKIE | 1h |
| 9.02 | /compare/[...slugs]: specs table | Side-by-side: Display, Performance, Storage, Battery, Physical, Price. Winner podswietlony. | WYSOKIE | 2h |
| 9.03 | Shared games performance | Gry z consensus na obu urzadzeniach: FPS obok siebie. Sort po roznicach. | NORMALNE | 2h |
| 9.04 | Battery estimator | Input TDP -> estimated battery per device (battery_wh / TDP). | NISKIE | 1h |
| 9.05 | Max 3 devices | Walidacja: max 3. Komunikat jesli probuje 4. | NORMALNE | 15min |

---

## FAZA 7 — WYSZUKIWARKA

### 10. Search system

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 10.01 | Meilisearch index istnieje | Index 'games' istnieje. Jesli nie: cron-reindex-meilisearch.ts. | KRYTYCZNE | 30min |
| 10.02 | Searchable attributes | name, genres, developers, tags. Sprawdz ustawienia. | WYSOKIE | 15min |
| 10.03 | Typo tolerance | "elden rign" -> Elden Ring. Sprawdz settings. | NORMALNE | 15min |
| 10.04 | Fallback Supabase ilike | Meilisearch down -> games WHERE name ILIKE '%query%'. | WYSOKIE | 1h |
| 10.05 | Ctrl+K shortcut | Ctrl+K / Cmd+K otwiera search. "/" tez. Esc zamyka. | NORMALNE | 30min |
| 10.06 | Reindex cron | Uruchom reczne. Nowe gry z seeda sa w indexie. | WYSOKIE | 30min |

---

## FAZA 8 — SEO I META

### 11. SEO i meta tagi

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 11.01 | Strony gier: title tag | "[Game] Performance on Handheld PCs \| HandheldDB". Dynamiczny. | WYSOKIE | 30min |
| 11.02 | Strony gier: meta description | "See how [Game] runs on [devices]. FPS data, optimal settings, battery life." | WYSOKIE | 30min |
| 11.03 | OG tags | og:title, og:description, og:image, og:type=website. | WYSOKIE | 30min |
| 11.04 | Twitter Card | summary_large_image. | NORMALNE | 15min |
| 11.05 | Schema.org JSON-LD | VideoGame schema: name, image, genre, aggregateRating. GameJsonLd komponent. | NORMALNE | 30min |
| 11.06 | Canonical URLs | Kazda strona: `<link rel="canonical">`. | NORMALNE | 15min |
| 11.07 | /sitemap.xml | Dynamiczny: homepage, /games, /devices, /compare, /games/[slug], /devices/[slug]. | WYSOKIE | 1h |
| 11.08 | /robots.txt | Allow: /. Disallow: /api/, /auth/, /admin/, /profile. Sitemap. | NORMALNE | 15min |
| 11.09 | OG image generation | /api/og/[slug]: obrazek z nazwa gry, FPS, verdict. | NISKIE | 2h |
| 11.10 | Strony devices: meta tags | Analogicznie do gier. | NORMALNE | 30min |
| 11.11 | /rss.xml | RSS feed. Waliduj z validator. | NISKIE | 1h |

---

## FAZA 9 — INFRASTRUKTURA

### 12. Deploy i infrastructure

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 12.01 | astro build: zero bledow | npx astro build. Napraw KAZDY blad i warning. | KRYTYCZNE | 1-3h |
| 12.02 | Env variables | Wszystkie env vars ustawione: SUPABASE_URL, keys, MEILISEARCH, STEAM_API_KEY. | KRYTYCZNE | 30min |
| 12.03 | Nginx config | upstream, proxy_pass, cache, gzip, SSL, redirects. curl -I https://handhelddb.com. | KRYTYCZNE | 30min |
| 12.04 | SSL aktualny | certbot certificates -> expiry. Auto-renewal cron. | WYSOKIE | 15min |
| 12.05 | systemd service | systemctl status handhelddb. Active, restart policy, logs. | KRYTYCZNE | 15min |
| 12.06 | Deploy procedure | build -> restart -> strona wstaje -> cache sie odswiezy. | KRYTYCZNE | 30min |
| 12.07 | Nginx cache: bypass cookies | Zalogowani omijaja cache. proxy_cache_bypass z cookie. | WYSOKIE | 30min |
| 12.08 | Static assets: immutable | /_astro/* Cache-Control: immutable, max-age=31536000. | NORMALNE | 15min |
| 12.09 | Gzip dziala | curl -H 'Accept-Encoding: gzip'. Content-Encoding: gzip. HTML, JS, CSS, JSON. | NORMALNE | 15min |
| 12.10 | Error pages: 404 i 500 | Ladne error pages, nie Nginx default. | NORMALNE | 1h |
| 12.11 | Cron: consensus co 12h | crontab: 0 */12 * * * cron-consensus.ts. | WYSOKIE | 30min |
| 12.12 | Cron: reindex Meilisearch daily | 0 3 * * * cron-reindex-meilisearch.ts. | NORMALNE | 15min |
| 12.13 | Health check monitoring | Co 5 min: curl handhelddb.com. Alert jesli fail. | NORMALNE | 1h |
| 12.14 | Backup: automated daily | Codziennie 4:00 pg_dump -> .sql.gz. Retencja 7 dni. | WYSOKIE | 30min |
| 12.15 | Log rotation | Logi Node.js i Nginx sie rotuja. Nie zapelnic dysku. | NORMALNE | 15min |

---

## FAZA 10 — POLISH I QA

### 13. Polish i UX

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 13.01 | Mobile test (375px) | KAZDA strona. Napraw: overflow, za male buttony, nieczytelny tekst, zlamany layout. | KRYTYCZNE | 2-3h |
| 13.02 | Tablet test (768px) | Gridy, sidebar, nawigacja. | NORMALNE | 1h |
| 13.03 | Dark mode spajnosc | Caly UI czytelny. Kontrasty, bordy, shadows, inputy. | WYSOKIE | 1-2h |
| 13.04 | Loading states globalne | Kazdy fetch ma loading state. Zero blank screens. | WYSOKIE | 1-2h |
| 13.05 | Nawigacja: linki dzialaja | Kazdy link w header, footer, kartach. Zero 404. | KRYTYCZNE | 1h |
| 13.06 | Keyboard support | Tab przez pola. Enter submit. Escape zamyka modals. | NORMALNE | 1h |
| 13.07 | prefers-reduced-motion | Animacje wylaczone kiedy user ma reduced motion. | NORMALNE | 30min |
| 13.08 | Favicon i manifest | favicon.ico, apple-touch-icon, site.webmanifest. | NORMALNE | 30min |
| 13.09 | Console: zero errors | Dev tools na kazdej stronie. Zero czerwonych bledow. | WYSOKIE | 1-2h |
| 13.10 | Lighthouse audit | Homepage + strona gry. Performance >80, SEO >90, Accessibility >80. | NORMALNE | 1-2h |
| 13.11 | Font loading | Space Grotesk, Inter, JetBrains Mono — preconnect/preload. Brak FOUT. | NORMALNE | 30min |
| 13.12 | Image lazy loading | loading="lazy" OPROCZ above-the-fold. | NORMALNE | 30min |

### 14. Testing i QA

| ID | Task | Szczegoly | Priorytet | Czas |
|----|------|-----------|-----------|------|
| 14.01 | Happy path: anonimowy | Homepage -> szukaj -> strona gry -> widzi dane -> submit (z email) -> widoczny. | KRYTYCZNE | 30min |
| 14.02 | Happy path: zalogowany | Register -> login -> szukaj -> submit -> vote -> profil -> logout. | KRYTYCZNE | 30min |
| 14.03 | Happy path: devices | /devices -> klik -> heatmap -> klik gre -> strona gry. | WYSOKIE | 15min |
| 14.04 | Happy path: compare | /compare -> 2 devices -> compare -> specs + shared games. | WYSOKIE | 15min |
| 14.05 | Edge: gra bez raportow | Empty state. Link do submit. | NORMALNE | 15min |
| 14.06 | Edge: device bez gier | Empty heatmap + CTA. | NORMALNE | 15min |
| 14.07 | Edge: zly URL | /games/nie-istnieje -> 404. /devices/fake -> 404. | NORMALNE | 15min |
| 14.08 | Edge: podwojny submit | 2x klik -> 1 raport (disable button). | NORMALNE | 15min |
| 14.09 | Security: XSS | `<script>alert(1)</script>` w notes, display_name. Sanitized. | WYSOKIE | 30min |
| 14.10 | Security: SQL injection | `'; DROP TABLE games;--` w search i formularzach. ORM parameteryzuje. | WYSOKIE | 15min |
| 14.11 | Security: CSRF | POST endpointy wymagaja valid session lub CSRF token. | NORMALNE | 30min |
| 14.12 | Security: rate limiting | 70 requestow /api/reports w minute. 60 ok, 10 -> 429. | NORMALNE | 15min |
| 14.13 | Cross-browser | Chrome, Firefox, Safari. Happy path w kazdej. | NORMALNE | 1-2h |
| 14.14 | Test na telefonie | handhelddb.com na telefonie. Touch targets min 44px. | WYSOKIE | 30min |
| 14.15 | Final smoke test | 2-3 osoby. Czy przejda sciezke bez pomocy? Feedback. | KRYTYCZNE | 1h |

---

## PODSUMOWANIE

| Faza | Obszar | Taskow | Priorytet |
|------|--------|--------|-----------|
| Pre-0 | Schema cleanup | 7 | **DONE** |
| 1 | Baza danych i seed | 40 | KRYTYCZNE |
| 2 | Wyswietlanie danych | 15 | KRYTYCZNE |
| 3 | Zbieranie danych | 30 | KRYTYCZNE |
| 4 | Konta uzytkownikow | 20 | KRYTYCZNE |
| 5 | Weryfikacja danych | 9 | WYSOKIE |
| 6 | Strony publiczne | 25 | WYSOKIE |
| 7 | Wyszukiwarka | 6 | WYSOKIE |
| 8 | SEO i meta | 11 | NORMALNE |
| 9 | Infrastruktura | 15 | WYSOKIE |
| 10 | Polish i QA | 27 | WYSOKIE |
| **Total** | | **~205** | |

---

## TRACKING

Format: zmien `| 1.01 |` na `| ~~1.01~~ |` po ukonczeniu.
Lub dodaj kolumne STATUS na koncu wiersza.
