# Prayer Tracker PWA - Complete Technical Reference

> **Purpose:** This document gives a new AI assistant full context to understand and modify this codebase.
> Current version: v221 (service worker). Last updated: 2026-03-27.

---

## Overview

Prayer Tracker is a Progressive Web App for Islamic prayer tracking. It uses **vanilla JavaScript (ES5)**, no frameworks, with a modular IIFE namespace architecture (`window.App.*`). All data lives in **localStorage** with profile-prefixed keys. The UI is **RTL Arabic-first** with full English support.

**Key capabilities:**
- Track 5 fard (obligatory) prayers daily with solo/congregation/qada states
- Track 8 sunnah (voluntary) prayers
- Azkar (morning/evening remembrance) tracking
- Qada (missed prayer makeup) calculator and tracker
- Ramadan + voluntary fasting tracker with sunnah day badges
- Female features: period tracking, prayer exemptions
- Prayer times via Aladhan API + geolocation
- SVG dashboard charts (orbital, streaks, mountain, bars)
- Yearly overview with 12 month cards
- Multi-profile support
- Offline PWA with service worker caching
- Light/dark themes, Arabic/English i18n
- Browser notifications for prayer reminders

---

## Two Repositories

The app exists in two mirrored repos sharing identical CSS/JS:

| Repo | Path | Hosted at |
|------|------|-----------|
| prayer-tracker | `C:\Users\Ahassan\.local\bin\prayer-tracker\` | GitHub Pages |
| prayer-tracker-v2 | `C:\Users\Ahassan\.local\bin\prayer-tracker-v2\` | GitHub Pages |

**Workflow:** Edit `prayer-tracker` first, then copy shared files (`css/`, `js/`) to `prayer-tracker-v2`. Each repo has its own `index.html` and `service-worker.js` with independent version numbers (but usually kept in sync).

**Important paths:**
- Read/Edit tool: use Windows paths (`C:\Users\Ahassan\.local\bin\prayer-tracker\...`)
- Bash tool: use WSL paths (`/mnt/c/Users/Ahassan/.local/bin/prayer-tracker/...`)

---

## File Structure

```
prayer-tracker/
├── index.html                 # Main HTML shell (all views, overlays, tab bar)
├── manifest.json              # PWA manifest (icons, theme, display: standalone)
├── service-worker.js          # Offline cache, notifications, background sync
├── css/
│   ├── main.css               # Core layout, prayer grid, tabs, chips, stats row
│   ├── themes.css             # Light/dark theme CSS variable overrides
│   ├── dashboard.css          # Dashboard cards, chart containers
│   └── splash.css             # Splash screen animations
├── js/                        # Modules loaded in dependency order:
│   ├── config.js              # Prayer definitions, constants, translations
│   ├── storage.js             # localStorage facade, data access layer
│   ├── hijri-calendar.js      # Hijri date conversion (UmmAlqura via Intl API)
│   ├── ui-utils.js            # Toast, confirm, swipe, haptics, month picker
│   ├── i18n.js                # Arabic/English internationalization
│   ├── themes.js              # Theme switching (light/dark)
│   ├── profiles.js            # Multi-profile management
│   ├── female-features.js     # Period tracking, prayer exemptions
│   ├── fard-tracker.js        # Fard prayer UI + shared stats builder
│   ├── sunnah-tracker.js      # Thin wrapper → delegates to fard-tracker
│   ├── jamaah-tracker.js      # Congregation streak calculations
│   ├── weekly-view.js         # Weekly congregation chart
│   ├── fasting-tracker.js     # Ramadan + voluntary fasting
│   ├── prayer-times.js        # Aladhan API, geolocation, countdown
│   ├── notifications.js       # Browser notification scheduling
│   ├── azkar-tracker.js       # Morning/evening azkar tracking
│   ├── svg-charts.js          # Pure SVG charting engine
│   ├── info-tooltips.js       # 22 contextual help tooltips
│   ├── qada-report.js         # Qada progress display
│   ├── qada-calculator.js     # Qada plan calculations
│   ├── qada-tracker.js        # Qada tab UI with calendar grid
│   ├── qada-dashboard.js      # Qada dashboard view
│   ├── dashboard.js           # Main dashboard stat gathering + chart rendering
│   ├── year-overview.js       # Yearly 12-month cards view
│   ├── data-io.js             # Import/export, Gregorian→Hijri migration
│   ├── onboarding.js          # 8-step interactive tutorial
│   └── app.js                 # Main init, startup, tab switching, SW registration
├── icons/                     # PWA icons (72→512px + maskable)
└── audio/                     # Athan audio files (afasy, makkah)
```

---

## Module Architecture

Every JS file is an IIFE that attaches to `window.App.*`:

```javascript
window.App.ModuleName = (function() {
    var _privateState = {};
    function _privateHelper() { ... }
    function publicMethod() { ... }
    return { publicMethod: publicMethod };
})();

