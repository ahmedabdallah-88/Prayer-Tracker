# PROJECT-DOCS.md — Prayer Tracker PWA

> **Complete technical reference for AI assistants working on this project.**
> Current service worker version: **v221**. Last updated: **2026-03-27**.

---

## 1. PROJECT OVERVIEW

### What Is This?
**Prayer Tracker** (متتبع الصلاة) is a Progressive Web App for tracking Islamic daily prayers, sunnah prayers, fasting, azkar (remembrance), and qada (missed prayer makeup). It targets practicing Muslims who want to monitor and improve their worship consistency.

### Tech Stack
- **Language:** Vanilla JavaScript (ES5 compatible, no transpiler)
- **Frameworks:** None — pure HTML/CSS/JS
- **Architecture:** IIFE modules with `window.App.*` namespace
- **Data:** localStorage (no backend, no database)
- **Calendar:** Hijri (UmmAlqura algorithm via `Intl.DateTimeFormat`)
- **API:** Aladhan (prayer times), Nominatim (reverse geocode)
- **Hosting:** GitHub Pages (static)
- **PWA:** Service worker for offline support, installable

### Repositories
| Repo | URL | Purpose |
|------|-----|---------|
| prayer-tracker | `https://github.com/ahmedabdallah-88/Prayer-Tracker` | Primary |
| prayer-tracker-v2 | `https://github.com/ahmedabdallah-88/Prayer-Tracker-V2` | Mirror/staging |

**GitHub username:** `ahmedabdallah-88`

