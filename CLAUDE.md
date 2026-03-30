# Prayer Tracker PWA — Project Guide for Claude Code

## Project Overview
Islamic Prayer Tracker PWA (سجل الصلوات) — vanilla ES5, localStorage, Hijri calendar, GitHub Pages.
Two repos: `prayer-tracker` (production — active) and `prayer-tracker-v2` (mirror — not used for now).

## Tech Stack
- **Language:** ES5 JavaScript only (IIFE pattern, var, no arrow functions, no let/const, no template literals)
- **CSS:** Vanilla CSS with CSS variables, no preprocessor
- **Storage:** localStorage only
- **Calendar:** Hijri (Islamic) calendar
- **Hosting:** GitHub Pages
- **No build tools** — plain files served directly

## Architecture
```
index.html          — single page app, all sections
css/main.css        — main styles + animations
css/themes.css      — dark mode + theme overrides
css/dashboard.css   — dashboard-specific styles
css/splash.css      — splash screen styles
js/app.js           — main init, startup sequence
js/config.js        — translations (i18n), prayer arrays, constants
js/storage.js       — localStorage helpers, data keys
js/hijri-calendar.js — Hijri date calculations
js/i18n.js          — language switching (AR/EN), applyLang()
js/ui-utils.js      — toasts, confirms, haptics, reminders
js/themes.js        — theme management
js/profiles.js      — multi-profile system
js/female-features.js — hayd/nifas exempt days
js/fard-tracker.js  — fard prayer tracking, tabs, calendar grid, handleDayClick()
js/sunnah-tracker.js — sunnah prayer tracking
js/jamaah-tracker.js — congregation streaks (lanterns)
js/prayer-streaks.js — prayer streaks (moons) + sunnah streaks (chips)
js/prayer-times.js  — Aladhan API, countdown, prayer times bar
js/fasting-tracker.js — voluntary + Ramadan fasting
js/azkar-tracker.js — morning/evening azkar tracking
js/dashboard.js     — analytics dashboard rendering
js/year-overview.js — yearly overview cards
js/svg-charts.js    — SVG chart builders
js/qada-calculator.js — qada prayer calculator
js/qada-tracker.js  — qada daily tracking
js/qada-dashboard.js — qada analytics
js/info-tooltips.js — (i) info tooltip system
js/data-io.js       — export/import JSON
js/onboarding.js    — first-time user tour
js/notifications.js — browser notifications
```

## Key Patterns
- All modules use IIFE: `window.App.ModuleName = (function() { ... })();`
- Backward compat globals: `window.functionName = window.App.Module.functionName;`
- Storage keys use profile ID: `salah_tracker_[PID_]fard_hYYYY_MM`
- Congregation data: `salah_cong_[PID_]hYYYY_MM`
- Exempt data (female): `salah_exempt_[PID_]hYYYY_MM`
- Prayer streaks cache: `salah_prayer_streaks_[PID]`

## Day Click Cycle
- Male: empty → checked (alone) → congregation → qada → empty
- Female: empty → checked → exempt → qada → congregation → empty
- Sunnah: no congregation state

## Sections (Bottom Tab Bar)
1. الفرائض (Fard) — 5 prayers, tabs layout
2. السنن (Sunnah) — 8 prayers, scrollable tabs
3. الصيام (Fasting) — voluntary + Ramadan
4. الأذكار (Azkar) — morning/evening

Each section has sub-tabs: التتبع (Tracker) / السنة (Year) / الإحصائيات (Stats)

## Dashboard Components
- Orbital Progress Ring (completion %)
- Prayer Streaks — Crescent Moons (5 fard prayers)
- Jamaah Streaks — Mosque Lanterns (5 prayers)
- Sunnah Streaks — Compact Chips (8 prayers)
- Monthly Progress Chart
- Prayer Comparison Bars
- Weekly Pattern

## Known Issues / Current State
- Dark mode: prayer times bar unselected items may need fixing
- English mode: sub-tabs were hidden behind shell bar (fixed by constraining date text)
- Service Worker caches aggressively — bump version in sw.js + index.html ?v= params after changes

## Rules
- ES5 ONLY — no modern JS syntax
- Apply ALL changes to prayer-tracker repo only (for now)
- Test in both Arabic and English modes
- Test in both light and dark modes
- Use CSS variables for colors (var(--text-primary), var(--card-bg), etc.)
- Never set inline colors in JS — use CSS variables instead
- Respect @media (prefers-reduced-motion: reduce) for animations — this is an accessibility feature that disables animations ONLY for users who have "Reduce Motion" enabled in their device settings. Most users will see all animations normally.
- After CSS/JS changes, bump the ?v= version in index.html script/link tags
- After changes, bump the cache version in sw.js