// Backward-compat globals for inline HTML onclick handlers:
window.publicMethod = window.App.ModuleName.publicMethod;
```

### Module Dependency Order (as loaded in index.html)

```
config → storage → hijri-calendar → ui-utils → i18n → themes → profiles →
female-features → fard-tracker → sunnah-tracker → jamaah-tracker →
weekly-view → fasting-tracker → prayer-times → notifications →
azkar-tracker → svg-charts → info-tooltips → qada-report →
qada-calculator → qada-tracker → qada-dashboard → dashboard →
year-overview → data-io → onboarding → app
```

---

## Core Modules — Detailed Reference

### config.js (`window.App.Config`)

Constants only, no functions.

```javascript
Config = {
    fardPrayers: [
        { id: 'fajr', name: 'الفجر', icon: 'wb_twilight', color: '#D4A0A7' },
        { id: 'dhuhr', name: 'الظهر', icon: 'wb_sunny', color: '#E8B84A' },
        { id: 'asr', name: 'العصر', icon: 'partly_cloudy_day', color: '#D4943A' },
        { id: 'maghrib', name: 'المغرب', icon: 'wb_twilight', color: '#B0664A' },
        { id: 'isha', name: 'العشاء', icon: 'dark_mode', color: '#4A5A7A' }
    ],
    sunnahPrayers: [
        { id: 'tahajjud', icon: 'dark_mode' },
        { id: 'sunnah-fajr', icon: 'wb_twilight' },
        { id: 'duha', icon: 'wb_sunny' },
        { id: 'sunnah-dhuhr', icon: 'wb_sunny' },
        { id: 'sunnah-asr', icon: 'partly_cloudy_day' },
        { id: 'sunnah-maghrib', icon: 'wb_twilight' },
        { id: 'sunnah-isha', icon: 'dark_mode' },
        { id: 'witr', icon: 'auto_awesome' }
    ],
    T: { key: { ar: '...', en: '...' } },  // All UI translations
    hijriMonthNamesAr: ['محرم', 'صفر', 'ربيع الأول', ...],
    hijriMonthNamesEn: ['Muharram', 'Safar', ...],
    PRAYER_REMINDER_TIMES: { 'fajr': { end: 7 }, ... },
    PRAYER_API_MAP: { 'fajr': 'Fajr', 'dhuhr': 'Dhuhr', ... }
}
```

### storage.js (`window.App.Storage`)

Data access layer wrapping localStorage.

**Key functions:**
| Function | Purpose |
|----------|---------|
| `getStorageKey(type, month, year)` | Build key: `salah_tracker_[profileId_]TYPE_hYEAR_MONTH` |
| `getDataObject(type)` | Returns cached fardData or sunnahData |
| `getPrayersArray(type)` | Returns Config.fardPrayers or sunnahPrayers |
| `loadAllData(type, year)` | Load 12 months from localStorage |
| `saveMonthData(type, month)` | Persist month to localStorage |
| `getMonthStats(type, month, year)` | `{ completed, total, percentage }` |
| `getYearStats(type, year)` | Full year stats |
| `getCongregationData(year, month)` | `{ prayerId: { day: true } }` |
| `saveCongregationData(year, month, data)` | Persist congregation markers |
| `getFastingData(year)` | Ramadan data |
| `getVolFastingData(year, month)` | Voluntary fasting data |
| `getAzkarKey(year, month)` | Azkar storage key |
| `isFutureDate(day, month, year)` | Check if Hijri date is in future |

### hijri-calendar.js (`window.App.Hijri`)

Hijri↔Gregorian conversion using `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`.

**Key functions:**
| Function | Purpose |
|----------|---------|
| `gregorianToHijri(gDate)` | `{ year, month, day }` from JS Date |
| `getTodayHijri()` | Today's Hijri date |
| `getHijriDaysInMonth(hYear, hMonth)` | 29 or 30 |
| `hijriToGregorian(hYear, hMonth, hDay)` | JS Date from Hijri |
| `hijriToGregorianDay1(hYear, hMonth)` | First day of Hijri month (cached) |
| `formatHijriMonthHeader(hYear, hMonth)` | "رمضان 1447 (فبراير-مارس 2026)" |
| `createDualDayNum(day, hYear, hMonth)` | DOM fragment: Hijri day + small Gregorian |
| `getCurrentHijriYear/Month()` | Current navigation state |
| `setCurrentHijriYear/Month(val)` | Set navigation state |
| `toggleMonthDays()` | Switch between 29↔30 days |
| `showHijriOverrideDialog()` | Manual month start date picker |

### fard-tracker.js (`window.App.Tracker`)

**The largest and most important module.** Handles fard AND sunnah prayer rendering via `renderTrackerMonth(type)` where type is `'fard'` or `'sunnah'`.

**State:**
```javascript
var _activeTab = { fard: null, sunnah: null };  // Active prayer tab per section
```

**Sky-time gradient colors (hardcoded, NOT CSS variables):**
```javascript
var SKY_GRADIENTS = {
    'fajr': 'linear-gradient(135deg, #E8B4B8, #C48A90)',
    'dhuhr': 'linear-gradient(135deg, #F0C75E, #D4A030)',
    'asr': 'linear-gradient(135deg, #E8A849, #C07828)',
    'maghrib': 'linear-gradient(135deg, #C47A5A, #9E5238)',
    'isha': 'linear-gradient(135deg, #5B6B8A, #3A4A68)',
    // + sunnah prayer gradients...
};
var SKY_SHADOWS = { /* matching rgba shadows at 35% */ };
```

**Key functions:**
| Function | Purpose |
|----------|---------|
| `renderTrackerMonth(type)` | Main renderer for fard/sunnah. Builds tabs (fard) or chips (sunnah), stats row, calendar grid |
| `handleDayClick(type, prayerId, day, ...)` | 4-state cycle: empty→alone→congregation→qada→empty (fard), 3-state for sunnah |
| `batchMarkPrayer(type, prayerId, ...)` | Mark/unmark all days for a prayer |
| `switchSection(section)` | Switch sub-tab: tracker/yearly/dashboard |
| `switchView(view)` | Alternative view switching |
| `changeTrackerMonth(type, delta)` | Navigate months +/-1 |
| `updateTrackerStats(type)` | Update stat counters |
| `buildStatsRow(opts)` | **Shared helper** — builds rich stats row HTML (progress ring + jamaah + days) |
| `buildProgressRing(pct)` | SVG progress ring helper |

**Day click cycle (fard):**
```
Empty → Prayed alone → Prayed in congregation → Qada → Empty
(click)  (click)        (click)                  (click)
```

**Day click cycle (sunnah):**
```
Empty → Prayed → Qada → Empty
```

**Fard UI: Tab-based selection** (5 tabs with sliding pill)
- Active tab: 38×38 icon with prayer gradient, white icon, 13px bold name
- Inactive tab: 28×28 transparent, grey icon, 11px muted name
- Pill slides with 0.3s ease transition

**Sunnah UI: Chips/pills layout** (8 prayers, flex-wrap)
- Active chip: prayer gradient background, white text/icon, colored shadow
- Inactive chip: neutral background, grey icon
- Selected prayer full name shown centered below chips

**Stats row** (shared by all sections via `buildStatsRow`):
- Glass card with backdrop-filter blur
- Progress ring: SVG circle, color-coded (green ≥80%, gold ≥50%, red <50%)
- Jamaah section (fard only): mosque icon + count
- Days section: calendar icon + completed/total

### sunnah-tracker.js (`window.App.Sunnah`)

Thin 38-line wrapper:
```javascript
window.App.Sunnah = {
    updateSunnahView: function() { window.App.Tracker.renderTrackerMonth('sunnah'); },
    // ... delegates everything to fard-tracker
};
```

### azkar-tracker.js (`window.App.Azkar`)

Tracks morning (أذكار الصباح) and evening (أذكار المساء) remembrance.

**State:** `_activeAzkarTab` (morning/evening)

**Key functions:**
| Function | Purpose |
|----------|---------|
| `updateAzkarView()` | Render tab bar + stats + calendar grid |
| `toggleAzkarDay(catId, day)` | Toggle day completion |

Uses `App.Tracker.buildStatsRow()` for stats display (ring + days, no jamaah).

### qada-tracker.js (`window.App.Qada`)

Tracks makeup prayers for missed obligations.

**State:** `_activeQadaTab` (fajr/dhuhr/asr/maghrib/isha)

**Key functions:**
| Function | Purpose |
|----------|---------|
| `render()` | Full render: summary banner + tabs + stats + calendar |
| `getCount(logData, day, prayerId)` | Get qada count for a specific day/prayer |
| `setCount(logData, day, prayerId, count)` | Set qada count |

Stats row: ring shows per-prayer completion %, days shows today's count vs daily target.

**Qada day boxes:** Show count number (0, 1, 2, ...) instead of checkmarks. Tap increments, long-press decrements.

### prayer-times.js (`window.App.PrayerTimes`)

Fetches prayer times from Aladhan API based on geolocation.

**API:** `https://api.aladhan.com/v1/timings/{DD-MM-YYYY}?latitude=LAT&longitude=LNG&method=METHOD`

