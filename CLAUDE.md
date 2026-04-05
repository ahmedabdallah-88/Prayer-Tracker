# Prayer Tracker PWA — Project Guide for Claude Code

## Section 1 — App Overview

**Prayer Tracker (سجل الصلوات)** is a bilingual (Arabic/English) Islamic prayer tracking Progressive Web App. Users record their 5 daily fard prayers, 8 sunnah prayers, voluntary + Ramadan fasting, and morning/evening azkar — all on the Hijri (Islamic) calendar. The app is fully offline-capable, supports multiple profiles, female exemption tracking (hayd/nifas), qada (missed prayer) calculator and tracker, live prayer times via Aladhan API, browser notifications, athan playback, and a dashboard with SVG charts.

**Tech Stack:**
- **Language:** ES5 JavaScript only — `var`, IIFE pattern, no arrow functions, no `let`/`const`, no template literals
- **CSS:** Vanilla CSS with CSS custom properties (variables), no preprocessor
- **Storage:** `localStorage` only (no backend)
- **Calendar:** Hijri (Islamic) calendar — Umm al-Qura via `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`
- **Prayer times API:** Aladhan (`api.aladhan.com`)
- **Reverse geocoding:** Nominatim (`nominatim.openstreetmap.org`)
- **Hosting:** GitHub Pages
- **No build tools** — plain files served directly
- **PWA:** manifest.json + service-worker.js with cache-first + network-first strategies

**Live URL:** https://ahmedabdallah-88.github.io/Prayer-Tracker/
**Repo URL:** https://github.com/ahmedabdallah-88/Prayer-Tracker (capital P and T)

**Two repos:** `prayer-tracker` (production — active) and `prayer-tracker-v2` (mirror — not currently used).

---

## Section 2 — File Tree

```
prayer-tracker/
├── index.html                         — single-page app, all sections, splash, 31 script tags
├── manifest.json                      — PWA manifest (name, icons, theme_color #0f4c3a, RTL/Arabic)
├── service-worker.js                  — cache-first assets, network-first HTML, offline fallback
├── package.json                       — Playwright test config
├── playwright.config.cjs              — Playwright test runner config
├── CLAUDE.md                          — this file, project guide
├── AUDIT-REPORT.md                    — audit notes
├── LIGHTHOUSE-REPORT.md               — Lighthouse score notes
├── PRAYER-TRACKER-GUIDE.md            — user-facing guide
├── PROJECT-DOCS.md                    — developer docs
├── lighthouse-report-desktop.report.* — Lighthouse desktop audit
├── lighthouse-report-mobile.report.*  — Lighthouse mobile audit
│
├── css/
│   ├── main.css                       — main styles, layout, calendar grid, animations (~5154 lines)
│   ├── themes.css                     — 7 themes + dark mode overrides (~875 lines)
│   ├── dashboard.css                  — dashboard cards, charts, stats (~376 lines)
│   └── splash.css                     — splash screen animation styles (~377 lines)
│
├── js/                                — load order matters; app.js loads last
│   ├── config.js                      — translations (T), fardPrayers[], sunnahPrayers[], month names, PRAYER_API_MAP
│   ├── storage.js                     — localStorage helpers, key generators, quota check, data integrity
│   ├── hijri-calendar.js              — gregorianToHijri, getHijriDaysInMonth, day1 cache, overrides
│   ├── ui-utils.js                    — showToast, showConfirm, haptic, escapeHTML, reminders
│   ├── i18n.js                        — t(), applyLang(), toggleLang(), RTL/LTR switch
│   ├── themes.js                      — setTheme, loadTheme, theme menu
│   ├── profiles.js                    — multi-profile CRUD, migration, profile picker screen
│   ├── female-features.js             — hayd/nifas exempt days, period history
│   ├── tracker-utils.js               — buildDayNamesRow, getFirstDayOffset, appendEmptyCells, month nav
│   ├── fard-tracker.js                — fard prayer tabs, calendar grid, handleDayClick (4-state cycle)
│   ├── sunnah-tracker.js              — delegates to fard-tracker with type='sunnah'
│   ├── jamaah-tracker.js              — congregation toggle, lantern streaks, renderStreaks
│   ├── prayer-streaks.js              — crescent moon streaks + sunnah chip streaks
│   ├── weekly-view.js                 — weekly tracker view mode, week navigation
│   ├── fasting-tracker.js             — voluntary fasting + Ramadan tracker
│   ├── prayer-times.js                — Aladhan API, GPS, countdown, prayer times bar, location bar
│   ├── missed-prayer-notif.js         — detects missed prayers, schedules reminders
│   ├── notification-center.js         — unified notification settings UI
│   ├── notifications.js               — browser notifications, athan playback, insights
│   ├── azkar-tracker.js               — morning/evening azkar tracking
│   ├── svg-charts.js                  — SVG chart builders (bars, rings, weekly pattern)
│   ├── qada-report.js                 — qada summary report renderer
│   ├── qada-calculator.js             — qada prayer calculator wizard
│   ├── qada-tracker.js                — qada daily tracking
│   ├── qada-dashboard.js              — qada analytics dashboard
│   ├── dashboard.js                   — analytics dashboard rendering coordinator
│   ├── year-overview.js               — yearly overview cards, month detail view
│   ├── info-tooltips.js               — (i) info tooltip system
│   ├── data-io.js                     — export/import JSON backup
│   ├── onboarding.js                  — first-time user tour
│   └── app.js                         — main init, startup sequence, SW registration, visibility handler
│
├── icons/                             — PWA icons 72/96/128/144/152/192/384/512 + maskable-192/512
├── audio/                             — athan-afasy.mp3, athan-makkah.mp3
├── tests/                             — Playwright E2E tests
└── docs/                              — supplementary documentation
```

