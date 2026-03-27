# Prayer Tracker PWA — Part 4: Data Storage Schema & Known Issues

> **Part 4 of 4.** Read Parts 1-3 first.
> Parts: `01-OVERVIEW-ARCHITECTURE.md` → `02-FEATURES.md` → `03-UI-DESIGN.md` → `04-DATA-ISSUES.md`

---

## DATA STORAGE SCHEMA

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

## KNOWN ISSUES & BUGS

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