**Key functions:**
| Function | Purpose |
|----------|---------|
| `fetchPrayerTimes(forceRefresh)` | API call with geolocation |
| `getCurrentPrayerState()` | `{ active: 'dhuhr', next: {...}, prayers: [...], nowMin }` |
| `renderPrayerTimes()` | Update prayer grid in header |
| `renderNextPrayerCountdown()` | Timer with breathe animation |
| `getUserLocation()` | Geolocation with 7-day cache |
| `getPrayerMethod(countryCode)` | Auto-detect calc method by country |

### notifications.js (`window.App.Notifications`)

Browser notifications for prayer reminders.

**Types:**
1. Before prayer: X minutes before athan time
2. After prayer: X minutes after athan (reminder to log)
3. Smart banner: shows unmarked prayers in-app

### fasting-tracker.js (`window.App.Fasting`)

**Three views:** Voluntary fasting, Ramadan, Dashboard

**Ramadan states:** `'fasted'` | `'exempt'` | `'missed'`

**Sunnah day badges:** Dhul Hijjah (1-9), Ashura (9-10 Muharram), White Days (13-15 of any month), Monday/Thursday

### female-features.js (`window.App.Female`)

Period tracking and prayer exemption management.

**Key functions:**
| Function | Purpose |
|----------|---------|
| `toggleExemptMode(type)` | Enable/disable exempt marking mode |
| `toggleExemptPrayer(prayerId, day)` | Mark specific prayer as exempt |
| `getExemptCountForPrayer(year, month, prayerId)` | Count exempt days |
| `savePeriodHistory()` | Auto-detect consecutive exempt days as periods |