---

## Section 3 — Module Architecture

**IIFE + namespace pattern.** Every JS module registers itself on `window.App` and returns a public API object. Modules never reach into each other's private state; they call the public API.

**Module template:**
```js
window.App = window.App || {};
window.App.ModuleName = (function() {
    var privateState = null;

    function privateFn() { /* ... */ }

    function publicFn() { /* ... */ }

    return {
        publicFn: publicFn,
        init: init
    };
})();

// Backward-compat globals (DEPRECATED — use window.App.ModuleName.*)
window.publicFn = window.App.ModuleName.publicFn; // DEPRECATED
```

**Registered namespaces:**
| Namespace | File | Purpose |
|---|---|---|
| `window.App.Config` | config.js | Static data: translations, prayer arrays, constants |
| `window.App.Storage` | storage.js | localStorage helpers, key generation, stats |
| `window.App.Hijri` | hijri-calendar.js | Hijri calendar engine, date conversion |
| `window.App.UI` | ui-utils.js | Toasts, confirms, haptics, escapeHTML |
| `window.App.I18n` | i18n.js | Language switching, translations |
| `window.App.Themes` | themes.js | Theme selection + persistence |
| `window.App.Profiles` | profiles.js | Multi-profile CRUD |
| `window.App.Female` | female-features.js | Hayd/nifas exempt days, period history |
| `window.App.TrackerUtils` | tracker-utils.js | Shared tracker helpers (day names row, offset, bounce) |
| `window.App.Tracker` | fard-tracker.js | Fard + sunnah calendar grid, handleDayClick, tabs |
| `window.App.SunnahTracker` | sunnah-tracker.js | Thin delegator to Tracker with type='sunnah' |
| `window.App.Jamaah` | jamaah-tracker.js | Congregation state + lantern streaks |
| `window.App.PrayerStreaks` | prayer-streaks.js | Crescent moon streaks, sunnah chip streaks |
| `window.App.WeeklyView` | weekly-view.js | Weekly tracker view mode |
| `window.App.Fasting` | fasting-tracker.js | Voluntary + Ramadan fasting |
| `window.App.PrayerTimes` | prayer-times.js | Aladhan API, GPS, prayer times bar, countdown |
| `window.App.MissedPrayerNotif` | missed-prayer-notif.js | Missed prayer detection + reminders |
| `window.App.NotificationCenter` | notification-center.js | Unified notification settings UI |
| `window.App.Notifications` | notifications.js | Browser notifications, athan playback, insights |
| `window.App.Azkar` | azkar-tracker.js | Morning/evening azkar tracking |
| `window.App.SVGCharts` | svg-charts.js | SVG chart builders |
| `window.App.QadaReport` | qada-report.js | Qada summary report |
| `window.App.QadaCalc` | qada-calculator.js | Qada prayer calculator wizard |
| `window.App.QadaTracker` | qada-tracker.js | Qada daily tracking |
| `window.App.QadaDashboard` | qada-dashboard.js | Qada analytics |
| `window.App.Dashboard` | dashboard.js | Analytics dashboard coordinator |
| `window.App.YearOverview` | year-overview.js | Yearly overview cards |
| `window.App.InfoTooltips` | info-tooltips.js | (i) info popup system |
| `window.App.Onboarding` | onboarding.js | First-time user tour |
| `window.App.Main` | app.js | Init, startup, shell bar, SW updates |

