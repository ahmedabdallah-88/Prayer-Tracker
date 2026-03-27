# Prayer Tracker PWA — Part 3: UI/UX Decisions, Design System & Recent Changes

> **Part 3 of 4.** Read Parts 1-2 first.
> Parts: `01-OVERVIEW-ARCHITECTURE.md` → `02-FEATURES.md` → `03-UI-DESIGN.md` → `04-DATA-ISSUES.md`

---

## CURRENT UI/UX DECISIONS

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
- **RTL pill positioning:** `rightOffset = containerWidth - offsetLeft - tabWidth`, negative translateX

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
- Built by shared `buildStatsRow(opts)` in fard-tracker.js

### Splash Screen
- Stars + full moon → crescent + verse letter-by-letter reveal + prayer circle checkmarks → zoom + fade
- 10.4 seconds total

---

## DESIGN SYSTEM

### Color Palette (Per Theme)

**Green (default):**
```css
--primary: #2D6A4F    --primary-rgb: 45, 106, 79
--primary-mid: #40916C    --primary-mid-rgb: 64, 145, 108
--primary-light: #52B788
--accent: #D4A03C     --accent-rgb: 212, 160, 60    --accent-light: #E8B84A
--danger: #C1574E     --danger-rgb: 193, 87, 78     --danger-light: #D4645B
--bg-main: #F5F3EF    --card-bg: rgba(255,255,255,0.55)
--text-primary: #2B2D42  --text-secondary: #5A5D6E  --text-muted: #8D99AE  --text-faint: #B8BCC8
--border: rgba(0,0,0,0.04)
--tab-bg: rgba(245,243,239,0.92)
```

**Navy:**
```css
--primary: #1B2A4A    --primary-mid: #2C3E6B    --primary-light: #4A6FA5
--accent: #A8B4C4     --accent-light: #C0CCD8    --bg-main: #F0F2F5
--text-primary: #1B2A4A  --text-muted: #7A8599  --text-secondary: #4A5568
```

**Purple:**
```css
--primary: #5B21B6    --primary-mid: #7C3AED    --primary-light: #A78BFA
--accent: #D4A03C     --bg-main: #F5F3F7
--text-primary: #2D1B69  --text-muted: #8B7FAE  --text-secondary: #5A4D6E
```

**Feminine (Rose):**
```css
--primary: #9D174D    --primary-mid: #BE185D    --primary-light: #EC4899
--accent: #D4A03C     --danger: #B91C1C    --bg-main: #FDF2F4
--text-primary: #4A1D34  --text-muted: #A3728B  --text-secondary: #7A4D60
```

**Sky (Ocean Blue):**
```css
--primary: #0C4A6E    --primary-mid: #0369A1    --primary-light: #0EA5E9
--accent: #F59E0B     --accent-light: #FBBF24    --bg-main: #F0F7FA
--text-primary: #0C2D48  --text-muted: #6B8FA3
```

**Dark & Gold:**
```css
--primary: #D4A03C    --primary-mid: #E8B84A    --primary-light: #F0D68A
--accent: #D4A03C     --danger: #EF4444    --danger-light: #F87171
--bg-main: #1A1A1E    --card-bg: rgba(40,40,44,0.8)
--text-primary: #E8E6E1  --text-muted: #8A8A8E  --text-secondary: #A3A3A3  --text-faint: #525252
--border: rgba(255,255,255,0.06)    --tab-bg: rgba(26,26,30,0.95)
```

**Olive:**
```css
--primary: #3D5A3E    --primary-mid: #5A7D5B    --primary-light: #7A9E7B
--accent: #C8B56E     --accent-light: #D4C17A    --danger: #A0522D
--bg-main: #F4F2EC    --text-primary: #2E3A2F  --text-muted: #7A8A7B
```

### Fonts
- **Arabic body:** Noto Kufi Arabic (400, 500, 600, 700, 800)
- **Latin/numbers:** Rubik (400, 500, 600, 700, 800)
- **Quran verse:** Amiri (400, 700)
- **Icons:** Google Material Symbols Rounded (variable: opsz 20-48, wght 100-700, FILL 0-1)

### Icon Guidelines
- **Always** use Material Symbols Rounded — never emojis
- Active: `font-variation-settings: 'FILL' 1, 'wght' 500`
- Inactive: `'FILL' 0, 'wght' 400`
- Color: white on gradient backgrounds, `#8D99AE` when inactive

### Prayer Sky-Time Gradients (Hardcoded — NOT CSS variables)
```javascript
// In fard-tracker.js as SKY_GRADIENTS / SKY_SHADOWS objects
// These do NOT change with theme

'fajr':    'linear-gradient(135deg, #E8B4B8, #C48A90)'   // shadow: rgba(196,138,144,0.35)
'dhuhr':   'linear-gradient(135deg, #F0C75E, #D4A030)'   // shadow: rgba(212,160,48,0.35)
'asr':     'linear-gradient(135deg, #E8A849, #C07828)'   // shadow: rgba(192,120,40,0.35)
'maghrib': 'linear-gradient(135deg, #C47A5A, #9E5238)'   // shadow: rgba(158,82,56,0.35)
'isha':    'linear-gradient(135deg, #5B6B8A, #3A4A68)'   // shadow: rgba(58,74,104,0.35)

// Sunnah-specific:
'tahajjud': 'linear-gradient(135deg, #2e4482, #1e3a8a)'  // shadow: rgba(30,58,138,0.35)
'duha':     'linear-gradient(135deg, #fbbf24, #f59e0b)'  // shadow: rgba(245,158,11,0.35)
'witr':     'linear-gradient(135deg, #7C6DAF, #5A4B8A)'  // shadow: rgba(90,75,138,0.35)
// Other sunnah prayers share their fard-time gradient
```

### Glassmorphism Card Style
```css
background: rgba(255,255,255,0.55);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border-radius: 20px;
border: 1px solid rgba(0,0,0,0.04);
box-shadow: 0 2px 12px rgba(0,0,0,0.04);
```

### Key CSS Classes
| Class | Purpose |
|-------|---------|
| `.prayer-tabs-container` | Fard tab bar (rounded, flex, position: relative) |
| `.prayer-tabs-pill` | Sliding white background behind active tab |
| `.prayer-tab` | Individual tab button |
| `.prayer-tab-icon` | Icon square (28×28 inactive, 38×38 active) |
| `.prayer-tab-name` | Prayer name below icon |
| `.prayer-chips-container` | Sunnah chips wrap container |
| `.prayer-chip` | Individual sunnah chip button |
| `.prayer-chip-name` | Name inside chip |
| `.prayer-selected-name` | Selected sunnah name below chips |
| `.prayer-tab-stats` | Rich stats row card (glass morphism) |
| `.stats-section` | Column within stats row |
| `.stats-ring-wrap` | SVG progress ring container (52×52) |
| `.stats-ring-pct` | Percentage text centered in ring |
| `.stats-icon-wrap.jamaah` | Jamaah icon container (38×38, gold tint) |
| `.stats-icon-wrap.days` | Days icon container (36×36, grey) |
| `.stats-value` | Large number in stats |
| `.stats-divider` | 1px vertical line between sections |
| `.prayer-tab-grid` | Calendar grid wrapper |
| `.days-grid` | CSS grid for day boxes (7 columns) |
| `.day-box` | Individual day cell |
| `.controls` | Month navigation bar |

---

## RECENT CHANGES (Last Sessions)

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

## PENDING / PLANNED ITEMS

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