### dashboard.js (`window.App.Dashboard`)

Gathers stats and renders 5+ SVG charts via `svg-charts.js`:
1. Orbital progress ring (completion + congregation)
2. Streak flame bars (current + best per prayer)
3. Mountain chart (monthly trend line)
4. Prayer dual bars (per-prayer completion + congregation)
5. Weekly rhythm (congregation % by weekday)

### svg-charts.js (`window.App.SVGCharts`)

Pure SVG charting engine, no dependencies.

**Charts:** `orbitalProgress()`, `streakFlameBars()`, `mountainChart()`, `prayerDualBars()`, `weeklyRhythm()`, `barChart()`

### data-io.js (`window.App.DataIO`)

Import/export and data migration (Gregorian→Hijri keys).

### onboarding.js (`window.App.Onboarding`)

8-step spotlight tutorial for first-time users.

### profiles.js (`window.App.Profiles`)

Multi-profile management with gender-aware features.

**Profile object:** `{ id: 'p_TIMESTAMP_RANDOM', name: 'أحمد', age: 25, gender: 'male' }`

---

## Data Models (localStorage)

### Prayer Tracking Data
```javascript
// Key pattern: salah_tracker_[profileId_]TYPE_hYEAR_MONTH
// Example: salah_tracker_p_123_fard_h1447_9
{
    "fajr":    { "1": true, "2": true, "5": true },
    "dhuhr":   { "1": true, "3": true },
    "asr":     { "2": true },
    "maghrib": { "1": true, "2": true, "3": true },
    "isha":    { "1": true }
}
// true = prayed. Day numbers are strings. Missing = not prayed.
```