**Load order (see index.html lines 1073–1103):** config → storage → hijri-calendar → ui-utils → i18n → themes → profiles → female-features → tracker-utils → fard-tracker → sunnah-tracker → jamaah-tracker → prayer-streaks → weekly-view → fasting-tracker → prayer-times → missed-prayer-notif → notification-center → notifications → azkar-tracker → svg-charts → qada-report → qada-calculator → qada-tracker → qada-dashboard → dashboard → year-overview → info-tooltips → data-io → onboarding → **app.js (last)**.

**Module communication:**
- Modules call `window.App.OtherModule.publicFn()` directly.
- Cross-module checks use `if (window.App.OtherModule && window.App.OtherModule.fn)` to tolerate load-order edge cases.
- Inline `onclick="..."` in HTML uses backward-compat globals (e.g., `onclick="toggleLang()"`).
- No event bus — direct function calls only. `window.App.Main.switchTab()` calls update functions on each section's module.

---

## Section 4 — Technical Rules

**ES5 only:**
- `var` ONLY — no `let`, no `const`
- No arrow functions (`function() {}` only)
- No template literals — use `'str' + var + 'str'`
- No `for..of`, no `Array.prototype.includes` without fallback, no destructuring
- No spread operator, no default parameters, no classes
- `Array.prototype.forEach`, `map`, `filter` are OK (IE9+)

**iOS Safari window binding:**
- Inline `onclick="fn()"` in HTML MUST bind to `window.fn` (not just module-internal). Every user-callable function that appears in HTML needs a `window.fn = window.App.Module.fn` backward-compat export.

**Google Fonts `icon_names` alphabetical:**
- The `icon_names=...` parameter in the Material Symbols font URL MUST be alphabetically sorted. Otherwise the Google Fonts API returns HTTP 400 and no icons load. Sort strictly: underscores come after letters (`do_not_disturb` before `done_all`, `local_fire_department` before `location_on`).

**No emojis in code/UI:**
- Use Material Symbols Rounded icon font instead of emoji. The one exception is the country flag emoji in the GPS location bar (generated via surrogate pairs by `countryCodeToFlag()` in prayer-times.js).

**`escapeHTML` for user input:**
- Any user-typed string (profile names, locations) going into `innerHTML` must go through `window.App.UI.escapeHTML(str)` first.

**`salah_` prefix for localStorage:**
- Every localStorage key starts with `salah_`. This lets profiles.js and data-io.js iterate only app-owned keys without touching unrelated storage.

**Service Worker manual version bump:**
- After ANY change to CSS/JS, bump BOTH:
  - `CACHE_NAME` in service-worker.js (e.g., `salah-tracker-v331` → `v332`)
  - `?v=` query string on every `<script>`/`<link>` tag in index.html AND every path in the `ASSETS` array in service-worker.js
- Users will otherwise get stale cached assets forever (cache-first strategy).

**`getDaysInMonth` never with Gregorian year:**
- `window.App.Storage.getDaysInMonth(month, year)` expects a HIJRI year (~1446). If called with a Gregorian year (>2000), it logs a warning and auto-converts. NEVER pass `new Date().getFullYear()` directly.

**Other rules:**
- Never set inline colors in JS — always use CSS variables (`var(--text-primary)`, `var(--accent)`, etc.)
- Respect `@media (prefers-reduced-motion: reduce)` — accessibility feature, most users see all animations
- Apply ALL changes to `prayer-tracker` repo only (prayer-tracker-v2 is dormant)
- Test in BOTH Arabic and English modes, BOTH light and dark themes, before committing

---

## Section 5 — localStorage Key Patterns

**Profile prefix:** `[PID_]` means the active profile id followed by `_`, or empty string for legacy single-profile data. Profile ids look like `p_<timestamp>_<rand>`.