### Local Paths
| Context | prayer-tracker | prayer-tracker-v2 |
|---------|---------------|-------------------|
| Read/Edit tools | `C:\Users\Ahassan\.local\bin\prayer-tracker\` | `C:\Users\Ahassan\.local\bin\prayer-tracker-v2\` |
| Bash tool (WSL) | `/mnt/c/Users/Ahassan/.local/bin/prayer-tracker/` | `/mnt/c/Users/Ahassan/.local/bin/prayer-tracker-v2/` |

### Dual-Repo Workflow
1. Edit files in `prayer-tracker` first
2. Copy shared files (`css/`, `js/`) to `prayer-tracker-v2`:
   ```bash
   cp prayer-tracker/css/*.css prayer-tracker-v2/css/
   cp prayer-tracker/js/*.js prayer-tracker-v2/js/
   ```
3. Each repo has its own `index.html` and `service-worker.js` — bump versions independently
4. Commit and push both repos

---

## 2. FILE STRUCTURE

```
prayer-tracker/
├── index.html                 # Main HTML shell — all views, overlays, tab bar, settings
├── manifest.json              # PWA manifest — icons, theme, display: standalone, RTL
├── service-worker.js          # Offline cache, notification handling, background sync
│
├── css/
│   ├── main.css               # Core layout, design tokens, prayer grid, tabs, chips, stats
│   ├── themes.css             # 7 theme variable sets + dark mode component overrides
│   ├── dashboard.css          # Dashboard cards, chart containers, stat grids
│   └── splash.css             # Splash screen: stars, moon, verse animations (10.4s)
│
├── js/                        # Modules loaded in strict dependency order:
│   ├── config.js              # Constants: prayer defs, translations (T{}), month names
│   ├── storage.js             # localStorage facade: keys, load, save, stats queries
│   ├── hijri-calendar.js      # Hijri↔Gregorian conversion, month days, overrides
│   ├── ui-utils.js            # Toast, confirm dialog, swipe, haptics, month picker
│   ├── i18n.js                # Arabic/English: t(), getPrayerName(), direction
│   ├── themes.js              # setTheme(), loadTheme(), toggleThemeMenu()
│   ├── profiles.js            # Multi-profile CRUD, gender, profile switching
│   ├── female-features.js     # Period tracking, per-prayer exemptions
│   ├── fard-tracker.js        # ★ CORE: fard+sunnah rendering, tabs, chips, stats builder
│   ├── sunnah-tracker.js      # Thin wrapper → delegates to fard-tracker('sunnah')
│   ├── jamaah-tracker.js      # Congregation streak calculation
│   ├── weekly-view.js         # Weekly congregation percentage chart
│   ├── fasting-tracker.js     # Ramadan + voluntary + Shawwal 6-day tracker
│   ├── prayer-times.js        # Aladhan API, geolocation, countdown, getCurrentPrayerState()
│   ├── notifications.js       # 4 notif types + athan auto-play + sound + monitor
│   ├── azkar-tracker.js       # Morning/evening azkar: 2-tab layout + calendar
│   ├── svg-charts.js          # Pure SVG charts: orbital, streaks, mountain, bars, weekly
│   ├── info-tooltips.js       # 22 contextual help ℹ️ tooltips for reports
│   ├── qada-report.js         # Qada progress display (color blocks + per-prayer bars)
│   ├── qada-calculator.js     # 3-phase qada wizard (data entry → plan → confirm)
│   ├── qada-tracker.js        # Qada daily logging: tabs + calendar grid + counter
│   ├── qada-dashboard.js      # Qada dashboard: 5 report cards
│   ├── dashboard.js           # Main dashboard: stat gathering + chart rendering
│   ├── year-overview.js       # 12-month yearly cards view + month detail
│   ├── data-io.js             # Export/import JSON, Gregorian→Hijri migration
│   ├── onboarding.js          # 8-step spotlight tutorial
│   └── app.js                 # ★ ENTRY POINT: startup(), init(), switchTab(), SW reg
│
├── icons/
│   ├── icon-72x72.png ... icon-512x512.png    # Standard PWA icons
│   ├── maskable-192x192.png                    # Adaptive icon (Android)
│   └── maskable-512x512.png
│
└── audio/
    ├── athan-afasy.mp3        # Athan by Sheikh Mishari Alafasy
    └── athan-makkah.mp3       # Athan from Haram Makkah
```

---

## 3. ARCHITECTURE

### Module System
Every JS file is an IIFE attached to `window.App.*`:
```javascript
window.App.ModuleName = (function() {
    // Private state and helpers
    var _state = {};
    function _helper() {}
    // Public API
    function publicMethod() {}
    return { publicMethod: publicMethod };
})();
// Backward-compat for inline HTML onclick:
window.publicMethod = window.App.ModuleName.publicMethod;
```

### Module Load Order (index.html)
```
config → storage → hijri-calendar → ui-utils → i18n → themes → profiles →
female-features → fard-tracker → sunnah-tracker → jamaah-tracker →
weekly-view → fasting-tracker → prayer-times → notifications →
azkar-tracker → svg-charts → info-tooltips → qada-report →
qada-calculator → qada-tracker → qada-dashboard → dashboard →
year-overview → data-io → onboarding → app (MUST BE LAST)
```

### Initialization Flow
```
1. HTML loads, all JS files execute (register IIFEs)
2. app.js calls window.App.Main.startup()
   ├── DataIO.migrateGregorianToHijri()   ← one-time migration
   ├── DataIO.migrateExistingData()       ← schema upgrade
   ├── Themes.loadTheme()                 ← apply saved theme
   ├── I18n.applyLang()                   ← apply saved language
   └── If splash active: defer init until splash done (10.4s)
       Else: call init() immediately
3. init()
   ├── Check profiles → show profile screen if none
   ├── Load active profile → sync to Storage + Female modules
   ├── Set Hijri year/month from today
   ├── Storage.loadAllData('fard') + loadAllData('sunnah')
   ├── updateShellBar() → display date in header
   ├── setTimeout(0): renderTrackerMonth('fard')  ← initial view
   ├── setTimeout(1000): UI.checkPrayerReminders()
   ├── setTimeout(2000): Notifications.updateReminderBanner()
   └── setTimeout(11000): Onboarding.start() (if first use)
4. Service Worker registered, update listeners attached
5. Visibility change listeners for notification re-checking
```

### Profile System
- Profiles stored in `localStorage['salah_profiles']` as JSON array
- Each profile: `{ id: 'p_TIMESTAMP_RANDOM', name, age, gender }`
- Active profile: `localStorage['salah_active_profile']`
- All user data keys are prefixed with profile ID: `salah_tracker_p_123_fard_h1447_1`
- Switching profile triggers full data reload + re-render
- Gender affects: female exemption mode, period tracking, exempt badges

### Data Storage (localStorage)
All data is stored as JSON in localStorage with profile-prefixed keys:
```
salah_tracker_[profileId_]TYPE_hYEAR_MONTH   ← prayer/sunnah tracking
salah_cong_[profileId_]hYEAR_MONTH           ← congregation markers
salah_qada_[profileId_]hYEAR_MONTH           ← qada day markers
salah_qadalog_[profileId_]hYEAR_MONTH        ← qada daily counts
salah_exempt_[profileId_]hYEAR_MONTH         ← female exemptions
salah_azkar_[profileId_]hYEAR_MONTH          ← azkar data
salah_fasting_[profileId_]hYEAR              ← Ramadan (year-level)
salah_volfasting_[profileId_]hYEAR_MONTH     ← voluntary fasting
salah_periods_[profileId_]hYEAR              ← period history
salah_qada_plan_[profileId]                  ← qada calculator plan
```

### Translation System (i18n.js)
- Two languages: Arabic (`ar`) and English (`en`)
- All strings in `Config.T`: `{ key: { ar: '...', en: '...' } }`
- `t(key)` returns current language string
- `getPrayerName(id)` returns localized prayer name
- HTML elements with `[data-t]` attribute auto-translated
- Language change: flips `dir="rtl"` ↔ `dir="ltr"`, re-renders all views
- Saved in `localStorage['salah_lang']`

### Theme System (7 Themes)
Themes are CSS variable overrides applied via `[data-theme="name"]` on `<html>`:

| # | Name | Label | Primary | Accent | Background |
|---|------|-------|---------|--------|------------|
| 1 | `green` | Emerald (default) | `#2D6A4F` | `#D4A03C` gold | `#F5F3EF` cream |
| 2 | `navy` | Midnight & Silver | `#1B2A4A` | `#A8B4C4` silver | `#F0F2F5` |
| 3 | `purple` | Royal Purple | `#5B21B6` | `#D4A03C` gold | `#F5F3F7` |
| 4 | `feminine` | Elegant Rose | `#9D174D` | `#D4A03C` gold | `#FDF2F4` |
| 5 | `sky` | Ocean Blue | `#0C4A6E` | `#F59E0B` amber | `#F0F7FA` |
| 6 | `dark` | Dark & Gold | `#D4A03C` gold | `#D4A03C` | `#1A1A1E` dark |
| 7 | `olive` | Warm Olive | `#3D5A3E` | `#C8B56E` olive | `#F4F2EC` |

- `themes.css` defines all 7 theme variable sets (lines 1-157)
- `themes.css` also has 100+ dark-specific component overrides (lines 159-542)
- `themes.js` handles: `setTheme()`, `loadTheme()`, `toggleThemeMenu()`
- Saved in `localStorage['salah_tracker_theme']`

### Service Worker
- **Version pattern:** `CACHE_NAME = 'salah-tracker-vNNN'`
- **All assets versioned:** `?v=NNN` query params on CSS/JS (31 references each in SW + index.html)
- **Strategy:** Network-first with cache fallback for app assets
- **API calls:** Network-only (aladhan, nominatim) — no caching
- **Offline fallback:** Inline HTML page with retry button
- **Update flow:** SW detects new version → `SKIP_WAITING` message → reload
- **Background:** Listens for `periodicsync` (prayer-check) and `SCHEDULE_NOTIFICATION` messages
- **Notification click:** Focuses existing window or opens new one

**Version bump procedure:**
1. Find-replace `vNNN` → `vNNN+1` in `service-worker.js`
2. Find-replace `v=NNN` → `v=NNN+1` in `index.html`
3. Copy shared files to v2 repo, bump v2's own files

---

## 4. FEATURES

### Fard Prayer Tracking
- **5 prayers:** Fajr, Dhuhr, Asr, Maghrib, Isha
- **UI:** 5 prayer tabs with sliding pill indicator + single calendar grid
- **Day click cycle (4 states):** Empty → Prayed alone (green) → Congregation (gold) → Qada (red) → Empty
- **Active tab:** 38×38 icon with prayer sky-time gradient, white filled icon, 13px/800 name
- **Inactive tab:** 28×28 transparent, grey outline icon, 11px/500 muted name
- **Tab default:** Auto-selects based on current prayer time via `getCurrentPrayerState()`
- **Stats row:** Progress ring + jamaah mosque icon + days count (glass card)
- **Batch operations:** Mark/unmark all days for a prayer
- **Female mode:** Toggle exempt days per-prayer

### Sunnah Prayer Tracking
- **8 prayers:** Tahajjud, Sunnah Fajr, Duha, Sunnah Dhuhr, Sunnah Asr, Sunnah Maghrib, Sunnah Isha, Witr
- **UI:** Chips/pills layout (flex-wrap, 2 rows) — NOT tabs (too cramped for 8)
- **Active chip:** Prayer's own sky-time gradient background, white text + filled icon, colored shadow
- **Inactive chip:** Neutral `rgba(0,0,0,0.04)` background, grey outline icon, secondary text
- **Selected prayer full name** displayed centered below chips
- **Day click cycle (3 states):** Empty → Prayed → Qada → Empty
- **Stats row:** Progress ring + days count (no jamaah section)

### Azkar Tracking
- **2 categories:** Morning (أذكار الصباح) and Evening (أذكار المساء)
- **UI:** 2-tab layout (same style as fard tabs) + calendar grid
- **Day toggle:** Tap to mark complete for the day
- **Stats row:** Progress ring + days count

### Fasting Tracking
**Three sub-views:**

1. **Voluntary Fasting** — Monthly calendar grid
   - Tap days to mark as fasted
   - Sunnah fast badges show: Monday/Thursday, White Days (13-15), Arafah (9 Dhul-Hijjah), Ashura (9-10 Muharram)
   - Shawwal banner: 6-day challenge with progress bar, hadith, completion celebration

2. **Ramadan** — 30-day grid for month 9
   - Three states: Fasted / Exempt (female) / Missed
   - Exempt mode links to female features

3. **Dashboard** — Year-level fasting statistics

### Prayer Times
- **API:** Aladhan — fetches based on GPS coordinates
- **Geolocation:** Browser API, cached 7 days in localStorage
- **Reverse geocode:** Nominatim → city name + country code
- **Auto-detect method:** By country (MWL, ISNA, Egyptian, Umm Al-Qura, etc.)
- **Display:** 5 prayer time cards in header bar
- **Countdown:** Breathe-animated timer to next prayer
- **`getCurrentPrayerState()`:** Returns `{ active: 'dhuhr', next: {...}, prayers: [], nowMin }`

### Dashboard & Statistics
**5+ SVG charts** rendered by `svg-charts.js`:
1. **Orbital progress** — Outer ring: year completion %, inner: congregation %
2. **Streak flame bars** — Current + best streaks per prayer
3. **Mountain chart** — Monthly trend line (solid for prayer, dashed for congregation)
4. **Prayer dual bars** — Per-prayer completion + congregation side-by-side
5. **Weekly rhythm** — Congregation % by weekday (Sat–Fri)
6. **Qada report** — Proportional color blocks + per-prayer progress bars

**22 contextual ℹ️ tooltips** (info-tooltips.js) explain each report in AR/EN.

### Qada Calculator (3 Phases)
- **Phase 1 — Data Entry:** Puberty date + regular prayer start date → missed day count
- **Phase 2 — Plan Generation:** Daily qada goal, spread across calendar
- **Phase 3 — Confirmation:** Review totals, daily target, estimated completion date
- **Tracking:** Calendar grid per prayer, tap to increment count, long-press to decrement
- **Dashboard:** 5 report cards (monthly progress, prayer breakdown, daily goal, forecast)

### Notifications (4 Types + Athan)
1. **Before-athan:** X minutes before prayer time (configurable per prayer)
2. **After-athan:** X minutes after prayer time — reminder to log
3. **Fasting:** At Fajr time — Ramadan, Shawwal, Monday/Thursday, White Days, Arafah, Ashura
4. **Daily insight:** After Isha — auto-generated spiritual insight from prayer stats
5. **Athan auto-play:** Plays athan audio at prayer time (configurable per prayer)

**Athan sound system:**
- 2 muezzins: Afasy (`audio/athan-afasy.mp3`), Makkah (`audio/athan-makkah.mp3`)
- Volume slider (0-100)
- Per-prayer enable/disable checkboxes
- Preview button
- Stop pill during playback
- Plays once per prayer per day (tracked in localStorage)

**Notification sounds:** Web Audio API — 3-tone ascending (before) / descending (after)

### Splash Screen
10.4-second animated sequence:
1. Stars + sparkles + full moon appear
2. Moon transforms to crescent with glow
3. Prayer circles + verse container fade in
4. Checkmarks fill one-by-one, verse letters reveal letter-by-letter
5. App name fades in
6. Everything hides, verse zooms to center, dark overlay
7. Splash fades out over 2 seconds
8. Splash removed from DOM, app reveals

### Onboarding Tutorial (8 Steps)
| Step | Target | What it explains |
|------|--------|------------------|
| 1 | Shell bar | Date, theme, language, profile buttons |
| 2 | Tab bar | 4 main sections |
| 3 | Sub-tabs | Tracker / Yearly / Dashboard |
| 4 | Month nav | Arrow buttons + month name for picker |
| 5 | Prayer times | Live times + countdown |
| 6 | Prayer grid | Tap cycle: alone → congregation → qada |
| 7 | Month picker | Calendar picker for any month/year |
| 8 | Settings | Profile, notifications, export/import |

### Multi-Profile System
- Create unlimited profiles with name, age, gender
- Profile ID: `p_TIMESTAMP_RANDOM`
- Each profile's data fully isolated (prefixed keys)
- Switch profiles → full reload
- Delete profile → confirm dialog → purge all profile keys

### Female Exemption Mode
- Toggle per-section (fard/sunnah)
- Mark individual days as exempt
- Per-prayer granularity (exempt Fajr but not Dhuhr on same day)
- Exempt days excluded from completion stats
- Period history auto-detected from consecutive exempt days
- Period dashboard shows history + patterns

### Export / Import
- **Export:** JSON file with all profile data + theme + Hijri overrides
- **Import:** Merge into existing profile or create new one
- **File name:** `[ProfileName]_[YYYY-MM-DD]_[HH-mm-ss].json`
- **Uses:** Web Share API (if available) or anchor-click download fallback

### Hijri Calendar Engine
- **Algorithm:** UmmAlqura via `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`
- **Conversion:** `gregorianToHijri()`, `hijriToGregorian()` (binary search, cached)
- **Month days:** 29 or 30 (auto-detected, user-overridable)
- **Manual override:** User can set Gregorian start date for any Hijri month
- **Dual display:** Each day cell shows Hijri day + small Gregorian day number

### Bilingual (Arabic / English)
- Default: Arabic (RTL)
- Toggle: `toggleLang()` flips direction + re-renders
- All strings via `Config.T` dictionary
- HTML `[data-t]` attributes auto-translated
- Month names, prayer names, tooltips all localized

---

## 5. CURRENT UI/UX DECISIONS

### Calendar Grid
- **Layout:** 7 days/row CSS grid
- **Day cells:** 44×44px circles
- **Today:** Primary-colored ring + background + dot indicator
- **Future days:** opacity 0.3
- **Badges:** 16×16 corner badges (congregation, qada, sunnah type)
- **Dual day number:** Hijri large + Gregorian small below

### Fard Section — Prayer Tabs
- **Design:** Option C — 5 tabs in rounded container with sliding pill
- **Container:** `rgba(0,0,0,0.06)`, borderRadius 16, padding 4
- **Active tab:** White pill background with `0 2px 10px` shadow, 38×38 gradient icon, 13px/800 name
- **Inactive tab:** Transparent, 28×28 icon, 11px/500 muted name
- **Transition:** 0.3s ease, tap scales icon to 0.9 for 100ms

### Sunnah Section — Chips Layout
- **Design:** Option 6 — Flex-wrap chips (2 rows for 8 prayers)
- **Active chip:** Per-prayer sky-time gradient background, white text/icon, colored shadow
- **Inactive chip:** `rgba(0,0,0,0.04)` background, grey icon, secondary text
- **Selected name:** Full prayer name centered below chips

### Azkar Section — 2 Tabs
- Morning / Evening tabs with same sliding pill as fard

### Stats Row — Option D
- Glass card: `rgba(255,255,255,0.55)`, backdrop-filter blur(12px), borderRadius 20
- **Fard:** Progress ring (52×52 SVG) + jamaah (mosque icon 38×38 + count) + days (calendar icon 36×36 + count)
- **Sunnah/Azkar:** Ring + days only (no jamaah)
- **Qada:** Ring (completion %) + today's count / daily target
- **No text labels** — icons are self-explanatory
- Sections separated by 1px vertical dividers

### Splash Screen
- Stars + full moon → crescent + verse letter-by-letter reveal + prayer circle checkmarks → zoom + fade

### Prayer Sky-Time Gradients (Hardcoded — NOT CSS variables)
```
Fajr:    linear-gradient(135deg, #E8B4B8, #C48A90)  — Dawn pink
Dhuhr:   linear-gradient(135deg, #F0C75E, #D4A030)  — Noon gold
Asr:     linear-gradient(135deg, #E8A849, #C07828)  — Afternoon amber
Maghrib: linear-gradient(135deg, #C47A5A, #9E5238)  — Sunset rust
Isha:    linear-gradient(135deg, #5B6B8A, #3A4A68)  — Night slate
```
Sunnah prayers share their fard-time gradient. Witr: `#7C6DAF → #5A4B8A`. Tahajjud: `#2e4482 → #1e3a8a`.

---

## 6. RECENT CHANGES (Last Sessions)

### Qada Calculator — All 3 Phases (v200+)
- Phase 1: Data entry wizard with Hijri date math
- Phase 2: Daily qada plan generation
- Phase 3: Calendar grid tracking with increment/decrement

### Calendar Redesign — Prayer Tabs (v210+)
- Replaced 5 stacked calendar grids with tab-based single calendar
- Applied to: Fard (5 tabs), Sunnah (8 tabs → later changed to chips), Azkar (2 tabs), Qada (5 tabs)
- Smart default tab based on current prayer time

### Sunnah Chips Layout (v216-v218)
- Replaced cramped 8-tab bar with flex-wrap chips
- Active chip uses per-prayer gradient (not var(--primary))
- Witr gradient updated to `#7C6DAF → #5A4B8A`

### Stats Row — Option D (v220-v221)
- Replaced small stat pills with rich glass card
- SVG progress ring + jamaah section + days section
- Shared `buildStatsRow()` helper used by all 4 sections
- Removed text labels (جماعة, الأيام) — icons sufficient

### Fard Tab Redesign (v219)
- Active: 38×38 icon, 13px/800 name, gradient + shadow
- Inactive: 28×28 icon, 11px/500 name, transparent
- Tap animation: icon scales to 0.9 for 100ms
- Container: borderRadius 16, padding 4

### Service Worker Scroll Freeze Fix (v200+)
- Fixed body scroll lock caused by stale service worker state
- Network-first strategy prevents stale cache issues

### Splash Screen Updates
- Stars + sparkles + full moon → crescent transition
- Verse letter-by-letter reveal animation
- Prayer circle sequential checkmark fill
- 10.4-second total duration with staged timings

---

## 7. PENDING / PLANNED ITEMS

### Near-Term
- [ ] Month header + countdown merge — remove prayer times bar, move to popup/compact
- [ ] Fasting notifications debugging — some sunnah fast types not triggering
- [ ] Daily insight notification debugging — may not fire consistently after Isha
- [ ] Athan auto-play testing — verify plays at exact prayer time, volume works
- [ ] Dark mode fixes — some components may not have full dark overrides

### Medium-Term
- [ ] Capacitor mobile app conversion (native Android/iOS wrapper)
- [ ] Performance optimization for large data sets (many months of history)
- [ ] Accessible tap targets (WCAG compliance)

---

## 8. DESIGN SYSTEM

### Color Palette (Per Theme)

**Green (default):**
```css
--primary: #2D6A4F    --primary-mid: #40916C    --primary-light: #52B788
--accent: #D4A03C     --accent-light: #E8B84A
--danger: #C1574E     --danger-light: #D4645B
--bg-main: #F5F3EF    --card-bg: rgba(255,255,255,0.55)
--text-primary: #2B2D42  --text-secondary: #5A5D6E  --text-muted: #8D99AE
```

**Navy:**
```css
--primary: #1B2A4A    --primary-mid: #2C3E6B    --primary-light: #4A6FA5
--accent: #A8B4C4     --bg-main: #F0F2F5
--text-primary: #1B2A4A  --text-muted: #7A8599
```

**Purple:**
```css
--primary: #5B21B6    --primary-mid: #7C3AED    --primary-light: #A78BFA
--accent: #D4A03C     --bg-main: #F5F3F7
--text-primary: #2D1B69  --text-muted: #8B7FAE
```

**Feminine (Rose):**
```css
--primary: #9D174D    --primary-mid: #BE185D    --primary-light: #EC4899
--accent: #D4A03C     --bg-main: #FDF2F4
--text-primary: #4A1D34  --text-muted: #A3728B
```

**Sky (Ocean Blue):**
```css
--primary: #0C4A6E    --primary-mid: #0369A1    --primary-light: #0EA5E9
--accent: #F59E0B     --bg-main: #F0F7FA
--text-primary: #0C2D48  --text-muted: #6B8FA3
```

**Dark & Gold:**
```css
--primary: #D4A03C    --primary-mid: #E8B84A    --primary-light: #F0D68A
--accent: #D4A03C     --danger: #EF4444
--bg-main: #1A1A1E    --card-bg: rgba(40,40,44,0.8)
--text-primary: #E8E6E1  --text-muted: #8A8A8E  --border: rgba(255,255,255,0.06)
```

**Olive:**
```css
--primary: #3D5A3E    --primary-mid: #5A7D5B    --primary-light: #7A9E7B
--accent: #C8B56E     --danger: #A0522D
--bg-main: #F4F2EC    --text-primary: #2E3A2F  --text-muted: #7A8A7B
```

### Fonts
- **Arabic body:** Noto Kufi Arabic (400, 500, 600, 700, 800)
- **Latin/numbers:** Rubik (400, 500, 600, 700, 800)
- **Quran verse:** Amiri (400, 700)
- **Icons:** Google Material Symbols Rounded (variable: opsz 20-48, wght 100-700, FILL 0-1)

### Icon Guidelines
- **Always** use Material Symbols Rounded — never emojis
- Icon in tab/chip: `font-variation-settings: 'FILL' 1, 'wght' 500` when active
- Icon inactive: `'FILL' 0, 'wght' 400`
- Color: white on gradient backgrounds, `#8D99AE` when inactive

### Prayer Sky-Time Gradients
These are hardcoded in `fard-tracker.js` as `SKY_GRADIENTS` and `SKY_SHADOWS` objects. They do **NOT** use CSS variables and do **NOT** change with theme.

```javascript
// Fard prayers
'fajr':    'linear-gradient(135deg, #E8B4B8, #C48A90)'   // shadow: rgba(196,138,144,0.35)
'dhuhr':   'linear-gradient(135deg, #F0C75E, #D4A030)'   // shadow: rgba(212,160,48,0.35)
'asr':     'linear-gradient(135deg, #E8A849, #C07828)'   // shadow: rgba(192,120,40,0.35)
'maghrib': 'linear-gradient(135deg, #C47A5A, #9E5238)'   // shadow: rgba(158,82,56,0.35)
'isha':    'linear-gradient(135deg, #5B6B8A, #3A4A68)'   // shadow: rgba(58,74,104,0.35)

// Sunnah prayers (same gradient as their fard-time equivalent, except:)
'tahajjud': 'linear-gradient(135deg, #2e4482, #1e3a8a)'
'duha':     'linear-gradient(135deg, #fbbf24, #f59e0b)'
'witr':     'linear-gradient(135deg, #7C6DAF, #5A4B8A)'
```

### Glassmorphism Card Style
```css
background: rgba(255,255,255,0.55);    /* var(--card-bg) */
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border-radius: 20px;                    /* var(--card-radius) */
border: 1px solid rgba(0,0,0,0.04);    /* var(--card-border) */
box-shadow: 0 2px 12px rgba(0,0,0,0.04); /* var(--card-shadow) */
```

---

## 9. DATA STORAGE SCHEMA

### All localStorage Keys

#### Profile & Settings
```
salah_profiles                        → [{ id, name, age, gender }, ...]
salah_active_profile                  → "p_1698765432123_a7k9x"
salah_lang                            → "ar" | "en"
salah_tracker_theme                   → "green" | "navy" | "purple" | "feminine" | "sky" | "dark" | "olive"
salah_onboarding_done                 → "true"
salah_migration_v1_done               → "true"
```

#### Prayer Tracking
```
salah_tracker_[PID_]fard_hYYYY_MM    → { "fajr": { "1": true, "5": true }, "dhuhr": { "3": true }, ... }
salah_tracker_[PID_]sunnah_hYYYY_MM  → { "tahajjud": { "1": true }, "witr": { "2": true }, ... }
salah_cong_[PID_]hYYYY_MM           → { "fajr": { "1": true }, "dhuhr": { "5": true }, ... }
salah_qada_[PID_]hYYYY_MM           → { "fajr": { "2": true }, ... }
```

#### Azkar
```
salah_azkar_[PID_]hYYYY_MM          → { "morning": { "1": true, "3": true }, "evening": { "1": true } }
```

#### Fasting
```
salah_fasting_[PID_]hYYYY           → { "1": "fasted", "2": "exempt", "3": "missed" }
salah_volfasting_[PID_]hYYYY_MM     → { "1": true, "13": true, "14": true, "15": true }
```

#### Qada
```
salah_qada_plan_[PID]               → { pubertyDate, regularDate, totalDays, dailyTarget, ... }
salah_qadalog_[PID_]hYYYY_MM       → { "1": { "fajr": 2, "dhuhr": 1 }, "5": { "asr": 3 } }
```

#### Female Features
```
salah_exempt_[PID_]hYYYY_MM         → { "5": { "fajr": true, "dhuhr": true, ... }, "6": { ... } }
salah_periods_[PID_]hYYYY           → [{ month, start, end, duration }, ...]
```

#### Hijri Calendar
```
salah_hijri_overrides                → { "1447_9": "2026-02-28" }  (custom month start dates)
salah_hijri_days_YYYY_MM            → "29" | "30"  (explicit month length override)
```

#### Prayer Times & Location
```
salah_prayer_times                   → { date, timings: { Fajr, Dhuhr, ... }, location, method }
salah_user_location                  → { lat, lng, timestamp }  (cached 7 days)
salah_city_name                      → "Riyadh"
```

#### Notifications
```
salah_notif_before_enabled           → "true" | "false"
salah_notif_before_minutes           → "10"
salah_notif_before_prayers           → '["fajr","dhuhr","asr","maghrib","isha"]'
salah_notif_after_enabled            → "true" | "false"
salah_notif_after_minutes            → "15"
salah_notif_after_prayers            → '["fajr","dhuhr","asr","maghrib","isha"]'
salah_fasting_notif                  → "true" | "false"
salah_insight_enabled                → "true" | "false"
salah_notif_reminders                → "true" | "false"  (in-app reminder banner)
```

#### Athan Sound
```
salah_athan_sound_enabled            → "true" | "false"
salah_athan_muezzin                  → "afasy" | "makkah"
salah_athan_volume                   → "80"  (0-100)
salah_athan_prayers                  → '["fajr","dhuhr","asr","maghrib","isha"]'
salah_athan_played_[PRAYER]_[DATE]   → "true"  (one-shot per prayer per day)
```

#### Notification Tracking (Ephemeral)
```
salah_fasting_notif_sent_YYYY-MM-DD  → "true"
salah_insight_sent_YYYY-MM-DD        → "true"
_pending_import                      → JSON (temporary staging for import)
```

**Note:** `[PID_]` = profile ID prefix like `p_1698765432123_a7k9x_`. Empty string if legacy (pre-profile) data.

---

## 10. KNOWN ISSUES & BUGS

### Service Worker Caching
- **History:** v200-era had scroll freeze bug caused by stale cached JS — body scroll lock wasn't cleared
- **Fix:** Switched to network-first strategy; old caches purged on activate
- **Current:** Stable. Users may need hard refresh (Settings → Check for Updates) if stuck on old version

### Fasting Notifications
- Some sunnah fast types (Ashura, White Days) may not trigger notifications consistently
- **Root cause:** Timing window check may miss if app is backgrounded
- **Status:** Needs debugging

### Daily Insight Notifications
- May not fire reliably after Isha time
- **Root cause:** Monitor interval (5 min) may miss the window, or tab not active
- **Status:** Needs debugging

### Athan Auto-Play
- Works when app is in foreground
- May not play when device is locked or app is backgrounded (browser limitation)
- Volume control may not affect playback on some iOS devices
- **Status:** Needs cross-device testing

### Dark Mode
- Most components have dark overrides (100+ rules in themes.css)
- Some dynamically-generated HTML (info tooltips, some modals) may not have full dark coverage
- **Status:** Ongoing — fix as discovered

### Hijri Calendar Edge Cases
- End-of-month boundary (day 29 vs 30) depends on Intl API accuracy
- User override system exists for when auto-detection is wrong
- Some legacy data migration from Gregorian keys may miss edge cases

### iOS-Specific
- Service Worker support limited in iOS Safari
- Notification permission requires PWA installed to home screen + standalone mode
- Haptic feedback (`navigator.vibrate`) not supported — silently fails

### RTL Layout
- Pill tab positioning uses manual RTL offset calculation (not CSS logical properties)
- If container width changes (orientation change), pill may misalign until re-render

---

## APPENDIX: Key Function Quick Reference

### Most-Used Functions Across Modules

| Function | Module | Purpose |
|----------|--------|---------|
| `renderTrackerMonth(type)` | fard-tracker | Renders tabs/chips + stats + calendar for fard or sunnah |
| `handleDayClick(type, pid, day, ...)` | fard-tracker | 4-state day cycle with data save |
| `buildStatsRow(opts)` | fard-tracker | Shared stats row HTML builder (used by all sections) |
| `buildProgressRing(pct)` | fard-tracker | SVG ring HTML helper |
| `getCurrentPrayerState()` | prayer-times | Returns active/next prayer info |
| `t(key)` | i18n | Get translated string |
| `getPrayerName(id)` | i18n | Get localized prayer name |
| `switchTab(tab)` | app | Switch main section |
| `showToast(msg, type)` | ui-utils | Show toast notification |
| `haptic(pattern)` | ui-utils | Trigger haptic feedback |
| `gregorianToHijri(date)` | hijri-calendar | Convert Date → Hijri |
| `getTodayHijri()` | hijri-calendar | Today's Hijri date |
| `getHijriDaysInMonth(y, m)` | hijri-calendar | 29 or 30 |
| `fetchPrayerTimes(force)` | prayer-times | Fetch from Aladhan API |
| `setTheme(name)` | themes | Apply color theme |
| `exportData()` | data-io | Export user data as JSON |
| `importData(file)` | data-io | Import from JSON file |

### Global Backward-Compat Functions (for inline HTML onclick)
```
switchTab, switchSection, switchView, renderTrackerMonth, updateTrackerView,
updateTrackerStats, updateDashboard, updateYearlyView, renderMonthDetail,
handleDayClick, batchMarkPrayer, toggleDay, resetMonth, resetTrackerMonth,
changeTrackerMonth, changeQadaMonth, showMonthYearPicker, t, toggleLang,
getPrayerName, getHijriMonthName, getMonthName, getMonthNames,
showProfileScreen, selectProfile, editProfile, deleteProfile, saveProfile,
showToast, showConfirm, haptic, hapticFeedback, fetchPrayerTimes,
renderPrayerTimes, getCurrentPrayerState, refreshPrayerTimes,
toggleExemptMode, toggleExemptPrayer, updateExemptInfo,
toggleMonthDays, showHijriOverrideDialog, switchFastingView,
updateFastingView, updateVoluntaryFasting, resetFasting,
openProfileSettings, closeProfileSettings, applyUpdate, checkForUpdates,
toggleThemeMenu, setTheme
```