### Congregation Data
```javascript
// Key: salah_cong_[profileId_]hYEAR_MONTH
{
    "fajr":  { "1": true, "5": true },
    "dhuhr": { "3": true }
}
// true = prayed in congregation that day
```

### Qada (Missed Prayer) Data
```javascript
// Key: salah_qada_[profileId_]hYEAR_MONTH
{
    "fajr":  { "2": true },
    "isha":  { "4": true }
}
// true = qada status for that day
```

### Qada Log (Daily Makeup Count)
```javascript
// Key: salah_qadalog_[profileId_]hYEAR_MONTH
{
    "1": { "fajr": 2, "dhuhr": 1 },   // Day 1: made up 2 fajr, 1 dhuhr
    "5": { "asr": 3 }                  // Day 5: made up 3 asr
}
```

### Fasting Data
```javascript
// Ramadan: salah_fasting_[profileId_]hYEAR
{ "1": "fasted", "2": "exempt", "3": "missed", "4": "fasted" }

// Voluntary: salah_volfasting_[profileId_]hYEAR_MONTH
{ "1": true, "13": true, "14": true, "15": true }
```

### Azkar Data
```javascript
// Key: salah_azkar_[profileId_]hYEAR_MONTH
{
    "morning": { "1": true, "2": true },
    "evening": { "1": true, "5": true }
}
```

### Female Exemption Data
```javascript
// Key: salah_exempt_[profileId_]hYEAR_MONTH
{
    "5": { "fajr": true, "dhuhr": true, "asr": true, "maghrib": true, "isha": true },
    "6": { "fajr": true, "dhuhr": true, "asr": true, "maghrib": true, "isha": true }
}
// Days 5-6: all prayers exempt
```

### Profile Data
```javascript
// salah_profiles
[
    { "id": "p_1698765432123_a7k9x", "name": "أحمد", "age": 25, "gender": "male" },
    { "id": "p_1698765432456_k2m8n", "name": "فاطمة", "age": 22, "gender": "female" }
]

// salah_active_profile
"p_1698765432123_a7k9x"
```

### All localStorage Key Patterns
```
salah_profiles                                     # All profiles array
salah_active_profile                               # Active profile ID
salah_lang                                         # 'ar' or 'en'
salah_tracker_theme                                # 'light' or 'dark'
salah_tracker_[profileId_]fard_h{YEAR}_{MONTH}     # Fard prayer data
salah_tracker_[profileId_]sunnah_h{YEAR}_{MONTH}   # Sunnah prayer data
salah_cong_[profileId_]h{YEAR}_{MONTH}             # Congregation markers
salah_qada_[profileId_]h{YEAR}_{MONTH}             # Qada markers
salah_qadalog_[profileId_]h{YEAR}_{MONTH}          # Qada daily counts
salah_exempt_[profileId_]h{YEAR}_{MONTH}           # Female exemptions
salah_azkar_[profileId_]h{YEAR}_{MONTH}            # Azkar data
salah_fasting_[profileId_]h{YEAR}                  # Ramadan fasting
salah_volfasting_[profileId_]h{YEAR}_{MONTH}       # Voluntary fasting
salah_hijri_overrides                              # Manual month start dates
salah_hijri_days_{YEAR}_{MONTH}                    # Explicit 29/30 override
salah_prayer_times                                 # Cached prayer times
salah_user_location                                # Cached geolocation (7d)
salah_city_name                                    # Reverse geocode result
salah_periods_[profileId_]h{YEAR}                  # Period history
salah_notif_before_enabled                         # Notification settings
salah_notif_after_enabled
salah_notif_before_mins
salah_notif_after_mins
salah_notif_sound_on
salah_notif_reminders
salah_onboarding_done                              # Tutorial completed flag
salah_qada_plan                                    # Qada target settings
```

---

## HTML Structure (index.html)