**Per-profile per-month keys:**
| Key pattern | Example | Written by |
|---|---|---|
| `salah_tracker_[PID_]fard_hYYYY_M` | `salah_tracker_p_1712_a3x_fard_h1446_9` | storage.js |
| `salah_tracker_[PID_]sunnah_hYYYY_M` | `salah_tracker_p_1712_a3x_sunnah_h1446_9` | storage.js |
| `salah_cong_[PID_]hYYYY_M` | `salah_cong_p_1712_a3x_h1446_9` | jamaah-tracker.js |
| `salah_exempt_[PID_]hYYYY_M` | `salah_exempt_p_1712_a3x_h1446_9` | female-features.js |
| `salah_qada_[PID_]hYYYY_M` | `salah_qada_p_1712_a3x_h1446_9` | qada-tracker.js |
| `salah_volfasting_[PID_]hYYYY_M` | `salah_volfasting_p_1712_a3x_h1446_9` | fasting-tracker.js |
| `salah_azkar_[PID_]hYYYY_M` | `salah_azkar_p_1712_a3x_h1446_9` | azkar-tracker.js |

**Per-profile per-year keys:**
| `salah_fasting_[PID_]hYYYY` | Ramadan fasting | fasting-tracker.js |
| `salah_periods_[PID_]hYYYY` | Period history | female-features.js |

**Per-profile cache keys:**
| `salah_prayer_streaks_[PID]` | Streak cache | prayer-streaks.js |
| `salah_sunnah_streaks_[PID]` | Sunnah streak cache | prayer-streaks.js |
| `salah_jamaah_streaks_[PID]` | Jamaah streak cache | jamaah-tracker.js |
| `salah_qada_log_[PID]` | Qada log | qada-tracker.js |
| `salah_qada_plan_[PID]` | Qada plan | qada-calculator.js |

**Global (non-profile) keys:**
| Key | Purpose |
|---|---|
| `salah_profiles` | JSON array of all profiles |
| `salah_active_profile` | Current active profile id |
| `salah_tracker_theme` | Selected theme (green/navy/purple/feminine/sky/dark/olive) |
| `salah_lang` | `ar` or `en` |
| `salah_onboarding_done` | `true` after first tour |
| `salah_user_location` | `{lat, lng}` GPS |
| `salah_city_name` | `{lat,lng,city,cityName,countryName,countryCode}` |
| `salah_prayer_times` | Cached Aladhan response |
| `salah_hijri_day1_cache` | Hijri month day1→Gregorian cache (capped at 100 entries) |
| `salah_hijri_overrides` | User overrides for Hijri month start dates |
| `salah_hijri_days_YYYY_M` | User override for days in specific Hijri month (29/30) |
| `salah_notif_before_enabled`, `salah_notif_before_minutes`, `salah_notif_before_prayers` | Pre-prayer notifications |
| `salah_notif_after_enabled`, `salah_notif_after_minutes`, `salah_notif_after_prayers` | Missed-prayer notifications |
| `salah_notif_reminder_dismissed` | Timestamp of last reminder dismissal |
| `salah_fasting_notif` | Fasting notification enabled |
| `salah_fasting_notif_sent_YYYY-MM-DD` | Daily send-guard |
| `salah_insight_enabled` | Daily insight notification |
| `salah_insight_sent_YYYY-MM-DD` | Daily send-guard |
| `salah_athan_sound_enabled` | Athan audio enabled |
| `salah_athan_muezzin` | `afasy` or `makkah` |
| `salah_athan_volume` | 0–100 |
| `salah_athan_prayers` | JSON array of prayer ids |
| `salah_athan_played_<prayer>_<YYYY-MM-DD>` | Daily athan play-guard |
| `salah_notification_settings` | Consolidated NC settings |

**Orphan cleanup:** `storage.js:validateDataIntegrity()` scans for keys whose embedded profile id is no longer in `salah_profiles` and logs warnings.

**Quota check:** `storage.js:checkStorageQuota()` returns `{usedKB, remainingKB, percentUsed}` assuming a 5 MB budget.

---

## Section 6 — Material Symbols Icons, Fonts, Themes

