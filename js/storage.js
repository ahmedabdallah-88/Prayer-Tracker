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
        var used = 0;
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                var val = localStorage.getItem(key);
                if (key && val) {
                    used += key.length + val.length;
                }
            }
        } catch(e) {
            return { usedKB: 0, remainingKB: 0, percentUsed: 0 };
        }
        // localStorage is typically 5MB (~5,242,880 chars at 2 bytes each, but length counts chars)
        var totalChars = 5 * 1024 * 1024; // 5MB in chars
        var usedKB = Math.round(used / 1024);
        var totalKB = Math.round(totalChars / 1024);
        var remainingKB = Math.max(0, totalKB - usedKB);
        var percentUsed = Math.round((used / totalChars) * 100);
        return { usedKB: usedKB, remainingKB: remainingKB, percentUsed: percentUsed };
    }

    // ==================== DATA INTEGRITY CHECK ====================

    function validateDataIntegrity() {
        var profilesRaw = localStorage.getItem('salah_profiles');
        if (!profilesRaw) return;
        var profiles;
        try { profiles = JSON.parse(profilesRaw); } catch(e) { return; }
        if (!Array.isArray(profiles)) return;

        var validIds = {};
        for (var i = 0; i < profiles.length; i++) {
            if (profiles[i].id) validIds[profiles[i].id] = true;
        }

        var orphanCount = 0;
        for (var k = 0; k < localStorage.length; k++) {
            var key = localStorage.key(k);
            if (key.indexOf('salah_') !== 0) continue;
            // Keys with profile ID: salah_tracker_{id}_fard_h... or salah_cong_{id}_h...
            var match = key.match(/^salah_(?:tracker|cong|exempt|qada|fasting|volfasting|azkar|prayer_streaks|sunnah_streaks|jamaah_streaks)_(p_[^_]+_[^_]+)_/);
            if (match && match[1]) {
                if (!validIds[match[1]]) {
                    console.warn('Orphaned key (profile "' + match[1] + '" not found):', key);
                    orphanCount++;
                }
            }
        }
        if (orphanCount > 0) {
            console.warn('Found ' + orphanCount + ' orphaned localStorage keys');
        }
    }

    // ==================== BASE INIT ====================

    function init() {
        var todayH = window.App.Hijri.getTodayHijri();
        currentMonth = todayH.month;
        currentYear = todayH.year;

        loadAllData('fard');
        loadAllData('sunnah');
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

// Backward compat globals (DEPRECATED — use window.App.Storage.*)
window.getStorageKey = window.App.Storage.getStorageKey;           // DEPRECATED
window.getCongregationKey = window.App.Storage.getCongregationKey; // DEPRECATED
window.getQadaKey = window.App.Storage.getQadaKey;                 // DEPRECATED
window.getExemptKey = window.App.Storage.getExemptKey;             // DEPRECATED
