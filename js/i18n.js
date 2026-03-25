/* Prayer Tracker PWA — i18n.js */
window.App = window.App || {};
window.App.I18n = (function() {
    var currentLang = localStorage.getItem('salah_lang') || 'ar';

    function t(key) {
        var T = window.App.Config.T;
        if (T[key]) return T[key][currentLang] || T[key]['ar'];
        return key;
    }

    function getMonthName(index) {
        return window.App.Config.T['months'][currentLang][index];
    }

    function getMonthNames() {
        return window.App.Config.T['months'][currentLang];
    }

    function getPrayerName(id) {
        var map = {
            'fajr': 'prayer_fajr', 'dhuhr': 'prayer_dhuhr', 'asr': 'prayer_asr',
            'maghrib': 'prayer_maghrib', 'isha': 'prayer_isha',
            'tahajjud': 'prayer_tahajjud', 'sunnah-fajr': 'prayer_sunnah_fajr',
            'duha': 'prayer_duha', 'sunnah-dhuhr': 'prayer_sunnah_dhuhr',
            'sunnah-asr': 'prayer_sunnah_asr', 'sunnah-maghrib': 'prayer_sunnah_maghrib',
            'sunnah-isha': 'prayer_sunnah_isha', 'witr': 'prayer_witr'
        };
        return map[id] ? t(map[id]) : id;
    }

    function getHijriMonthName(index) {
        if (currentLang === 'en') {
            return window.App.Config.hijriMonthNamesEn[index];
        }
        return window.App.Config.hijriMonthNamesAr[index];
    }

    function toggleLang() {
        currentLang = currentLang === 'ar' ? 'en' : 'ar';
        localStorage.setItem('salah_lang', currentLang);
        applyLang();
    }

    function applyLang() {
        var isAr = currentLang === 'ar';
        var T = window.App.Config.T;

        // Direction
        document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', currentLang);
        document.body.style.direction = isAr ? 'rtl' : 'ltr';

        // Button text
        var langBtn = document.getElementById('langBtn');
        if (langBtn) {
            langBtn.textContent = isAr ? 'EN' : 'عر';
            langBtn.title = isAr ? 'Switch to English' : 'التبديل للعربية';
        }

        // Apply all translations to elements with data-t attribute
        document.querySelectorAll('[data-t]').forEach(function(el) {
            var key = el.getAttribute('data-t');
            if (T[key]) {
                if (el.tagName === 'INPUT' && el.type !== 'number') {
                    el.placeholder = T[key][currentLang];
                } else {
                    el.textContent = T[key][currentLang];
                }
            }
        });

        // Update month selects with Hijri months
        document.querySelectorAll('select[id*="MonthSelect"], #fastingMonthSelect').forEach(function(select) {
            var months = getMonthNames();
            Array.from(select.options).forEach(function(opt, i) {
                opt.textContent = months[i];
            });
        });

        // Update monthNames array used by charts (now Hijri)
        var configMonths = window.App.Config.monthNames;
        configMonths.length = 0;
        getMonthNames().forEach(function(m) { configMonths.push(m); });

        // Re-render current view if loaded
        try {
            var activeProfile = window.App.Storage ? window.App.Storage.getActiveProfile() : null;
            var currentSection = window.App.Storage ? window.App.Storage.getCurrentSection() : 'fard';
            if (activeProfile) {
                if (currentSection === 'fard' || currentSection === 'sunnah') {
                    var trackerActive = document.getElementById(currentSection + 'TrackerView');
                    var dashActive = document.getElementById(currentSection + 'DashboardView');
                    var yearlyActive = document.getElementById(currentSection + 'YearlyView');

                    if (trackerActive && trackerActive.classList.contains('active')) {
                        if (typeof window.renderTrackerMonth === 'function') window.renderTrackerMonth(currentSection);
                        if (typeof window.updateTrackerStats === 'function') window.updateTrackerStats(currentSection);
                        if (currentSection === 'fard' && typeof window.updateCongregationStats === 'function') window.updateCongregationStats();
                    }
                    if (dashActive && dashActive.classList.contains('active')) {
                        if (typeof window.updateDashboard === 'function') window.updateDashboard(currentSection);
                    }
                    if (yearlyActive && yearlyActive.classList.contains('active')) {
                        if (typeof window.updateYearlyView === 'function') window.updateYearlyView(currentSection);
                    }
                    if (typeof window.renderStreaks === 'function') window.renderStreaks(currentSection);
                } else if (currentSection === 'fasting') {
                    var volView = document.getElementById('fastingVoluntaryView');
                    if (volView && volView.classList.contains('active') && typeof window.updateVoluntaryFasting === 'function') window.updateVoluntaryFasting();
                    var dashView = document.getElementById('fastingDashboardView');
                    if (dashView && dashView.classList.contains('active') && typeof window.updateFastingDashboard === 'function') window.updateFastingDashboard();
                } else if (currentSection === 'azkar') {
                    if (typeof window.updateAzkarTracker === 'function') window.updateAzkarTracker();
                    var azDash = document.getElementById('azkarDashboardView');
                    if (azDash && azDash.classList.contains('active') && typeof window.updateAzkarDashboard === 'function') window.updateAzkarDashboard();
                    var azYearly = document.getElementById('azkarYearlyView');
                    if (azYearly && azYearly.classList.contains('active') && typeof window.updateAzkarYearly === 'function') window.updateAzkarYearly();
                }
            }
        } catch(e) { console.error('Lang re-render:', e); }

        if (typeof window.updateShellBar === 'function') window.updateShellBar();
    }

    return {
        getCurrentLang: function() { return currentLang; },
        setCurrentLang: function(l) { currentLang = l; },
        t: t,
        getMonthName: getMonthName,
        getMonthNames: getMonthNames,
        getPrayerName: getPrayerName,
        getHijriMonthName: getHijriMonthName,
        toggleLang: toggleLang,
        applyLang: applyLang
    };
})();

// Backward compat for inline onclick and other modules
window.t = window.App.I18n.t;
window.toggleLang = window.App.I18n.toggleLang;
window.getPrayerName = window.App.I18n.getPrayerName;
window.getHijriMonthName = window.App.I18n.getHijriMonthName;
window.getMonthName = window.App.I18n.getMonthName;
window.getMonthNames = window.App.I18n.getMonthNames;