**Material Symbols Rounded icons used (80, alphabetical — MUST match index.html line 22 and service-worker.js line 60):**
```
add, add_circle, alarm, analytics, assignment_late, auto_awesome,
badge, bedtime, bolt, brightness_2, cake, calculate, calendar_month,
calendar_today, calendar_view_month, check, check_circle, chevron_left,
chevron_right, circle, close, compare_arrows, dark_mode, date_range,
delete, delete_outline, do_not_disturb, done_all, download, edit,
edit_calendar, emoji_events, event, event_repeat, face, female,
grid_view, history, info, insights, light_mode, local_fire_department,
location_on, male, menu_book, mosque, my_location, nights_stay,
notification_important, notifications, notifications_active,
partly_cloudy_day, person, person_add, play_arrow, print, refresh,
restaurant, routine, schedule, school, settings, show_chart, speed,
star, stop, swap_horiz, system_update, target, translate,
trending_down, trending_up, upload_file, verified, volume_up, warning,
water_drop, wb_sunny, wb_twilight, wifi_off
```

**Font stack (loaded in index.html):**
- **Noto Kufi Arabic** — weights 400/500/600/700/800 — primary Arabic UI font
- **Rubik** — weights 400/500/600/700/800 — primary Latin/English font
- **Material Symbols Rounded** — variable font (opsz, wght, FILL, GRAD) with alphabetical `icon_names` subset
- **Amiri** — weights 400/700 — Quran verse in shell bar
- `display=swap` on all fonts

**System font fallback:** `'Noto Kufi Arabic', system-ui, -apple-system, sans-serif`

**CSS theme system:**
- Theme attribute applied on `<html>`: `document.documentElement.setAttribute('data-theme', 'green')`
- 7 themes defined in `css/themes.css`: `green` (default), `navy`, `purple`, `feminine` (pink), `sky`, `dark`, `olive`
- Persisted in `salah_tracker_theme`
- `themes.js:loadTheme()` reads on startup

**Key CSS variables (set per-theme in css/themes.css):**
```css
--primary            /* brand primary, e.g. #2D6A4F for green */
--primary-rgb        /* rgba channels for overlays */
--primary-mid        /* mid tone */
--primary-light      /* lighter tone */
--accent             /* gold accent, e.g. #D4A03C */
--accent-light
--danger             /* error red, e.g. #C1574E */
--danger-light
--bg-main            /* page background */
--card-bg            /* glass card background */
--text-primary       /* main text color */
--text-secondary
--text-muted
--text-faint
--tab-bg             /* bottom tab bar background */
```

The `dark` theme adds ~70 specific selector overrides for backgrounds, borders, text colors, prayer icon colors, streak colors, and scrollbars (see themes.css lines 115–875).

---

## Section 7 — Features

**1. Fard Prayers (الفرائض) — fard-tracker.js, jamaah-tracker.js**
- 5 prayers: Fajr, Dhuhr, Asr, Maghrib, Isha
- Prayer tabs layout (5 tabs, pill slider)
- Calendar grid with day-of-week offset alignment (col 0=Sat → 6=Fri, Friday in gold)
- `handleDayClick(type, prayerId, day)` cycles state: empty → checked → congregation → qada → empty (male) / empty → checked → exempt → qada → congregation → empty (female)
- Stats ring + days counter per prayer tab
- Weekly "glow" highlighting for complete 7-day rows
- Key fns: `renderTrackerMonth`, `handleDayClick`, `updateTrackerStats`, `changeTrackerMonth`

**2. Sunnah Prayers (السنن) — sunnah-tracker.js (delegator)**
- 8 prayers: Sunnah Fajr, Duha, Sunnah Dhuhr, Sunnah Asr, Sunnah Maghrib, Sunnah Isha, Witr, Tahajjud
- Scrollable horizontal tabs (not fixed grid)
- No congregation state
- Delegates to fard-tracker's `renderTrackerMonth` with `type='sunnah'`

**3. Fasting (الصيام) — fasting-tracker.js**
- Voluntary fasting calendar (per Hijri month, day-offset aligned)
- Ramadan tracker with Shawwal 6-days banner after Ramadan
- Key fns: `updateVoluntaryFasting`, `updateFastingView`, `switchFastingView`, `changeFastingMonth`, `updateFastingDashboard`

