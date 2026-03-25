/* Prayer Tracker PWA — female-features.js */
window.App = window.App || {};
window.App.Female = (function() {

    var exemptMode = { fard: false, sunnah: false };

    // ==================== EXEMPT DAYS (PER PRAYER PER DAY) ====================

    function getExemptDays(year, month) {
        var Storage = window.App.Storage;
        var stored = localStorage.getItem(Storage.getExemptKey(year, month));
        if (!stored) return {};
        var parsed = JSON.parse(stored);
        // Migration: if old format {day: true}, convert to new {day: {allPrayers: true}}
        var firstVal = Object.values(parsed)[0];
        if (typeof firstVal === 'boolean') {
            var newData = {};
            var fardPrayers = window.App.Config.fardPrayers;
            var sunnahPrayers = window.App.Config.sunnahPrayers;
            Object.keys(parsed).forEach(function(day) {
                if (parsed[day]) {
                    newData[day] = {};
                    fardPrayers.forEach(function(p) { newData[day][p.id] = true; });
                    sunnahPrayers.forEach(function(p) { newData[day][p.id] = true; });
                }
            });
            return newData;
        }
        return parsed;
    }

    function saveExemptDays(year, month, data) {
        var Storage = window.App.Storage;
        try { localStorage.setItem(Storage.getExemptKey(year, month), JSON.stringify(data)); }
        catch(e) { window.App.UI.showToast(window.App.I18n.t('storage_full'), 'error'); }
    }

    function toggleExemptMode(type) {
        var chk = document.getElementById(type + 'ExemptMode');
        exemptMode[type] = chk ? chk.checked : false;
        if (typeof window.renderTrackerMonth === 'function') window.renderTrackerMonth(type);
    }

    function toggleExemptPrayer(prayerId, day) {
        var Storage = window.App.Storage;
        var currentYear = Storage.getCurrentYear();
        var currentMonth = Storage.getCurrentMonth();
        var exemptData = getExemptDays(currentYear, currentMonth);
        if (!exemptData[day]) exemptData[day] = {};

        exemptData[day][prayerId] = !exemptData[day][prayerId];

        // Clean up: remove day entry if no prayers are exempt
        if (!Object.values(exemptData[day]).some(function(v) { return v; })) {
            delete exemptData[day];
        }

        saveExemptDays(currentYear, currentMonth, exemptData);
        if (typeof window.renderTrackerMonth === 'function') {
            window.renderTrackerMonth('fard');
            window.renderTrackerMonth('sunnah');
        }
        if (typeof window.updateTrackerStats === 'function') {
            window.updateTrackerStats('fard');
            window.updateTrackerStats('sunnah');
        }
        if (typeof window.renderStreaks === 'function') {
            window.renderStreaks('fard');
            window.renderStreaks('sunnah');
        }
        updateExemptInfo('fard');
        updateExemptInfo('sunnah');
        savePeriodHistory();
    }

    function isPrayerExempt(exemptData, prayerId, day) {
        return exemptData[day] && exemptData[day][prayerId];
    }

    function getExemptCountForPrayer(year, month, prayerId) {
        var exempt = getExemptDays(year, month);
        var count = 0;
        Object.keys(exempt).forEach(function(day) {
            if (exempt[day] && exempt[day][prayerId]) count++;
        });
        return count;
    }

    function updateExemptInfo(type) {
        var info = document.getElementById(type + 'ExemptInfo');
        if (!info) return;
        var activeProfile = window.App.Storage.getActiveProfile();
        if (!activeProfile || activeProfile.gender !== 'female' || activeProfile.age < 12) { info.textContent = ''; return; }

        var Storage = window.App.Storage;
        var exempt = getExemptDays(Storage.getCurrentYear(), Storage.getCurrentMonth());
        // Count total exempt prayer-slots
        var count = 0;
        Object.keys(exempt).forEach(function(day) {
            count += Object.values(exempt[day]).filter(function(v) { return v; }).length;
        });
        // Count unique days that have any exempt
        var uniqueDays = Object.keys(exempt).filter(function(day) {
            return Object.values(exempt[day]).some(function(v) { return v; });
        }).length;
        var currentLang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
        if (count > 0) {
            info.textContent = currentLang === 'ar'
                ? 'صلوات معفاة: ' + count + ' · أيام متأثرة: ' + uniqueDays
                : 'Exempt prayers: ' + count + ' · Affected days: ' + uniqueDays;
        } else {
            info.textContent = '';
        }
    }

    function getExemptCountForMonth(year, month) {
        var exempt = getExemptDays(year, month);
        return Object.keys(exempt).filter(function(day) {
            return Object.values(exempt[day]).some(function(v) { return v; });
        }).length;
    }

    function getExemptMode() {
        return exemptMode;
    }

    // ==================== PERIOD HISTORY ====================

    function savePeriodHistory() {
        var Storage = window.App.Storage;
        var currentYear = Storage.getCurrentYear();
        // Auto-detect periods from exempt days (any day with at least one exempt prayer)
        var periods = [];

        for (var month = 1; month <= 12; month++) {
            var exempt = getExemptDays(currentYear, month);
            var days = Object.keys(exempt).filter(function(d) {
                return Object.values(exempt[d]).some(function(v) { return v; });
            }).map(Number).sort(function(a, b) { return a - b; });

            if (days.length === 0) continue;

            // Group consecutive days
            var start = days[0];
            var end = days[0];

            for (var i = 1; i < days.length; i++) {
                if (days[i] === end + 1) {
                    end = days[i];
                } else {
                    periods.push({ month: month, start: start, end: end, duration: end - start + 1 });
                    start = days[i];
                    end = days[i];
                }
            }
            periods.push({ month: month, start: start, end: end, duration: end - start + 1 });
        }

        localStorage.setItem('salah_periods_' + Storage.getProfilePrefix() + 'h' + currentYear, JSON.stringify(periods));
    }

    function renderPeriodHistory() {
        var container = document.getElementById('periodHistoryContainer');
        if (!container) return;
        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;

        var yearInput = document.getElementById('fastingYearInput');
        var year = yearInput ? (parseInt(yearInput.value) || Storage.getCurrentYear()) : Storage.getCurrentYear();
        var stored = localStorage.getItem('salah_periods_' + Storage.getProfilePrefix() + 'h' + year);
        var periods = stored ? JSON.parse(stored) : [];

        if (periods.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">لا توجد بيانات مسجلة لهذه السنة.<br>حددي أيام الإعفاء من المتتبع الشهري وستظهر هنا تلقائياً.</p>';
            return;
        }

        container.innerHTML = '';
        periods.forEach(function(p) {
            var entry = document.createElement('div');
            entry.className = 'period-entry';
            var monthName = Hijri.getHijriMonthName(p.month - 1);
            entry.innerHTML =
                '<div class="dates"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">calendar_month</span>' + p.start + ' ' + monthName + ' → ' + p.end + ' ' + monthName + ' ' + year + '</div>' +
                '<div class="duration">' + p.duration + ' يوم</div>';
            container.appendChild(entry);
        });
    }

    function renderPeriodHistoryDashboard() {
        var container = document.getElementById('fardPeriodHistoryContainer');
        if (!container) return;
        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;

        var yearInput = document.getElementById('fardDashboardYear');
        var year = yearInput ? (parseInt(yearInput.value) || Storage.getCurrentYear()) : Storage.getCurrentYear();
        var stored = localStorage.getItem('salah_periods_' + Storage.getProfilePrefix() + 'h' + year);
        var periods = stored ? JSON.parse(stored) : [];

        if (periods.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">لا توجد بيانات مسجلة. حددي أيام الإعفاء من المتتبع الشهري.</p>';
            return;
        }

        container.innerHTML = '';
        periods.forEach(function(p) {
            var entry = document.createElement('div');
            entry.className = 'period-entry';
            var monthName = Hijri.getHijriMonthName(p.month - 1);
            entry.innerHTML =
                '<div class="dates"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">calendar_month</span>' + p.start + ' ' + monthName + ' → ' + p.end + ' ' + monthName + ' ' + year + '</div>' +
                '<div class="duration">' + p.duration + ' يوم</div>';
            container.appendChild(entry);
        });
    }

    return {
        getExemptMode: getExemptMode,
        getExemptDays: getExemptDays,
        saveExemptDays: saveExemptDays,
        toggleExemptMode: toggleExemptMode,
        toggleExemptPrayer: toggleExemptPrayer,
        isPrayerExempt: isPrayerExempt,
        getExemptCountForPrayer: getExemptCountForPrayer,
        updateExemptInfo: updateExemptInfo,
        getExemptCountForMonth: getExemptCountForMonth,
        savePeriodHistory: savePeriodHistory,
        renderPeriodHistory: renderPeriodHistory,
        renderPeriodHistoryDashboard: renderPeriodHistoryDashboard
    };
})();

// Backward compat globals
window.getExemptDays = window.App.Female.getExemptDays;
window.isPrayerExempt = window.App.Female.isPrayerExempt;
window.getExemptCountForPrayer = window.App.Female.getExemptCountForPrayer;
window.getExemptCountForMonth = window.App.Female.getExemptCountForMonth;
window.toggleExemptMode = window.App.Female.toggleExemptMode;
window.toggleExemptPrayer = window.App.Female.toggleExemptPrayer;
window.updateExemptInfo = window.App.Female.updateExemptInfo;
window.savePeriodHistory = window.App.Female.savePeriodHistory;
window.renderPeriodHistory = window.App.Female.renderPeriodHistory;
window.renderPeriodHistoryDashboard = window.App.Female.renderPeriodHistoryDashboard;