```html
<body>
    <!-- Shell Bar (header) -->
    <div id="shellBar">
        <div id="shellDateText">...</div>
        <button id="langBtn">...</button>
        <button id="shellProfileBtn">...</button>
    </div>

    <!-- Prayer Times Bar -->
    <div id="prayerTimesBar">
        <div id="prayerTimesGrid">...</div>
        <div id="nextPrayerCountdown">...</div>
    </div>

    <!-- Main Tab Bar (5 tabs) -->
    <div id="tabBar">
        <div id="tabFard" onclick="switchTab('fard')">الفرائض</div>
        <div id="tabSunnah" onclick="switchTab('sunnah')">السنن</div>
        <div id="tabFasting" onclick="switchTab('fasting')">الصيام</div>
        <div id="tabAzkar" onclick="switchTab('azkar')">الأذكار</div>
        <div id="tabQada" onclick="switchTab('qada')">القضاء</div>
    </div>

    <!-- Main Content -->
    <div id="mainContent">
        <!-- Each section has sub-tabs: Tracker / Yearly / Dashboard -->
        <section id="fardSection">
            <div id="fardTrackerView">
                <div id="fardTrackerPrayersContainer"><!-- tabs + stats + grid --></div>
            </div>
            <div id="fardYearlyView">...</div>
            <div id="fardDashboardView">...</div>
        </section>
        <section id="sunnahSection">
            <div id="sunnahTrackerPrayersContainer"><!-- chips + stats + grid --></div>
        </section>
        <section id="fastingSection">...</section>
        <section id="azkarSection">
            <div id="azkarPrayersContainer"><!-- tabs + stats + grid --></div>
        </section>
        <section id="qadaSection">
            <div id="qadaTrackerContainer"><!-- banner + tabs + stats + grid --></div>
        </section>
    </div>

    <!-- Overlays -->
    <div id="profileOverlay">...</div>
    <div id="profileSettingsOverlay">...</div>
    <div id="splashScreen">...</div>
    <div id="toastContainer">...</div>
</body>
```

---

## CSS Architecture

### Design Tokens (`:root` in main.css)
```css
--primary: #2D6A4F;          --primary-rgb: 45, 106, 79;
--primary-mid: #40916C;      --primary-light: #52B788;
--accent: #D4A03C;           --accent-rgb: 212, 160, 60;
--danger: #C1574E;           --danger-rgb: 193, 87, 78;
--fajr: #D4A0A7;  --dhuhr: #E8B84A;  --asr: #D4943A;
--maghrib: #B0664A;  --isha: #4A5A7A;
--text-primary: #2B2D42;     --text-secondary: #5A5D6E;
--text-muted: #8D99AE;       --bg-main: #F5F3EF;
--card-bg: rgba(255,255,255,0.55);
--card-radius: 20px;
```

### Dark Theme (`[data-theme="dark"]` in themes.css)
Overrides all variables for dark backgrounds, lighter text, darker cards.

### Key CSS Classes
| Class | Purpose |
|-------|---------|
| `.prayer-tabs-container` | Fard tab bar container (rounded, flex) |
| `.prayer-tabs-pill` | Sliding white background behind active tab |
| `.prayer-tab` | Individual tab button |
| `.prayer-tab-icon` | Icon square inside tab |
| `.prayer-tab-name` | Prayer name below icon |
| `.prayer-chips-container` | Sunnah chips wrap container |
| `.prayer-chip` | Individual sunnah chip button |
| `.prayer-chip-name` | Name inside chip |
| `.prayer-selected-name` | Selected sunnah prayer name below chips |
| `.prayer-tab-stats` | Rich stats row card (glass morphism) |
| `.stats-section` | Column within stats row |
| `.stats-ring-wrap` | SVG progress ring container |
| `.stats-ring-pct` | Percentage text centered in ring |
| `.stats-icon-wrap` | Icon container (jamaah/days) |
| `.stats-value` | Large number in stats |
| `.stats-divider` | Vertical line between stats sections |
| `.prayer-tab-grid` | Calendar grid wrapper |
| `.days-grid` | CSS grid for day boxes |
| `.day-box` | Individual day cell |
| `.controls` | Month navigation bar |

---

## Service Worker & Versioning

**Version bump procedure** (when deploying changes):
1. Increment version number in `service-worker.js` (line 1-2: comment + `CACHE_NAME`)
2. Increment all `?v=NNN` query params in `service-worker.js` ASSETS array (31 entries)
3. Increment all `?v=NNN` in `index.html` `<link>` and `<script>` tags (31 entries)
4. Use find-and-replace: `v=221` → `v=222` (or `v221` → `v222` for service-worker)