**4. Azkar (الأذكار) — azkar-tracker.js**
- Morning + evening azkar checkboxes per day
- Calendar grid with day-offset alignment
- Key fns: `updateAzkarTracker`, `markAllAzkar`, `resetAzkar`, `updateAzkarYearly`, `updateAzkarDashboard`

**5. Qada (قضاء) — qada-calculator.js, qada-tracker.js, qada-dashboard.js, qada-report.js**
- Qada calculator wizard: gender, puberty date, missed-period bookends → estimates missed prayers
- Qada daily tracker: mark fard prayers as qada-completed
- Qada dashboard: progress, remaining count, projection
- Qada report: summary PDF-style view
- Key fns: `window.openQadaCalculator`, `QadaTracker.*`, `QadaDashboard.switchQadaSubView`

**6. Prayer Times (أوقات الصلاة) — prayer-times.js**
- Live 5-prayer times from Aladhan API (`api.aladhan.com/v1/timings`)
- GPS location via `navigator.geolocation`, reverse geocode via Nominatim
- Location bar: city + country name + flag emoji (via `countryCodeToFlag`)
- Countdown to next prayer, "passed-prayer" styling for elapsed
- `refreshLocation()` re-detects GPS, `refreshPrayerTimes()` refetches
- Current prayer state: `getCurrentPrayerState()` returns current + next

**7. Notifications — notifications.js, notification-center.js, missed-prayer-notif.js**
- Pre-prayer reminders (configurable X minutes before)
- Missed-prayer reminders (X minutes after prayer entry window)
- Athan audio playback (Afasy or Makkah muezzin, volume control)
- Daily insight notifications
- Fasting reminders (pre-iftar, pre-suhoor)
- Notification Center UI: unified settings screen
- Send-guards per-day to avoid duplicates
- Key fns: `scheduleSWNotifications`, `startPrayerTimesMonitor`, `previewAthan`, `toggleBeforeAthan`, `toggleAfterAthan`

**8. Dashboard (الإحصائيات) — dashboard.js, svg-charts.js**
- Orbital Progress Ring (monthly completion %)
- Prayer Streaks — Crescent Moons (5 fard prayers)
- Jamaah Streaks — Mosque Lanterns (5 prayers)
- Sunnah Streaks — Compact Chips (8 prayers)
- Monthly Progress Chart, Prayer Comparison Bars, Weekly Pattern
- Per-section dashboards: fard/sunnah/fasting/azkar/qada
- Key fns: `updateDashboard`, `updateCharts`, `SVGCharts.*`

**9. Year Overview (السنة) — year-overview.js**
- 12-month grid of progress cards
- Click month → month detail view
- Key fns: `updateYearlyView`, `openMonth`, `backToYearly`, `renderMonthDetail`

**10. Profiles — profiles.js**
- Multi-profile system (name, age, gender)
- Profile picker screen at startup
- Edit/delete profiles, profile settings overlay
- Profile migration (old single-profile data → prefixed keys)
- Key fns: `showProfileScreen`, `selectProfile`, `editProfile`, `deleteProfile`, `saveProfile`

**11. Female Features — female-features.js**
- Hayd (menstruation) / Nifas (postpartum) exempt day marking
- Visible only for female profiles aged 12+
- Period history tracking
- Exempt counts are subtracted from total days in stats calculation
- Key fns: `toggleExemptMode`, `toggleExemptPrayer`, `getExemptDays`, `getExemptCountForPrayer`, `savePeriodHistory`, `renderPeriodHistory`

**12. Themes — themes.js + css/themes.css**
- 7 themes: green (default), navy, purple, feminine, sky, dark, olive
- Theme menu toggle, setTheme persists to localStorage
- Dark mode has ~70 specific selector overrides

**13. i18n — i18n.js + config.js T dictionary**
- Arabic ↔ English switch via `toggleLang()`
- `applyLang()` updates `<html dir>`, `<html lang>`, all `[data-t]` elements, month selects, active views
- Button `langBtn` toggles between "EN" and "عر"

**14. Hijri Calendar — hijri-calendar.js**
- `gregorianToHijri(Date)` via `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`
- `getHijriDaysInMonth(hYear, hMonth)` — counts days by diffing day-1 Gregorian dates
- User overrides: `salah_hijri_days_YYYY_M` (29/30 override), `salah_hijri_overrides` (custom start date)
- day1 cache capped at 100 entries in `salah_hijri_day1_cache`
- Key fns: `gregorianToHijri`, `getTodayHijri`, `getHijriDaysInMonth`, `toggleMonthDays`, `showHijriOverrideDialog`, `createDualDayNum`

