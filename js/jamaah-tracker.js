/* Prayer Tracker PWA — jamaah-tracker.js */
window.App = window.App || {};
window.App.Jamaah = (function() {

    var congregationMode = false;

    function toggleCongregation(prayerId, day) {
        var Storage = window.App.Storage;
        var currentYear = Storage.getCurrentYear();
        var currentMonth = Storage.getCurrentMonth();
        var data = Storage.getCongregationData(currentYear, currentMonth);
        if (!data[prayerId]) data[prayerId] = {};
        data[prayerId][day] = !data[prayerId][day];
        if (!data[prayerId][day]) delete data[prayerId][day];
        if (Object.keys(data[prayerId]).length === 0) delete data[prayerId];
        Storage.saveCongregationData(currentYear, currentMonth, data);
        invalidateCache();
        if (typeof window.renderTrackerMonth === 'function') window.renderTrackerMonth('fard');
        updateCongregationStats();
        renderStreaks('fard');
    }

    function isCongregation(congData, prayerId, day) {
        return congData[prayerId] && congData[prayerId][day];
    }

    function updateCongregationStats() {
        var container = document.getElementById('fardCongStats');
        if (!container) return;

        var Storage = window.App.Storage;
        var I18n = window.App.I18n;
        var currentYear = Storage.getCurrentYear();
        var currentMonth = Storage.getCurrentMonth();
        var congData = Storage.getCongregationData(currentYear, currentMonth);
        var dataObj = Storage.getDataObject('fard');
        var prayers = Storage.getPrayersArray('fard');

        var totalCompleted = 0, totalCong = 0;
        prayers.forEach(function(prayer) {
            if (dataObj[currentMonth] && dataObj[currentMonth][prayer.id]) {
                var completedDays = Object.keys(dataObj[currentMonth][prayer.id]).filter(function(d) { return dataObj[currentMonth][prayer.id][d]; });
                totalCompleted += completedDays.length;
                completedDays.forEach(function(d) {
                    if (isCongregation(congData, prayer.id, parseInt(d))) totalCong++;
                });
            }
        });

        var totalAlone = totalCompleted - totalCong;
        var congRate = totalCompleted > 0 ? Math.round((totalCong / totalCompleted) * 100) : 0;

        container.innerHTML =
            '<span class="cong-stat mosque"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">mosque</span> ' + I18n.t('congregation') + ': ' + totalCong + ' (' + congRate + '%)</span>' +
            '<span class="cong-stat alone"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">person</span> ' + I18n.t('individual') + ': ' + totalAlone + '</span>';
    }

    // ==================== DATA CACHE (no global state mutation) ====================
    // Keyed by 'year_month'. Avoids calling Storage.setCurrentYear/loadAllData.
    var _congCache = {};
    var _sunnahCache = {};

    function _getCongMonth(hYear, hMonth) {
        var cacheKey = hYear + '_' + hMonth;
        if (_congCache[cacheKey]) return _congCache[cacheKey];
        var key = window.App.Storage.getCongregationKey(hYear, hMonth);
        var raw = localStorage.getItem(key);
        _congCache[cacheKey] = raw ? JSON.parse(raw) : {};
        return _congCache[cacheKey];
    }

    function _getSunnahMonth(hYear, hMonth) {
        var cacheKey = hYear + '_' + hMonth;
        if (_sunnahCache[cacheKey]) return _sunnahCache[cacheKey];
        var key = window.App.Storage.getStorageKey('sunnah', hMonth, hYear);
        var raw = localStorage.getItem(key);
        _sunnahCache[cacheKey] = raw ? JSON.parse(raw) : {};
        return _sunnahCache[cacheKey];
    }

    function _clearDataCache() {
        _congCache = {};
        _sunnahCache = {};
    }

    // ==================== RESULT CACHE ====================
    // Avoids recalculating on every dashboard render within the same day/profile.
    var _streakResults = null;
    var _streakResultsKey = null; // 'day_month_year_profileId_type'

    function invalidateCache() {
        _streakResults = null;
        _streakResultsKey = null;
        _clearDataCache();
    }

    // ==================== STREAK CALCULATOR ====================

    function calculateStreak(type, prayerId) {
        var Hijri = window.App.Hijri;
        var today = new Date();
        var currentStreak = 0;
        var bestStreak = 0;
        var tempStreak = 0;

        var checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
        var todayH = Hijri.gregorianToHijri(checkDate);

        function isOverflowDay(hYear, hMonth, hDay) {
            var maxDays = Hijri.getHijriDaysInMonth(hYear, hMonth);
            return hDay > maxDays;
        }

        function isDayChecked(hYear, hMonth, hDay) {
            if (hDay < 1) return false;
            if (type === 'sunnah') {
                var sData = _getSunnahMonth(hYear, hMonth);
                return sData && sData[prayerId] && sData[prayerId][hDay];
            }
            var congData = _getCongMonth(hYear, hMonth);
            return congData && congData[prayerId] && (congData[prayerId][String(hDay)] === true || congData[prayerId][hDay] === true);
        }

        var startFromToday = false;
        if (!isOverflowDay(todayH.year, todayH.month, todayH.day)) {
            startFromToday = isDayChecked(todayH.year, todayH.month, todayH.day);
        }

        if (!startFromToday) {
            checkDate = new Date(checkDate.getTime() - 86400000);
        }

        for (var i = 0; i < 730; i++) {
            var hDate = Hijri.gregorianToHijri(checkDate);
            if (isOverflowDay(hDate.year, hDate.month, hDate.day)) {
                checkDate = new Date(checkDate.getTime() - 86400000);
                continue;
            }
            if (isDayChecked(hDate.year, hDate.month, hDate.day)) {
                currentStreak++;
                checkDate = new Date(checkDate.getTime() - 86400000);
            } else {
                break;
            }
        }

        var currentHijriYear = Hijri.getCurrentHijriYear();
        var scanStartG = Hijri.hijriToGregorianDay1(currentHijriYear, 1);
        var todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
        var scanDate = new Date(scanStartG.getFullYear(), scanStartG.getMonth(), scanStartG.getDate(), 12, 0, 0);

        while (scanDate <= todayNoon) {
            var hScan = Hijri.gregorianToHijri(scanDate);
            if (isOverflowDay(hScan.year, hScan.month, hScan.day)) {
                scanDate = new Date(scanDate.getTime() + 86400000);
                continue;
            }
            if (isDayChecked(hScan.year, hScan.month, hScan.day)) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
            scanDate = new Date(scanDate.getTime() + 86400000);
        }

        return { current: currentStreak, best: bestStreak };
    }

    function _getResultCacheKey(type) {
        var Hijri = window.App.Hijri;
        var todayH = Hijri.gregorianToHijri(new Date());
        var Storage = window.App.Storage;
        var profile = Storage.getActiveProfile();
        var pid = profile ? profile.id : '';
        return todayH.day + '_' + todayH.month + '_' + todayH.year + '_' + pid + '_' + type;
    }

    function getAllStreaks(type) {
        var key = _getResultCacheKey(type);
        if (_streakResults && _streakResultsKey === key) {
            return _streakResults;
        }
        _clearDataCache();
        var prayers = window.App.Storage.getPrayersArray(type);
        var results = {};
        for (var i = 0; i < prayers.length; i++) {
            results[prayers[i].id] = calculateStreak(type, prayers[i].id);
        }
        _streakResults = results;
        _streakResultsKey = key;
        return results;
    }

    function renderStreaks(type) {
        var I18n = window.App.I18n;
        var grid = document.getElementById(type + 'StreakGrid');
        if (!grid) return;
        grid.innerHTML = '';

        var prayers = window.App.Storage.getPrayersArray(type);
        var isFard = (type === 'fard');
        var currentLang = I18n.getCurrentLang();
        var allStreaks = getAllStreaks(type);

        prayers.forEach(function(prayer) {
            var streak = allStreaks[prayer.id] || { current: 0, best: 0 };

            var card = document.createElement('div');
            card.className = 'streak-card' + (streak.current >= 7 ? ' high-streak' : '');

            var fireEmoji = streak.current >= 7 ? '<span class="material-symbols-rounded" style="font-size:20px;color:var(--danger, #ea580c);">local_fire_department</span>' :
                          streak.current >= 3 ? '<span class="material-symbols-rounded" style="font-size:20px;color:var(--accent, #d97706);">bolt</span>' :
                          streak.current >= 1 ? '<span class="material-symbols-rounded" style="font-size:20px;color:var(--primary-mid, #65a30d);">auto_awesome</span>' : '<span class="material-symbols-rounded" style="font-size:20px;color:var(--text-muted, #9ca3af);">bedtime</span>';

            var isOnFire = streak.current >= 3;

            var streakLabel = isFard
                ? (currentLang === 'ar' ? 'أيام جماعة متتابعة' : 'Consecutive congregation days')
                : I18n.t('consecutive_days');
            var bestLabel = isFard
                ? (currentLang === 'ar' ? 'أفضل سلسلة جماعة:' : 'Best congregation streak:')
                : I18n.t('best_streak');

            card.innerHTML =
                '<div class="streak-prayer-name">' +
                    '<span class="material-symbols-rounded" style="font-size:18px;">' + prayer.icon + '</span>' +
                    '<span>' + I18n.getPrayerName(prayer.id) + '</span>' +
                '</div>' +
                '<div class="streak-value ' + (isOnFire ? 'fire' : '') + '">' + fireEmoji + ' ' + streak.current + '</div>' +
                '<div class="streak-label">' + streakLabel + '</div>' +
                '<div class="streak-best">' + bestLabel + ' ' + streak.best + ' ' + I18n.t('days_word') + '</div>';

            grid.appendChild(card);
        });
    }

    function getCongregationMode() {
        return congregationMode;
    }

    function setCongregationMode(val) {
        congregationMode = val;
    }

    return {
        getCongregationMode: getCongregationMode,
        setCongregationMode: setCongregationMode,
        toggleCongregation: toggleCongregation,
        isCongregation: isCongregation,
        updateCongregationStats: updateCongregationStats,
        calculateStreak: calculateStreak,
        getAllStreaks: getAllStreaks,
        invalidateCache: invalidateCache,
        renderStreaks: renderStreaks
    };
})();

// Backward compat globals (DEPRECATED — use window.App.Jamaah.*)
window.toggleCongregation = window.App.Jamaah.toggleCongregation;       // DEPRECATED
window.isCongregation = window.App.Jamaah.isCongregation;               // DEPRECATED
window.updateCongregationStats = window.App.Jamaah.updateCongregationStats; // DEPRECATED
window.renderStreaks = window.App.Jamaah.renderStreaks;                   // DEPRECATED
window.invalidateJamaahCache = window.App.Jamaah.invalidateCache;        // DEPRECATED
window.congregationMode = false;