**Caching strategy:** Network-first with cache fallback. API calls (aladhan, nominatim) are network-only.

---

## Initialization Sequence

```
1. HTML loads → CSS + JS files load in dependency order
2. app.js calls window.App.Main.startup()
   ├── Run DataIO migrations
   ├── Load theme + language
   ├── If splash screen: defer init until splash animation finishes
   └── Otherwise: call init() immediately
3. init()
   ├── Check profiles → show profile screen if none exist
   ├── Load active profile
   ├── Set Hijri year/month
   ├── Load all monthly data from localStorage
   ├── Update shell bar
   ├── Render current view (deferred 0ms)
   └── Start monitors (reminders 1s, banner 2s, onboarding 11s)
4. Service Worker registration + update monitoring
5. Visibility change listeners for notification re-checking
```

---

## Cross-Module Data Flow

```
User taps day box
  → handleDayClick(type, prayerId, day) in fard-tracker.js
    → Read current state from Storage.getDataObject()
    → Cycle state: empty → prayed → congregation → qada → empty
    → Write to data object + Storage.saveMonthData()
    → If congregation: Storage.saveCongregationData()
    → Re-render: renderTrackerMonth(type)
    → Update stats: updateTrackerStats()
    → Haptic feedback: App.UI.haptic('soft')
    → If female: updateExemptInfo()
```

---

## Backward-Compatible Global Functions

These are exposed on `window.*` for inline HTML `onclick` handlers:

```javascript
// Navigation
switchTab, switchSection, switchView

// Rendering
renderTrackerMonth, updateTrackerView, updateTrackerStats, updateDashboard,
updateYearlyView, renderMonthDetail

// Data
handleDayClick, batchMarkPrayer, toggleDay, resetMonth, resetTrackerMonth

// Month navigation
changeTrackerMonth, changeQadaMonth, showMonthYearPicker

// I18n
t, toggleLang, getPrayerName, getHijriMonthName, getMonthName

// Profiles
showProfileScreen, selectProfile, editProfile, deleteProfile, saveProfile

// UI
showToast, showConfirm, haptic, hapticFeedback

// Prayer times
fetchPrayerTimes, renderPrayerTimes, getCurrentPrayerState, refreshPrayerTimes

// Female
toggleExemptMode, toggleExemptPrayer, updateExemptInfo

// Hijri
toggleMonthDays, showHijriOverrideDialog

// Fasting
switchFastingView, updateFastingView, updateVoluntaryFasting, resetFasting

// App
openProfileSettings, closeProfileSettings, applyUpdate, checkForUpdates
```

---

## Common Modification Patterns

### Adding a new prayer tab/chip
1. Add prayer definition to `Config.fardPrayers` or `Config.sunnahPrayers` in config.js
2. Add gradient to `SKY_GRADIENTS` and shadow to `SKY_SHADOWS` in fard-tracker.js
3. Add translation key to `Config.T` in config.js

### Changing tab/chip styling
- CSS: `main.css` → `.prayer-tab*` or `.prayer-chip*` classes
- Dark mode: `themes.css` → `[data-theme="dark"] .prayer-tab*`
- Inline styles (gradients, shadows): `fard-tracker.js` → `renderTrackerMonth()`

### Changing stats row
- Layout/styling: `main.css` → `.prayer-tab-stats`, `.stats-*` classes
- Content/data: `fard-tracker.js` → `_buildStatsRow()` helper
- Other sections use: `window.App.Tracker.buildStatsRow(opts)`

### Bumping version for deployment
```bash
# In service-worker.js: replace all vNNN with vNNN+1
# In index.html: replace all v=NNN with v=NNN+1
# Copy shared files to v2 repo, bump v2 independently
```

---

## Theme System

**Light (default):** White cards on cream background (#F5F3EF)
**Dark:** Dark cards on near-black background

Toggle via `themes.js` → sets `[data-theme="dark"]` on `<html>`.
Stored in `localStorage['salah_tracker_theme']`.

---

## RTL Support

- `<html lang="ar" dir="rtl">` by default
- CSS uses logical properties where needed
- Tab pill positioning: `offsetLeft` gives LTR offset → for RTL, calculate `rightOffset = containerWidth - offsetLeft - tabWidth` and use negative translateX
- Swipe direction inverted for RTL
- All text alignment inherits from dir attribute
