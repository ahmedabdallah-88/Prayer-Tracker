# Prayer Tracker PWA — Part 2: Features

> **Part 2 of 4.** Read `01-OVERVIEW-ARCHITECTURE.md` first for project context.
> Parts: `01-OVERVIEW-ARCHITECTURE.md` → `02-FEATURES.md` → `03-UI-DESIGN.md` → `04-DATA-ISSUES.md`

---

## Fard Prayer Tracking
- **5 prayers:** Fajr, Dhuhr, Asr, Maghrib, Isha
- **UI:** 5 prayer tabs with sliding pill indicator + single calendar grid
- **Day click cycle (4 states):** Empty → Prayed alone (green) → Congregation (gold) → Qada (red) → Empty
- **Active tab:** 38×38 icon with prayer sky-time gradient, white filled icon, 13px/800 name
- **Inactive tab:** 28×28 transparent, grey outline icon, 11px/500 muted name
- **Tab default:** Auto-selects based on current prayer time via `getCurrentPrayerState()`
- **Stats row:** Progress ring + jamaah mosque icon + days count (glass card)
- **Batch operations:** Mark/unmark all days for a prayer
- **Female mode:** Toggle exempt days per-prayer
- **Module:** `fard-tracker.js` (`window.App.Tracker`)
- **Renderer:** `renderTrackerMonth('fard')` — builds tabs + stats + grid

## Sunnah Prayer Tracking
- **8 prayers:** Tahajjud, Sunnah Fajr, Duha, Sunnah Dhuhr, Sunnah Asr, Sunnah Maghrib, Sunnah Isha, Witr
- **UI:** Chips/pills layout (flex-wrap, 2 rows) — NOT tabs (too cramped for 8)
- **Active chip:** Prayer's own sky-time gradient background, white text + filled icon, colored shadow
- **Inactive chip:** Neutral `rgba(0,0,0,0.04)` background, grey outline icon, secondary text
- **Selected prayer full name** displayed centered below chips
- **Day click cycle (3 states):** Empty → Prayed → Qada → Empty
- **Stats row:** Progress ring + days count (no jamaah section)
- **Module:** `sunnah-tracker.js` is a thin wrapper → calls `renderTrackerMonth('sunnah')`
- **Same renderer** as fard — `fard-tracker.js` branches on `type === 'sunnah'`

## Azkar Tracking
- **2 categories:** Morning (أذكار الصباح) and Evening (أذكار المساء)
- **UI:** 2-tab layout (same style as fard tabs) + calendar grid
- **Day toggle:** Tap to mark complete for the day
- **Stats row:** Progress ring + days count
- **Module:** `azkar-tracker.js` (`window.App.Azkar`)
- **Uses:** `App.Tracker.buildStatsRow()` for stats display

## Fasting Tracking
**Three sub-views:**

1. **Voluntary Fasting** — Monthly calendar grid
   - Tap days to mark as fasted
   - Sunnah fast badges show: Monday/Thursday, White Days (13-15), Arafah (9 Dhul-Hijjah), Ashura (9-10 Muharram)
   - Shawwal banner: 6-day challenge with progress bar, hadith, completion celebration

2. **Ramadan** — 30-day grid for month 9
   - Three states: Fasted / Exempt (female) / Missed
   - Exempt mode links to female features

3. **Dashboard** — Year-level fasting statistics

**Module:** `fasting-tracker.js` (`window.App.Fasting`)

**Sunnah fast types detected:**
- Dhul Hijjah (days 1-9)
- Ashura (9th-10th Muharram)
- White Days (13-15 of any month)
- Monday/Thursday (weekly)
- Day of Arafah (9 Dhul-Hijjah)

## Prayer Times
- **API:** Aladhan — `https://api.aladhan.com/v1/timings/{DD-MM-YYYY}?latitude=LAT&longitude=LNG&method=METHOD`
- **Geolocation:** Browser API, cached 7 days in localStorage
- **Reverse geocode:** Nominatim → city name + country code
- **Auto-detect method:** By country (MWL, ISNA, Egyptian, Umm Al-Qura, etc.)
- **Display:** 5 prayer time cards in header bar
- **Countdown:** Breathe-animated timer to next prayer
- **`getCurrentPrayerState()`:** Returns `{ active: 'dhuhr', next: {...}, prayers: [], nowMin }`
- **Module:** `prayer-times.js` (`window.App.PrayerTimes`)

## Dashboard & Statistics
**5+ SVG charts** rendered by `svg-charts.js`:
1. **Orbital progress** — Outer ring: year completion %, inner: congregation %
2. **Streak flame bars** — Current + best streaks per prayer
3. **Mountain chart** — Monthly trend line (solid for prayer, dashed for congregation)
4. **Prayer dual bars** — Per-prayer completion + congregation side-by-side
5. **Weekly rhythm** — Congregation % by weekday (Sat–Fri)
6. **Qada report** — Proportional color blocks + per-prayer progress bars

**22 contextual tooltips** (info-tooltips.js) explain each report in AR/EN.

**Module:** `dashboard.js` (`window.App.Dashboard`) + `svg-charts.js` (`window.App.SVGCharts`)

