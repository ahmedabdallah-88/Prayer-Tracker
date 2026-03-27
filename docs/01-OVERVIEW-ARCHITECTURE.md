# Prayer Tracker PWA — Part 1: Overview, Structure & Architecture

> **Read all 4 docs in order for full context.** This is Part 1 of 4.
> Current service worker version: **v221**. Last updated: **2026-03-27**.
> Parts: `01-OVERVIEW-ARCHITECTURE.md` → `02-FEATURES.md` → `03-UI-DESIGN.md` → `04-DATA-ISSUES.md`

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
│   ├── themes.css             # 7 theme variable sets + dark mode component overrides (542 lines)
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
│   ├── info-tooltips.js       # 22 contextual help tooltips for reports
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
├── icons/                     # PWA icons (72→512px + maskable)
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
    var _state = {};
    function _helper() {}
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
- All user data keys prefixed with profile ID: `salah_tracker_p_123_fard_h1447_1`
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

- `themes.css` defines all 7 variable sets (lines 1-157) + 100+ dark overrides (lines 159-542)
- `themes.js` handles: `setTheme()`, `loadTheme()`, `toggleThemeMenu()`
- Saved in `localStorage['salah_tracker_theme']`

### Service Worker
- **Version pattern:** `CACHE_NAME = 'salah-tracker-vNNN'`
- **Assets versioned:** `?v=NNN` on CSS/JS (31 references in SW + index.html)
- **Strategy:** Network-first with cache fallback for app assets
- **API calls:** Network-only (aladhan, nominatim) — no caching
- **Offline fallback:** Inline HTML page with retry button
- **Update flow:** SW detects new version → `SKIP_WAITING` message → reload
- **Background:** `periodicsync` + `SCHEDULE_NOTIFICATION` messages
- **Notification click:** Focuses existing window or opens new one

**Version bump procedure:**
1. Find-replace `vNNN` → `vNNN+1` in `service-worker.js`
2. Find-replace `v=NNN` → `v=NNN+1` in `index.html`
3. Copy shared files to v2 repo, bump v2's own files

### Cross-Module Data Flow
```
User taps day box
  → handleDayClick(type, prayerId, day) in fard-tracker.js
    → Read state from Storage.getDataObject()
    → Cycle: empty → prayed → congregation → qada → empty
    → Storage.saveMonthData() + saveCongregationData()
    → renderTrackerMonth(type) ← re-render
    → updateTrackerStats() ← update counters
    → App.UI.haptic('soft') ← haptic feedback
```

### Key Function Quick Reference

| Function | Module | Purpose |
|----------|--------|---------|
| `renderTrackerMonth(type)` | fard-tracker | Renders tabs/chips + stats + calendar |
| `handleDayClick(type, pid, day)` | fard-tracker | 4-state day cycle with save |
| `buildStatsRow(opts)` | fard-tracker | Shared stats row builder |
| `getCurrentPrayerState()` | prayer-times | Returns `{ active, next, prayers }` |
| `t(key)` | i18n | Get translated string |
| `getPrayerName(id)` | i18n | Localized prayer name |
| `switchTab(tab)` | app | Switch main section |
| `showToast(msg, type)` | ui-utils | Toast notification |
| `haptic(pattern)` | ui-utils | Haptic feedback |
| `gregorianToHijri(date)` | hijri-calendar | Date → Hijri |
| `getTodayHijri()` | hijri-calendar | Today's Hijri date |
| `setTheme(name)` | themes | Apply color theme |
| `exportData()` | data-io | Export as JSON |

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
