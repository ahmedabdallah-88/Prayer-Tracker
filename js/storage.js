window.App = window.App || {};
window.App.Storage = (function() {
    // State variables
    var currentYear, currentMonth;
    var fardData = {}, sunnahData = {};
    var charts = { fard: {}, sunnah: {}, fasting: null, fardCong: null, fardWeekly: null, fardHeatmap: null };
    var currentSection = 'fard';
    var activeProfile = null;

    // ==================== KEY GENERATION ====================

    function getProfilePrefix() {
        return activeProfile ? activeProfile.id + '_' : '';
    }

    // MERGED: combines original getStorageKey with profile-prefix override
    function getStorageKey(type, month, year) {
        var prefix = getProfilePrefix();
        return 'salah_tracker_' + prefix + type + '_h' + year + '_' + month;
    }

    function getCongregationKey(year, month) {
        return 'salah_cong_' + getProfilePrefix() + 'h' + year + '_' + month;
    }

    function getQadaKey(year, month) {
        return 'salah_qada_' + getProfilePrefix() + 'h' + year + '_' + month;
    }

    function getExemptKey(year, month) {
        return 'salah_exempt_' + getProfilePrefix() + 'h' + year + '_' + month;
    }

    function getFastingKey(year) {
        return 'salah_fasting_' + getProfilePrefix() + 'h' + year;
    }

    function getVolFastingKey(year, month) {
        return 'salah_volfasting_' + getProfilePrefix() + 'h' + year + '_' + month;
    }

    function getAzkarKey(year, month) {
        return 'salah_azkar_' + getProfilePrefix() + 'h' + year + '_' + month;
    }

    // ==================== DATA ACCESS ====================

    function getDataObject(type) {
        return type === 'fard' ? fardData : sunnahData;
    }

    function getPrayersArray(type) {
        return type === 'fard' ? window.App.Config.fardPrayers : window.App.Config.sunnahPrayers;
    }

    function getDaysInMonth(month, year) {
        // Safety: if year looks Gregorian (>2000), convert to Hijri first
        if (year > 2000) {
            try {
                var midDate = new Date(year, month - 1, 15);
                var h = window.App.Hijri.gregorianToHijri(midDate);
                console.warn('getDaysInMonth called with Gregorian year ' + year + ', converting to Hijri ' + h.year + '/' + h.month);
                return window.App.Hijri.getHijriDaysInMonth(h.year, h.month);
            } catch(e) {}
        }
        return window.App.Hijri.getHijriDaysInMonth(year, month);
    }

    function isFutureDate(day, month, year) {
        // Now compares in Hijri
        return window.App.Hijri.isFutureDateHijri(day, month, year);
    }

    function loadAllData(type, year) {
        var dataObj = type === 'fard' ? fardData : sunnahData;
        var prayers = getPrayersArray(type);
        var loadYear = year || currentYear;

        for (var month = 1; month <= 12; month++) {
            var key = getStorageKey(type, month, loadYear);
            var stored = localStorage.getItem(key);
            if (stored) {
                dataObj[month] = JSON.parse(stored);
            } else {
                dataObj[month] = {};
                prayers.forEach(function(prayer) {
                    dataObj[month][prayer.id] = {};
                });
            }
        }
    }

    function saveMonthData(type, month) {
        var dataObj = getDataObject(type);
        var key = getStorageKey(type, month, currentYear);
        try {
            localStorage.setItem(key, JSON.stringify(dataObj[month]));
        } catch(e) {
            if (window.App.UI && window.App.UI.showToast) window.App.UI.showToast('Storage full', 'error');
            console.error('Storage full:', e);
        }
    }

    function getMonthStats(type, month, year) {
        var dataObj = getDataObject(type);
        var prayers = getPrayersArray(type);
        var daysInMonth = getDaysInMonth(month, year);
        var isFemale = activeProfile && activeProfile.gender === 'female' && activeProfile.age >= 12;
        var Female = window.App.Female;
        var exemptData = (isFemale && Female) ? Female.getExemptDays(year, month) : {};
        var completed = 0;
        var total = 0;

        prayers.forEach(function(prayer) {
            var exemptCount = (isFemale && Female) ? Female.getExemptCountForPrayer(year, month, prayer.id) : 0;
            total += daysInMonth - exemptCount;
            if (dataObj[month] && dataObj[month][prayer.id]) {
                completed += Object.values(dataObj[month][prayer.id]).filter(function(v) { return v; }).length;
            }
        });

        return {
            completed: completed,
            total: total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    function getYearStats(type, year) {
        var totalCompleted = 0;
        var totalPossible = 0;

        for (var month = 1; month <= 12; month++) {
            var stats = getMonthStats(type, month, year);
            totalCompleted += stats.completed;
            totalPossible += stats.total;
        }

        return {
            completed: totalCompleted,
            total: totalPossible,
            percentage: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0
        };
    }

    // ==================== CONGREGATION DATA ====================

    function getCongregationData(year, month) {
        var stored = localStorage.getItem(getCongregationKey(year, month));
        return stored ? JSON.parse(stored) : {};
    }

    function saveCongregationData(year, month, data) {
        try { localStorage.setItem(getCongregationKey(year, month), JSON.stringify(data)); }
        catch(e) { if (window.App.UI && window.App.UI.showToast) window.App.UI.showToast('Storage full', 'error'); }
    }

    // ==================== QADA DATA ====================

    function getQadaData(year, month) {
        var stored = localStorage.getItem(getQadaKey(year, month));
        return stored ? JSON.parse(stored) : {};
    }

    function saveQadaData(year, month, data) {
        try { localStorage.setItem(getQadaKey(year, month), JSON.stringify(data)); }
        catch(e) { if (window.App.UI && window.App.UI.showToast) window.App.UI.showToast('Storage full', 'error'); }
    }

    // ==================== FASTING DATA ====================

    function getFastingData(year) {
        var stored = localStorage.getItem(getFastingKey(year));
        return stored ? JSON.parse(stored) : {};
    }

    function saveFastingData(year, data) {
        try { localStorage.setItem(getFastingKey(year), JSON.stringify(data)); }
        catch(e) { if (window.App.UI && window.App.UI.showToast) window.App.UI.showToast('Storage full', 'error'); }
    }

    // ==================== VOLUNTARY FASTING DATA ====================

    function getVolFastingData(year, month) {
        var stored = localStorage.getItem(getVolFastingKey(year, month));
        return stored ? JSON.parse(stored) : {};
    }

    function saveVolFastingData(year, month, data) {
        try { localStorage.setItem(getVolFastingKey(year, month), JSON.stringify(data)); }
        catch(e) { if (window.App.UI && window.App.UI.showToast) window.App.UI.showToast('Storage full', 'error'); }
    }

    // ==================== STORAGE QUOTA CHECK ====================

    function checkStorageQuota() {
        try {
            var total = 0;
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                total += key.length + (localStorage.getItem(key) || '').length;
            }
            // Warn if estimated usage > 4.5MB (typical 5MB limit)
            var remaining = (5 * 1024 * 1024) - (total * 2); // *2 for UTF-16
            if (remaining < 500 * 1024) {
                var lang = (window.App.I18n && window.App.I18n.getCurrentLang()) || 'ar';
                var msg = lang === 'ar'
                    ? '\u062a\u062d\u0630\u064a\u0631: \u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0634\u0627\u0631\u0641\u062a \u0639\u0644\u0649 \u0627\u0644\u0627\u0645\u062a\u0644\u0627\u0621. \u0642\u0645 \u0628\u062a\u0635\u062f\u064a\u0631 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0643\u0646\u0633\u062e\u0629 \u0627\u062d\u062a\u064a\u0627\u0637\u064a\u0629.'
                    : 'Warning: Storage is nearly full. Please export your data as a backup.';
                setTimeout(function() {
                    if (window.App.UI && window.App.UI.showToast) {
                        window.App.UI.showToast(msg, 'warning', 5000);
                    }
                }, 3000);
            }
        } catch(e) {}
    }

    // ==================== DATA INTEGRITY CHECK ====================

    function validateDataIntegrity() {
        try {
            var profilesStored = localStorage.getItem('salah_profiles');
            if (!profilesStored) return;
            var profiles = JSON.parse(profilesStored);
            var profileIds = {};
            profiles.forEach(function(p) { profileIds[p.id] = true; });

            var orphanCount = 0;
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (!key || key.indexOf('salah_') !== 0) continue;
                // Extract profile ID from key patterns like salah_tracker_PROFILEID_...
                var match = key.match(/^salah_(?:tracker|cong|exempt|qada|fasting|volfasting|azkar|prayer_streaks|hijri_days|hijri_overrides|qada_log|qada_plan|period_history|sunnah_streaks)_([a-zA-Z0-9]+)_/);
                if (match && match[1] && !profileIds[match[1]] && match[1] !== 'h' && match[1] !== 'fard' && match[1] !== 'sunnah') {
                    orphanCount++;
                    console.warn('[STORAGE] Orphaned key (profile "' + match[1] + '" not found):', key);
                }
            }
            if (orphanCount > 0) {
                console.warn('[STORAGE] Found ' + orphanCount + ' orphaned localStorage keys');
            }
        } catch(e) {
            console.error('[STORAGE] Integrity check error:', e);
        }
    }

    // ==================== BASE INIT ====================

    function init() {
        var todayH = window.App.Hijri.getTodayHijri();
        currentMonth = todayH.month;
        currentYear = todayH.year;

        loadAllData('fard');
        loadAllData('sunnah');

        checkStorageQuota();
        validateDataIntegrity();
    }

    // ==================== PUBLIC API ====================

    return {
        // State getters/setters
        getCurrentYear: function() { return currentYear; },
        setCurrentYear: function(y) { currentYear = y; },
        getCurrentMonth: function() { return currentMonth; },
        setCurrentMonth: function(m) { currentMonth = m; },
        getFardData: function() { return fardData; },
        getSunnahData: function() { return sunnahData; },
        getCharts: function() { return charts; },
        getCurrentSection: function() { return currentSection; },
        setCurrentSection: function(s) { currentSection = s; },
        getActiveProfile: function() { return activeProfile; },
        setActiveProfile: function(p) { activeProfile = p; },

        // Functions
        getProfilePrefix: getProfilePrefix,
        getStorageKey: getStorageKey,
        getCongregationKey: getCongregationKey,
        getQadaKey: getQadaKey,
        getExemptKey: getExemptKey,
        getFastingKey: getFastingKey,
        getVolFastingKey: getVolFastingKey,
        getAzkarKey: getAzkarKey,
        getDataObject: getDataObject,
        getPrayersArray: getPrayersArray,
        loadAllData: loadAllData,
        saveMonthData: saveMonthData,
        getDaysInMonth: getDaysInMonth,
        isFutureDate: isFutureDate,
        getMonthStats: getMonthStats,
        getYearStats: getYearStats,
        getCongregationData: getCongregationData,
        saveCongregationData: saveCongregationData,
        getQadaData: getQadaData,
        saveQadaData: saveQadaData,
        getFastingData: getFastingData,
        saveFastingData: saveFastingData,
        getVolFastingData: getVolFastingData,
        saveVolFastingData: saveVolFastingData,
        checkStorageQuota: checkStorageQuota,
        validateDataIntegrity: validateDataIntegrity,
        init: init
    };
})();

// Backward compat globals
window.getStorageKey = window.App.Storage.getStorageKey;
window.getCongregationKey = window.App.Storage.getCongregationKey;
window.getQadaKey = window.App.Storage.getQadaKey;
window.getExemptKey = window.App.Storage.getExemptKey;