**Chart functions:** `orbitalProgress()`, `streakFlameBars()`, `mountainChart()`, `prayerDualBars()`, `weeklyRhythm()`, `barChart()`

## Qada Calculator (3 Phases)
- **Phase 1 — Data Entry:** Puberty date + regular prayer start date → missed day count
- **Phase 2 — Plan Generation:** Daily qada goal, spread across calendar
- **Phase 3 — Confirmation:** Review totals, daily target, estimated completion date
- **Tracking:** Calendar grid per prayer, tap to increment count, long-press to decrement
- **Dashboard:** 5 report cards (monthly progress, prayer breakdown, daily goal, forecast)
- **Modules:** `qada-calculator.js`, `qada-tracker.js`, `qada-dashboard.js`, `qada-report.js`
- **Storage:** Plan in `salah_qada_plan_[PID]`, daily logs in `salah_qadalog_[PID_]hYYYY_MM`

## Notifications (4 Types + Athan)

### Before-Athan Notifications
- X minutes before prayer time (configurable: 5/10/15/20)
- Per-prayer enable/disable checkboxes
- Sound: Web Audio API ascending 3-tone (523Hz, 659Hz, 784Hz)

### After-Athan Notifications
- X minutes after prayer time — reminder to log
- Per-prayer enable/disable
- Sound: descending 3-tone (784Hz, 659Hz, 523Hz)

### Fasting Notifications
- Triggered at Fajr time
- Types: Ramadan, Shawwal 6-day, Monday/Thursday, White Days, Arafah, Ashura
- Localized title/body in AR/EN

### Daily Insight Notifications
- Triggered after Isha each day
- Auto-generates spiritual insight from prayer stats (streak, best prayer, overall %)

### Athan Auto-Play
- 2 muezzins: Afasy (`audio/athan-afasy.mp3`), Makkah (`audio/athan-makkah.mp3`)
- Volume slider (0-100)
- Per-prayer enable/disable checkboxes
- Preview button
- Stop pill during playback
- Plays once per prayer per day (tracked via `salah_athan_played_[PRAYER]_[DATE]`)
- Triggers within 1-minute window of prayer time

### Monitor System
- `startMonitor()` runs `setInterval` checking every 30 seconds:
  - Before/after athan checks
  - Athan auto-play check
- Fasting + insight checks every 5 minutes

**Module:** `notifications.js` (`window.App.Notifications`)

## Splash Screen
10.4-second animated sequence:
1. Stars + sparkles + full moon appear (0.1s)
2. Moon transforms to crescent with glow (1.5s)
3. Prayer circles + verse container fade in (3.2s)
4. Checkmarks fill one-by-one, verse letters reveal letter-by-letter (3.6-5.2s)
5. App name fades in (5.6s)
6. Everything hides, verse zooms to center, dark overlay (6.4s)
7. Splash fades out over 2 seconds (8.4s)
8. Splash removed from DOM, app reveals (10.4s)

**CSS:** `splash.css` — keyframes: `starTwinkle`, `sparklePulse`, `checkPop`

## Onboarding Tutorial (8 Steps)
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

**Module:** `onboarding.js` (`window.App.Onboarding`)
**Storage:** `salah_onboarding_done`

## Multi-Profile System
- Create unlimited profiles with name, age, gender
- Profile ID: `p_TIMESTAMP_RANDOM`
- Each profile's data fully isolated (prefixed localStorage keys)
- Switch profiles → full reload
- Delete profile → confirm dialog → purge all profile keys
- **Module:** `profiles.js` (`window.App.Profiles`)

## Female Exemption Mode
- Toggle per-section (fard/sunnah)
- Mark individual days as exempt
- Per-prayer granularity (exempt Fajr but not Dhuhr on same day)
- Exempt days excluded from completion stats
- Period history auto-detected from consecutive exempt days
- Period dashboard shows history + patterns
- **Module:** `female-features.js` (`window.App.Female`)

## Export / Import
- **Export:** JSON file with all profile data + theme + Hijri overrides
- **Import:** Merge into existing profile or create new one
- **File name:** `[ProfileName]_[YYYY-MM-DD]_[HH-mm-ss].json`
- **Uses:** Web Share API (if available) or anchor-click download fallback
- **Migration:** `migrateGregorianToHijri()` converts old Gregorian-keyed data
- **Module:** `data-io.js` (`window.App.DataIO`)

## Hijri Calendar Engine
- **Algorithm:** UmmAlqura via `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`
- **Conversion:** `gregorianToHijri()`, `hijriToGregorian()` (binary search, cached)
- **Month days:** 29 or 30 (auto-detected, user-overridable)
- **Manual override:** User can set Gregorian start date for any Hijri month
- **Dual display:** Each day cell shows Hijri day + small Gregorian day number
- **Module:** `hijri-calendar.js` (`window.App.Hijri`)

## Bilingual (Arabic / English)
- Default: Arabic (RTL)
- Toggle: `toggleLang()` flips direction + re-renders
- All strings via `Config.T` dictionary
- HTML `[data-t]` attributes auto-translated
- Month names, prayer names, tooltips all localized
- **Module:** `i18n.js` (`window.App.I18n`)
