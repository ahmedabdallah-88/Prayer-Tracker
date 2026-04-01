/* Prayer Tracker PWA — prayer-streaks.js
 * Prayer consistency streaks with crescent moon visualization.
 */
window.App = window.App || {};
window.App.PrayerStreaks = (function() {
    'use strict';

    var Hijri = window.App.Hijri;
    var Storage = window.App.Storage;
    var Config = window.App.Config;
    var I18n = window.App.I18n;
    var Female = window.App.Female;

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var STREAK_STORAGE_KEY_PREFIX = 'salah_prayer_streaks_';
    var SVG_ZONE_H = 60;

    var gradients = {
        '#D4A0A7': 'linear-gradient(135deg, #E8B4B8, #D4A0A7)',
        '#E8B84A': 'linear-gradient(135deg, #F0C75E, #E8B84A)',
        '#D4943A': 'linear-gradient(135deg, #E8A849, #D4943A)',
        '#B0664A': 'linear-gradient(135deg, #C47A5A, #B0664A)',
        '#4A5A7A': 'linear-gradient(135deg, #5B6B8A, #4A5A7A)',
        '#f59e0b': 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        '#8b4789': 'linear-gradient(135deg, #7C6DAF, #5A4B8A)',
        '#1e3a8a': 'linear-gradient(135deg, #2e4482, #1e3a8a)'
    };

    function getStreakKey() {
        return STREAK_STORAGE_KEY_PREFIX + Storage.getProfilePrefix().replace(/_$/, '');
    }

    var _isFemale = false;

    function isFemaleProfile() {
        return _isFemale;
    }

    // ==================== MONTH DATA CACHE ====================
    // Per-calculation caches — cleared at start of each calculateAllStreaks
    var _monthCache = {};
    var _exemptCache = {};
    var _monthExists = {}; // tracks whether ANY data exists for a month

    function _getMonthData(hYear, hMonth) {
        var cacheKey = hYear + '_' + hMonth;
        if (_monthCache[cacheKey]) return _monthCache[cacheKey];

        // Use Storage key generators to guarantee exact same key format as save
        var fardKey = Storage.getStorageKey('fard', hMonth, hYear);
        var fardStored = localStorage.getItem(fardKey);

        var congKey = Storage.getCongregationKey(hYear, hMonth);
        var congStored = localStorage.getItem(congKey);

        // Track whether this month has ANY stored data at all
        _monthExists[cacheKey] = !!(fardStored || congStored);

        var fardData = fardStored ? JSON.parse(fardStored) : {};
        var congData = congStored ? JSON.parse(congStored) : {};

        _monthCache[cacheKey] = { fard: fardData, cong: congData };
        return _monthCache[cacheKey];
    }

    function _getExemptData(hYear, hMonth) {
        var cacheKey = hYear + '_' + hMonth;
        if (_exemptCache.hasOwnProperty(cacheKey)) return _exemptCache[cacheKey];

        // Read exempt data directly from localStorage using Storage.getExemptKey
        try {
            var exemptKey = Storage.getExemptKey(hYear, hMonth);
            var stored = localStorage.getItem(exemptKey);
            if (!stored) {
                _exemptCache[cacheKey] = null;
                return null;
            }
            var parsed = JSON.parse(stored);
            // Handle old boolean format migration inline
            var keys = Object.keys(parsed);
            if (keys.length > 0 && typeof parsed[keys[0]] === 'boolean') {
                var newData = {};
                var fardPrayers = Config.fardPrayers;
                keys.forEach(function(day) {
                    if (parsed[day]) {
                        newData[day] = {};
                        fardPrayers.forEach(function(p) { newData[day][p.id] = true; });
                    }
                });
                _exemptCache[cacheKey] = newData;
                // Also mark month as having data
                _monthExists[cacheKey] = true;
                return newData;
            }
            _exemptCache[cacheKey] = parsed;
            _monthExists[cacheKey] = true;
            return parsed;
        } catch(e) {
            _exemptCache[cacheKey] = null;
            return null;
        }
    }

    // ==================== DAY STATE CHECKS ====================

    function isDayExempt(prayerId, hYear, hMonth, hDay) {
        if (!_isFemale) return false;
        var exemptData = _getExemptData(hYear, hMonth);
        if (!exemptData) return false;
        var dayStr = String(hDay);
        return !!(exemptData[dayStr] && exemptData[dayStr][prayerId]);
    }

    function isDayPrayed(prayerId, hYear, hMonth, hDay) {
        var monthData = _getMonthData(hYear, hMonth);
        var dayStr = String(hDay);

        // Check fard data
        if (monthData.fard[prayerId] && monthData.fard[prayerId][dayStr]) {
            return true;
        }
        // Check congregation data
        if (monthData.cong[prayerId] && monthData.cong[prayerId][dayStr]) {
            return true;
        }
        return false;
    }

    // Returns true if we have never seen ANY data for this month
    function _hasNoDataForMonth(hYear, hMonth) {
        var cacheKey = hYear + '_' + hMonth;
        // Ensure data is loaded first
        _getMonthData(hYear, hMonth);
        if (_isFemale) _getExemptData(hYear, hMonth);
        return !_monthExists[cacheKey];
    }

    // ==================== STREAK CALCULATION ====================

    function calculateCurrentStreak(prayerId) {
        var today = new Date();
        var checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
        var todayH = Hijri.gregorianToHijri(checkDate);
        var currentStreak = 0;

        // Check if today should be included
        var startFromToday = false;
        var maxDays = Hijri.getHijriDaysInMonth(todayH.year, todayH.month);
        if (todayH.day <= maxDays) {
            startFromToday = isDayPrayed(prayerId, todayH.year, todayH.month, todayH.day);
        }

        if (!startFromToday) {
            checkDate = new Date(checkDate.getTime() - 86400000);
        }

        var emptyMonthCount = 0;
        for (var i = 0; i < 730; i++) {
            var hDate = Hijri.gregorianToHijri(checkDate);
            var daysInMonth = Hijri.getHijriDaysInMonth(hDate.year, hDate.month);
            if (hDate.day > daysInMonth) {
                checkDate = new Date(checkDate.getTime() - 86400000);
                continue;
            }

            // Stop if we hit a month with zero data (user wasn't tracking yet)
            if (hDate.day === 1 || i === 0) {
                if (_hasNoDataForMonth(hDate.year, hDate.month)) {
                    emptyMonthCount++;
                    if (emptyMonthCount >= 2) break;
                } else {
                    emptyMonthCount = 0;
                }
            }

            if (isDayExempt(prayerId, hDate.year, hDate.month, hDate.day)) {
                checkDate = new Date(checkDate.getTime() - 86400000);
                continue;
            }
            if (isDayPrayed(prayerId, hDate.year, hDate.month, hDate.day)) {
                currentStreak++;
                checkDate = new Date(checkDate.getTime() - 86400000);
            } else {
                break;
            }
        }
        return currentStreak;
    }

    function calculateBestStreak(prayerId) {
        var today = new Date();
        var todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
        var currentHijriYear = Hijri.getCurrentHijriYear();
        var scanStartG = Hijri.hijriToGregorianDay1(currentHijriYear, 1);
        var scanDate = new Date(scanStartG.getFullYear(), scanStartG.getMonth(), scanStartG.getDate(), 12, 0, 0);

        var bestStreak = 0;
        var tempStreak = 0;

        while (scanDate <= todayNoon) {
            var hScan = Hijri.gregorianToHijri(scanDate);
            var daysInMonth = Hijri.getHijriDaysInMonth(hScan.year, hScan.month);
            if (hScan.day > daysInMonth) {
                scanDate = new Date(scanDate.getTime() + 86400000);
                continue;
            }
            if (isDayExempt(prayerId, hScan.year, hScan.month, hScan.day)) {
                scanDate = new Date(scanDate.getTime() + 86400000);
                continue;
            }
            if (isDayPrayed(prayerId, hScan.year, hScan.month, hScan.day)) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
            scanDate = new Date(scanDate.getTime() + 86400000);
        }
        return bestStreak;
    }

    function calculateAllStreaks() {
        // Clear all caches for fresh calculation
        _monthCache = {};
        _exemptCache = {};
        _monthExists = {};

        // Cache female check once — avoids calling Storage.getActiveProfile() thousands of times
        var profile = Storage.getActiveProfile();
        _isFemale = !!(profile && profile.gender === 'female' && profile.age >= 12);

        var prayers = Config.fardPrayers;
        var result = { current: {}, best: {} };
        var todayH = Hijri.getTodayHijri();

        prayers.forEach(function(prayer) {
            result.current[prayer.id] = calculateCurrentStreak(prayer.id);
            result.best[prayer.id] = calculateBestStreak(prayer.id);
            if (result.current[prayer.id] > result.best[prayer.id]) {
                result.best[prayer.id] = result.current[prayer.id];
            }
        });

        result.lastCalculated = todayH.year + '-' + todayH.month + '-' + todayH.day;

        try {
            localStorage.setItem(getStreakKey(), JSON.stringify(result));
        } catch(e) { /* storage full */ }

        return result;
    }

    function getStreaks() {
        return calculateAllStreaks();
    }

    // ==================== MOON SVG RENDERING ====================

    function getTier(current) {
        if (current >= 40) return 'full';
        if (current >= 20) return 'gibbous';
        if (current >= 10) return 'half';
        if (current >= 1) return 'crescent';
        return 'new';
    }

    var tierConfig = {
        'new':      { size: 24, glowAnim: '', floatAnim: '' },
        'crescent': { size: 30, glowAnim: 'moon-glow-sm', floatAnim: 'moon-float' },
        'half':     { size: 36, glowAnim: 'moon-glow-sm', floatAnim: 'moon-float' },
        'gibbous':  { size: 42, glowAnim: 'moon-glow-md', floatAnim: 'moon-float' },
        'full':     { size: 50, glowAnim: 'moon-glow-lg', floatAnim: 'moon-float' }
    };

    function getDynamicFontSize(num) {
        var len = String(num).length;
        if (len >= 4) return '13px';
        if (len === 3) return '15px';
        if (len === 2) return '18px';
        return '20px';
    }

    function buildMoonSVG(tier, cfg, uid) {
        var s = cfg.size;
        var svgEl = document.createElementNS(SVG_NS, 'svg');
        svgEl.setAttribute('width', s);
        svgEl.setAttribute('height', s);
        svgEl.setAttribute('viewBox', '0 0 ' + s + ' ' + s);
        svgEl.style.overflow = 'visible';
        svgEl.style.display = 'block';

        var cx = s / 2, cy = s / 2, r = s / 2 - 1;

        if (tier === 'new') {
            // Dashed empty circle
            var circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', '#D0D0D0');
            circle.setAttribute('stroke-width', '1');
            circle.setAttribute('stroke-dasharray', '2 3');
            circle.classList.add('moon-new-circle');
            svgEl.appendChild(circle);
            return svgEl;
        }

        if (tier === 'full') {
            // Golden full moon with craters
            var defs = document.createElementNS(SVG_NS, 'defs');
            var grad = document.createElementNS(SVG_NS, 'radialGradient');
            grad.setAttribute('id', 'moonFull' + uid);
            var s1 = document.createElementNS(SVG_NS, 'stop');
            s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#FFF0A0');
            var s2 = document.createElementNS(SVG_NS, 'stop');
            s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#FFE680');
            grad.appendChild(s1); grad.appendChild(s2);
            defs.appendChild(grad);
            svgEl.appendChild(defs);

            var fullCircle = document.createElementNS(SVG_NS, 'circle');
            fullCircle.setAttribute('cx', cx);
            fullCircle.setAttribute('cy', cy);
            fullCircle.setAttribute('r', r);
            fullCircle.setAttribute('fill', 'url(#moonFull' + uid + ')');
            svgEl.appendChild(fullCircle);

            // Subtle craters
            var craters = [
                { x: cx - r * 0.3, y: cy - r * 0.2, r: r * 0.12 },
                { x: cx + r * 0.25, y: cy + r * 0.3, r: r * 0.09 },
                { x: cx - r * 0.1, y: cy + r * 0.45, r: r * 0.07 }
            ];
            craters.forEach(function(c) {
                var crater = document.createElementNS(SVG_NS, 'circle');
                crater.setAttribute('cx', c.x);
                crater.setAttribute('cy', c.y);
                crater.setAttribute('r', c.r);
                crater.setAttribute('fill', 'rgba(200,180,100,0.3)');
                svgEl.appendChild(crater);
            });
            return svgEl;
        }

        // Crescent / half / gibbous — use clip path with two circles
        var defs2 = document.createElementNS(SVG_NS, 'defs');
        var clip = document.createElementNS(SVG_NS, 'clipPath');
        clip.setAttribute('id', 'moonClip' + uid);

        // Full moon circle as clip base
        var clipRect = document.createElementNS(SVG_NS, 'rect');
        clipRect.setAttribute('x', '0'); clipRect.setAttribute('y', '0');
        clipRect.setAttribute('width', s); clipRect.setAttribute('height', s);
        clip.appendChild(clipRect);
        defs2.appendChild(clip);
        svgEl.appendChild(defs2);

        // Moon fill circle
        var opacity = tier === 'crescent' ? '0.6' : (tier === 'half' ? '0.7' : '0.8');
        var fillColor = tier === 'gibbous' ? '#D0D8F0' : '#C8D0E8';
        var moonCircle = document.createElementNS(SVG_NS, 'circle');
        moonCircle.setAttribute('cx', cx);
        moonCircle.setAttribute('cy', cy);
        moonCircle.setAttribute('r', r);
        moonCircle.setAttribute('fill', fillColor);
        moonCircle.setAttribute('opacity', opacity);
        svgEl.appendChild(moonCircle);

        // Cutout circle — shifted right to create crescent shape
        var cutoutShift;
        if (tier === 'crescent') cutoutShift = r * 0.55;      // large cutout → thin crescent
        else if (tier === 'half') cutoutShift = r * 1.0;       // half cutout → half moon
        else cutoutShift = r * 1.5;                            // small cutout → mostly full

        var cutout = document.createElementNS(SVG_NS, 'circle');
        cutout.setAttribute('cx', cx + cutoutShift);
        cutout.setAttribute('cy', cy);
        cutout.setAttribute('r', r * 0.92);
        cutout.setAttribute('fill', 'var(--bg-primary, #FAFAF5)');
        cutout.classList.add('moon-cutout');
        svgEl.appendChild(cutout);

        return svgEl;
    }

    function createMoonItem(prayer, streaks, index) {
        var current = streaks.current[prayer.id] || 0;
        var best = streaks.best[prayer.id] || 0;
        var tier = getTier(current);
        var cfg = tierConfig[tier];
        var uid = 'moon' + index + '_' + Date.now();
        var currentLang = I18n ? I18n.getCurrentLang() : 'ar';

        var cell = document.createElement('div');
        cell.className = 'moon-item';

        // Zone 1: Moon SVG
        var zoneSvg = document.createElement('div');
        zoneSvg.className = 'moon-zone-svg';

        var moonWrap = document.createElement('div');
        moonWrap.className = 'moon-body-wrap';
        if (cfg.glowAnim) moonWrap.classList.add(cfg.glowAnim);
        if (cfg.floatAnim) moonWrap.classList.add(cfg.floatAnim);
        // Vary animation delay per moon
        var delays = [0, 0.3, 0.6, 0.9, 1.2];
        moonWrap.style.animationDelay = delays[index % 5] + 's';

        var svgEl = buildMoonSVG(tier, cfg, uid);
        moonWrap.appendChild(svgEl);
        zoneSvg.appendChild(moonWrap);
        cell.appendChild(zoneSvg);

        // Zone 2: Current streak number
        var zoneNum = document.createElement('div');
        zoneNum.className = 'moon-zone-num';
        var numColor;
        if (tier === 'new') {
            numColor = 'var(--danger, #C1574E)';
        } else if (tier === 'full') {
            numColor = 'var(--accent, #D4A03C)';
        } else {
            numColor = prayer.color;
        }
        var fontSize = getDynamicFontSize(current);
        zoneNum.innerHTML = '<span class="moon-current-num" style="font-size:' + fontSize + ';font-weight:800;font-family:Rubik,sans-serif;line-height:1;color:' + numColor + ';">' + current + '</span>';
        cell.appendChild(zoneNum);

        // Zone 3: Best streak
        var zoneBest = document.createElement('div');
        zoneBest.className = 'moon-zone-best';
        var isRecord = current > 0 && current === best;
        var bestColor = isRecord ? 'var(--accent, #D4A03C)' : '#6B7280';
        var bestPrefix = isRecord ? '\uD83C\uDFC6 ' : '';
        var bestLabel = currentLang === 'ar' ? '\u0627\u0644\u0623\u0641\u0636\u0644' : 'Best';
        zoneBest.innerHTML = '<span class="moon-best-num" style="font-size:9px;font-weight:600;color:' + bestColor + ';white-space:nowrap;">' + bestPrefix + bestLabel + ' ' + best + '</span>';
        cell.appendChild(zoneBest);

        // Zone 4: Prayer icon
        var zoneIcon = document.createElement('div');
        zoneIcon.className = 'moon-zone-icon';
        var grad = gradients[prayer.color] || ('linear-gradient(135deg, ' + prayer.color + ', ' + prayer.color + ')');
        zoneIcon.innerHTML = '<div style="width:28px;height:28px;border-radius:8px;background:' + grad + ';display:flex;align-items:center;justify-content:center;">' +
            '<span class="material-symbols-rounded" style="font-size:14px;color:#fff;font-variation-settings:\'FILL\' 1,\'wght\' 500;">' + prayer.icon + '</span></div>';
        cell.appendChild(zoneIcon);

        // Zone 5: Prayer name
        var zoneName = document.createElement('div');
        zoneName.className = 'moon-zone-name';
        var nameColor = tier === 'full' ? 'var(--accent)' : 'var(--text-secondary)';
        var prayerName = I18n ? I18n.getPrayerName(prayer.id) : prayer.name;
        zoneName.innerHTML = '<span class="moon-prayer-name" style="font-size:11px;font-weight:700;color:' + nameColor + ';font-family:\'Noto Kufi Arabic\',sans-serif;">' + prayerName + '</span>';
        cell.appendChild(zoneName);

        return cell;
    }

    function renderMoonSection(container) {
        if (!container) return;
        container.innerHTML = '';

        var streaks = getStreaks();
        var prayers = Config.fardPrayers;

        // Moons row
        var row = document.createElement('div');
        row.className = 'moons-row';
        for (var i = 0; i < prayers.length; i++) {
            row.appendChild(createMoonItem(prayers[i], streaks, i));
        }
        container.appendChild(row);
    }

    // ==================== SUNNAH STREAK CALCULATION ====================

    var SUNNAH_STREAK_KEY_PREFIX = 'salah_sunnah_streaks_';
    var _sunnahMonthCache = {};
    var _sunnahMonthExists = {};

    function getSunnahStreakKey() {
        return SUNNAH_STREAK_KEY_PREFIX + Storage.getProfilePrefix().replace(/_$/, '');
    }

    function _getSunnahMonthData(hYear, hMonth) {
        var cacheKey = hYear + '_' + hMonth;
        if (_sunnahMonthCache[cacheKey]) return _sunnahMonthCache[cacheKey];
        var sunnahKey = Storage.getStorageKey('sunnah', hMonth, hYear);
        var stored = localStorage.getItem(sunnahKey);
        _sunnahMonthExists[cacheKey] = !!stored;
        _sunnahMonthCache[cacheKey] = stored ? JSON.parse(stored) : {};
        return _sunnahMonthCache[cacheKey];
    }

    function isSunnahDayPrayed(prayerId, hYear, hMonth, hDay) {
        var data = _getSunnahMonthData(hYear, hMonth);
        var dayStr = String(hDay);
        return !!(data[prayerId] && data[prayerId][dayStr]);
    }

    function isSunnahDayExempt(hYear, hMonth, hDay) {
        if (!_isFemale) return false;
        var exemptData = _getExemptData(hYear, hMonth);
        if (!exemptData) return false;
        var dayStr = String(hDay);
        return !!(exemptData[dayStr] && Object.keys(exemptData[dayStr]).length > 0);
    }

    function _hasNoSunnahDataForMonth(hYear, hMonth) {
        var cacheKey = hYear + '_' + hMonth;
        _getSunnahMonthData(hYear, hMonth);
        return !_sunnahMonthExists[cacheKey];
    }

    function calculateSunnahCurrentStreak(prayerId) {
        var today = new Date();
        var checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
        var todayH = Hijri.gregorianToHijri(checkDate);
        var startFromToday = false;
        var maxDays = Hijri.getHijriDaysInMonth(todayH.year, todayH.month);
        if (todayH.day <= maxDays) {
            startFromToday = isSunnahDayPrayed(prayerId, todayH.year, todayH.month, todayH.day);
        }
        if (!startFromToday) {
            checkDate = new Date(checkDate.getTime() - 86400000);
        }
        var currentStreak = 0;
        var emptyMonthCount = 0;
        for (var i = 0; i < 730; i++) {
            var hDate = Hijri.gregorianToHijri(checkDate);
            var daysInMonth = Hijri.getHijriDaysInMonth(hDate.year, hDate.month);
            if (hDate.day > daysInMonth) { checkDate = new Date(checkDate.getTime() - 86400000); continue; }
            if (hDate.day === 1 || i === 0) {
                if (_hasNoSunnahDataForMonth(hDate.year, hDate.month)) {
                    emptyMonthCount++;
                    if (emptyMonthCount >= 2) break;
                } else { emptyMonthCount = 0; }
            }
            if (isSunnahDayExempt(hDate.year, hDate.month, hDate.day)) {
                checkDate = new Date(checkDate.getTime() - 86400000);
                continue;
            }
            if (isSunnahDayPrayed(prayerId, hDate.year, hDate.month, hDate.day)) {
                currentStreak++;
                checkDate = new Date(checkDate.getTime() - 86400000);
            } else { break; }
        }
        return currentStreak;
    }

    function calculateSunnahBestStreak(prayerId) {
        var today = new Date();
        var todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
        var currentHijriYear = Hijri.getCurrentHijriYear();
        var scanStartG = Hijri.hijriToGregorianDay1(currentHijriYear, 1);
        var scanDate = new Date(scanStartG.getFullYear(), scanStartG.getMonth(), scanStartG.getDate(), 12, 0, 0);
        var bestStreak = 0;
        var tempStreak = 0;
        while (scanDate <= todayNoon) {
            var hScan = Hijri.gregorianToHijri(scanDate);
            var daysInMonth = Hijri.getHijriDaysInMonth(hScan.year, hScan.month);
            if (hScan.day > daysInMonth) { scanDate = new Date(scanDate.getTime() + 86400000); continue; }
            if (isSunnahDayExempt(hScan.year, hScan.month, hScan.day)) { scanDate = new Date(scanDate.getTime() + 86400000); continue; }
            if (isSunnahDayPrayed(prayerId, hScan.year, hScan.month, hScan.day)) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else { tempStreak = 0; }
            scanDate = new Date(scanDate.getTime() + 86400000);
        }
        return bestStreak;
    }

    function calculateAllSunnahStreaks() {
        _sunnahMonthCache = {};
        _sunnahMonthExists = {};
        _exemptCache = {};
        var profile = Storage.getActiveProfile();
        _isFemale = !!(profile && profile.gender === 'female' && profile.age >= 12);
        var prayers = Config.sunnahPrayers;
        var result = { current: {}, best: {} };
        var todayH = Hijri.getTodayHijri();
        prayers.forEach(function(prayer) {
            result.current[prayer.id] = calculateSunnahCurrentStreak(prayer.id);
            result.best[prayer.id] = calculateSunnahBestStreak(prayer.id);
            if (result.current[prayer.id] > result.best[prayer.id]) {
                result.best[prayer.id] = result.current[prayer.id];
            }
        });
        result.lastCalculated = todayH.year + '-' + todayH.month + '-' + todayH.day;
        try { localStorage.setItem(getSunnahStreakKey(), JSON.stringify(result)); } catch(e) {}
        return result;
    }

    // ==================== SUNNAH STREAK CHIPS RENDERING ====================

    function renderSunnahStreakChips(container) {
        if (!container) return;
        container.innerHTML = '';
        var streaks = calculateAllSunnahStreaks();
        var prayers = Config.sunnahPrayers;
        var currentLang = I18n ? I18n.getCurrentLang() : 'ar';

        var chipsWrap = document.createElement('div');
        chipsWrap.className = 'sunnah-streak-chips';

        prayers.forEach(function(prayer) {
            var current = streaks.current[prayer.id] || 0;
            var best = streaks.best[prayer.id] || 0;
            var isTopStreak = current > 0 && current === best && best > 0;
            var isZero = current === 0;

            var chip = document.createElement('div');
            chip.className = 'sunnah-streak-chip';
            if (isTopStreak) chip.classList.add('top-streak');
            if (isZero) chip.classList.add('zero-streak');

            var iconGrad = gradients[prayer.color] || ('linear-gradient(135deg, ' + prayer.color + ', ' + prayer.color + ')');
            var iconDiv = document.createElement('div');
            iconDiv.className = 'sunnah-streak-icon';
            iconDiv.style.background = iconGrad;
            iconDiv.innerHTML = '<span class="material-symbols-rounded" style="font-size:12px;color:#fff;font-variation-settings:\'FILL\' 1,\'wght\' 500;">' + prayer.icon + '</span>';

            var infoDiv = document.createElement('div');
            infoDiv.className = 'sunnah-streak-info';
            var prayerName = I18n ? I18n.getPrayerName(prayer.id) : prayer.name;
            var nameEl = document.createElement('div');
            nameEl.className = 'sunnah-streak-name';
            if (isTopStreak) nameEl.style.color = 'var(--accent, #D4A03C)';
            nameEl.textContent = prayerName;

            var bestEl = document.createElement('div');
            bestEl.className = 'sunnah-streak-best';
            var bestPrefix = isTopStreak ? '\uD83C\uDFC6 ' : '';
            var bestLabel = currentLang === 'ar' ? '\u0627\u0644\u0623\u0641\u0636\u0644' : 'Best';
            if (isTopStreak) bestEl.style.color = 'var(--accent, #D4A03C)';
            bestEl.textContent = bestPrefix + bestLabel + ' ' + best;

            infoDiv.appendChild(nameEl);
            infoDiv.appendChild(bestEl);

            var numDiv = document.createElement('div');
            numDiv.className = 'sunnah-streak-num';
            if (isTopStreak) numDiv.style.color = 'var(--accent, #D4A03C)';
            if (isZero) numDiv.style.color = 'var(--danger, #C1574E)';
            numDiv.textContent = current;

            chip.appendChild(iconDiv);
            chip.appendChild(infoDiv);
            chip.appendChild(numDiv);
            chipsWrap.appendChild(chip);
        });

        container.appendChild(chipsWrap);

        var legend = document.createElement('div');
        legend.className = 'sunnah-streak-legend';
        var currentLabel = currentLang === 'ar' ? '\u0627\u0644\u062D\u0627\u0644\u064A\u0629' : 'Current';
        var bestLabel2 = currentLang === 'ar' ? '\u0627\u0644\u0623\u0641\u0636\u0644' : 'Best';
        legend.innerHTML = '<span style="color:var(--text-primary);font-size:10px;font-weight:700;">\u25CF ' + currentLabel + '</span>' +
            '<span style="color:var(--text-muted);font-size:10px;">\u2014 ' + bestLabel2 + '</span>';
        container.appendChild(legend);
    }

    return {
        calculateCurrentStreak: calculateCurrentStreak,
        calculateBestStreak: calculateBestStreak,
        calculateAllStreaks: calculateAllStreaks,
        getStreaks: getStreaks,
        renderMoonSection: renderMoonSection,
        renderSunnahStreakChips: renderSunnahStreakChips
    };
})();
