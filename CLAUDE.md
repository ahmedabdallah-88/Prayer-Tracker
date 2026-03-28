# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prayer Tracker (متتبع الصلاة) is a PWA for Islamic prayer tracking — fard, sunnah, qada, fasting, azkar. Vanilla ES5 JavaScript, no frameworks, no build step. All data in localStorage. RTL Arabic-first with English support. Hosted on GitHub Pages.

## Development

No build, lint, or test commands. The app is static HTML/CSS/JS served directly. To develop:

1. Edit files directly — changes take effect on reload
2. For local testing, serve with any static server (e.g. `python -m http.server` or VS Code Live Server)
3. The service worker caches aggressively — use incognito or clear cache when testing

## Version Bumping (Required on Every Change)

Every code change requires a version bump in **two files**. Current version pattern is `v=NNN`:

1. **`service-worker.js`**: Update `CACHE_NAME` (line 2) and all `?v=NNN` in the ASSETS array
2. **`index.html`**: Update all `?v=NNN` in `<link>` and `<script>` tags

Use replace-all: `?v=244` → `?v=245` (and `v244` → `v245` for CACHE_NAME). Both files must match.

## Path Conventions

- **Read/Edit/Glob/Grep tools**: Use Windows paths (`C:\Users\Ahassan\.local\bin\prayer-tracker\...`)
- **Bash tool**: Use WSL paths (`/mnt/c/Users/Ahassan/.local/bin/prayer-tracker/...`)

## Architecture

### Module System

Every JS file is an IIFE on `window.App.*`:
```javascript
window.App.ModuleName = (function() {
    'use strict';
    // Use var (not let/const) throughout
    function publicMethod() { ... }
    return { publicMethod: publicMethod };
})();
```

Global aliases like `window.switchTab = window.App.Main.switchTab` exist for inline HTML `onclick` handlers.

### Load Order (Dependency Chain)

Scripts load in `index.html` in strict dependency order — earlier modules cannot reference later ones:
```
config → storage → hijri-calendar → ui-utils → i18n → themes → profiles →
female-features → fard-tracker → sunnah-tracker → jamaah-tracker →
weekly-view → fasting-tracker → prayer-times → notifications →
azkar-tracker → svg-charts → info-tooltips → qada-report →
qada-calculator → qada-tracker → qada-dashboard → dashboard →
year-overview → data-io → onboarding → app
```

### Key Modules

- **config.js** — Constants, prayer definitions, ALL translation strings in `Config.T`
- **storage.js** — localStorage facade. Keys: `salah_tracker_[profileId_]TYPE_hYEAR_MONTH`
- **hijri-calendar.js** — Hijri↔Gregorian via `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`
- **fard-tracker.js** — Largest module. Renders fard AND sunnah prayer grids. Owns `renderTrackerMonth(type)`, `handleDayClick()`, `switchSection()`, `switchView()`, `buildStatsRow()`
- **sunnah-tracker.js** — Thin wrapper that delegates to fard-tracker
- **qada-calculator.js** — 3-step wizard for qada plan creation. Uses `wizardData` object + `additionalPeriods` and `alreadyPrayedPeriods` arrays
- **qada-tracker.js** — Daily qada tracking calendar. Tap increments count, long-press decrements
- **profiles.js** — Multi-profile management. Gender check: `profile.gender === 'female'`
- **app.js** — Must load last. Init sequence, tab switching, service worker registration

### Data Flow

```
User taps day → handleDayClick() in fard-tracker.js
  → Read from Storage.getDataObject() → Cycle state → Storage.saveMonthData()
  → Re-render: renderTrackerMonth() → Update stats → Haptic feedback
```

### Storage Key Patterns

All keys are profile-prefixed: `salah_TYPE_[profileId_]hYEAR_MONTH`
- Prayer data: `salah_tracker_p_123_fard_h1447_9`
- Congregation: `salah_cong_p_123_h1447_9`
- Qada plan: `salah_qada_plan_p_123`
- Qada log: `salah_qada_log_p_123_h1447_9`

### Translations

All UI strings in `config.js` → `Config.T`:
```javascript
'key_name': { ar: 'عربي', en: 'English' }
```
Access via `t('key_name')` (helper wrapping `window.App.I18n.t()`).

### RTL Layout

`<html lang="ar" dir="rtl">`. All CSS inherits RTL. Tab pill positioning must account for RTL offset calculation. Scroll behavior is reversed.

### CSS Organization

- **main.css** — Core layout, prayer grids, tabs, chips, stats. Design tokens in `:root`
- **themes.css** — Dark mode via `[data-theme="dark"]` variable overrides
- **dashboard.css** — Dashboard cards and chart containers
- **splash.css** — Splash screen animations

### Service Worker

Network-first strategy with cache fallback. API calls (aladhan.com, nominatim) are network-only. Handles push notifications and notification click routing.

## Git Workflow

Push directly to `main` after each change. Repository: `https://github.com/ahmedabdallah-88/Prayer-Tracker.git`