**15. Weekly View — weekly-view.js**
- Alternative to monthly tracker — shows 7 days at a time
- Week navigation, day header pills
- Key fns: `setTrackerViewMode`, `changeWeek`, `getWeekDays`, `updateWeekLabel`

**16. Tracker Utilities — tracker-utils.js**
- `buildDayNamesRow()` — Saturday → Friday pill row, Friday highlighted
- `ensureDayNamesRow(containerId)` — idempotent insert, re-creates on lang change
- `getFirstDayOffset(hYear, hMonth)` — returns column index 0–6 for day 1
- `appendEmptyCells(grid, n)` — adds n `.day-empty` cells for offset alignment
- Shared stagger + tap-bounce animations

**17. Info Tooltips — info-tooltips.js**
- Clickable (i) icons open explanation popups
- Used across dashboard cards, streaks, stats
- Key fns: `InfoTooltips.init`, auto-wires from DOM

**18. Data Import/Export — data-io.js**
- Export entire localStorage subset to JSON file
- Import JSON, validates profiles, restores Hijri overrides + theme
- Sanitizes imported strings
- Key fns: `exportData`, `importData`, `validateProfileData`, `sanitizeValue`

**19. Onboarding — onboarding.js**
- First-time user tour after profile creation
- `salah_onboarding_done` flag
- Tooltip overlay system

**20. Service Worker — service-worker.js**
- `CACHE_NAME = 'salah-tracker-v331'` (current)
- Cache-first for JS/CSS/images/fonts (version busting on SW update)
- Network-first for HTML navigation (so users get latest page)
- Network-only for `api.aladhan.com` + `nominatim.openstreetmap.org`
- Inline `OFFLINE_HTML` fallback page
- Notification click handler focuses window + posts `notification-click` message to app

**21. App Init & Shell — app.js**
- `startup()` → splash handling → `init()` → `startPostInitTasks()`
- Global error handlers: `window.onerror`, `window.onunhandledrejection`
- SW registration + update detection (`checkForUpdates`, `showUpdateBanner`, `applyUpdate`)
- `visibilitychange`: foreground runs all checks + missed prayer notif; background schedules SW notifications
- `switchTab(tab)` — bottom nav with haptic + bounce
- `updateShellBar()` — Hijri + Gregorian date display, language-aware

---

## Section 8 — Current Status

**Version:** v331 (CACHE_NAME + all `?v=` query strings).

**Lighthouse scores (target):**
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- Performance: pending / being tuned

**Recently shipped:**
- Day name header pills (Sat–Fri) above all 4 calendar grids
- Day-of-week offset alignment (day 1 lands under its correct column — iOS/Google Calendar style)
- Friday highlighted in gold in day names row
- Week glow rewrite to handle offset empty cells
- `.day-empty` helper class for visibility-hidden offset cells
- Shawwal banner placement fix (insert before day-names-row, not between it and grid)

**Known issues / watchlist:**
- Dark mode: prayer times bar unselected items sometimes need polish
- English mode: sub-tabs can fight the shell bar layout in very narrow viewports (constrained date text fixed this)
- Service Worker caches aggressively — STRICT discipline required on version bumps
- Google Fonts `icon_names` MUST remain alphabetically sorted (400 error otherwise)
- `getDaysInMonth` must receive a Hijri year, never Gregorian

**Features backlog:**
- Performance tuning (Lighthouse perf score)
- Additional athan muezzins
- More nuanced qada projections (streak-based pace estimates)
- Optional Arabic numeral display toggle
- Extended period-history analytics for female profiles
- Additional theme variants
- Notification scheduling via Periodic Sync API (currently SW setTimeout is unreliable — scheduling lives in notifications.js)

**Rules recap (see Section 4 for detail):**
- ES5 ONLY
- Apply changes to `prayer-tracker` repo only
- Test AR + EN, light + dark before commit
- CSS variables for colors (never inline)
- Bump `?v=` + `CACHE_NAME` after every CSS/JS change
- `icon_names` parameter stays alphabetically sorted
- Respect `prefers-reduced-motion`
