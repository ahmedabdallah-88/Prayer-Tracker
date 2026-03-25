/* Prayer Tracker PWA — weekly-view.js */
window.App = window.App || {};
window.App.WeeklyView = (function() {

    var trackerViewMode = 'month'; // 'month' or 'week'
    var currentWeekStart = 0;

    function setTrackerViewMode(mode) {
        var Hijri = window.App.Hijri;
        var Storage = window.App.Storage;
        trackerViewMode = mode;

        // Update toggle buttons
        var weekBtn = document.getElementById('weekViewBtn');
        var monthBtn = document.getElementById('monthViewBtn');
        var weekNav = document.getElementById('weekNavBar');
        var controls = document.querySelector('#fardTrackerView .controls');

        if (weekBtn) weekBtn.classList.toggle('active', mode === 'week');
        if (monthBtn) monthBtn.classList.toggle('active', mode === 'month');
        if (weekNav) weekNav.style.display = mode === 'week' ? 'block' : 'none';
        if (controls) controls.style.display = mode === 'week' ? 'none' : '';

        if (mode === 'week') {
            // Set current week to contain today's Hijri day
            var todayH = Hijri.getTodayHijri();
            var currentHijriYear = Hijri.getCurrentHijriYear();
            var currentHijriMonth = Hijri.getCurrentHijriMonth();

            if (todayH.year === currentHijriYear && todayH.month === currentHijriMonth) {
                var todayG = new Date();
                todayG.setHours(12, 0, 0, 0);
                var dow = todayG.getDay(); // 0=Sun
                var daysBack = (dow + 1) % 7; // Sat=0, Sun=1, Mon=2...
                var satG = new Date(todayG.getTime() - daysBack * 86400000);
                var satH = Hijri.gregorianToHijri(satG);
                if (satH.year === currentHijriYear && satH.month === currentHijriMonth) {
                    currentWeekStart = satH.day;
                } else {
                    currentWeekStart = 1;
                }
            } else {
                currentWeekStart = 1;
            }
        }

        updateWeekLabel();
        var currentSection = Storage.getCurrentSection();
        if (typeof window.renderTrackerMonth === 'function') {
            window.renderTrackerMonth(currentSection === 'sunnah' ? 'sunnah' : 'fard');
        }
        if (typeof window.updateTrackerStats === 'function') {
            window.updateTrackerStats(currentSection === 'sunnah' ? 'sunnah' : 'fard');
        }
    }

    function changeWeek(delta) {
        var Hijri = window.App.Hijri;
        var Storage = window.App.Storage;
        var currentHijriYear = Hijri.getCurrentHijriYear();
        var currentHijriMonth = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(currentHijriYear, currentHijriMonth);
        var currentSection = Storage.getCurrentSection();

        currentWeekStart += delta * 7;

        if (currentWeekStart < 1) {
            // Go to previous month
            if (typeof window.changeTrackerMonth === 'function') {
                window.changeTrackerMonth(currentSection === 'sunnah' ? 'sunnah' : 'fard', -1);
            }
            var newDays = Hijri.getHijriDaysInMonth(Hijri.getCurrentHijriYear(), Hijri.getCurrentHijriMonth());
            currentWeekStart = Math.max(1, newDays - 6);
        } else if (currentWeekStart > daysInMonth) {
            // Go to next month
            if (typeof window.changeTrackerMonth === 'function') {
                window.changeTrackerMonth(currentSection === 'sunnah' ? 'sunnah' : 'fard', 1);
            }
            currentWeekStart = 1;
        }

        updateWeekLabel();
        if (typeof window.renderTrackerMonth === 'function') {
            window.renderTrackerMonth(currentSection === 'sunnah' ? 'sunnah' : 'fard');
        }
    }

    function getWeekDays() {
        var Hijri = window.App.Hijri;
        var currentHijriYear = Hijri.getCurrentHijriYear();
        var currentHijriMonth = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(currentHijriYear, currentHijriMonth);
        var days = [];
        for (var i = 0; i < 7; i++) {
            var d = currentWeekStart + i;
            if (d >= 1 && d <= daysInMonth) {
                days.push(d);
            }
        }
        return days;
    }

    function updateWeekLabel() {
        var Hijri = window.App.Hijri;
        var label = document.getElementById('weekRangeLabel');
        if (!label) return;
        var days = getWeekDays();
        if (days.length === 0) return;

        var currentHijriYear = Hijri.getCurrentHijriYear();
        var currentHijriMonth = Hijri.getCurrentHijriMonth();
        var first = days[0];
        var last = days[days.length - 1];
        var monthName = Hijri.getHijriMonthName(currentHijriMonth - 1);

        var firstG = Hijri.hijriToGregorian(currentHijriYear, currentHijriMonth, first);
        var lastG = Hijri.hijriToGregorian(currentHijriYear, currentHijriMonth, last);

        label.textContent = first + ' - ' + last + ' ' + monthName + ' (' + firstG.getDate() + '-' + lastG.getDate() + '/' + (lastG.getMonth() + 1) + ')';
    }

    function getWeekDayHeaders() {
        var Hijri = window.App.Hijri;
        var I18n = window.App.I18n;
        var days = getWeekDays();
        var currentLang = I18n.getCurrentLang();
        var dayNamesShort = currentLang === 'ar'
            ? ['\u0633\u0628\u062A', '\u0623\u062D\u062F', '\u0625\u062B\u0646', '\u062B\u0644\u062B', '\u0623\u0631\u0628', '\u062E\u0645\u0633', '\u062C\u0645\u0639']
            : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

        var currentHijriYear = Hijri.getCurrentHijriYear();
        var currentHijriMonth = Hijri.getCurrentHijriMonth();
        var todayH = Hijri.getTodayHijri();
        var headers = [];

        days.forEach(function(hDay) {
            var gDate = Hijri.hijriToGregorian(currentHijriYear, currentHijriMonth, hDay);
            var dow = gDate.getDay(); // 0=Sun
            var dayIdx = (dow + 1) % 7;
            var isToday = (todayH.year === currentHijriYear && todayH.month === currentHijriMonth && todayH.day === hDay);
            headers.push({
                hDay: hDay,
                gDay: gDate.getDate(),
                dayName: dayNamesShort[dayIdx],
                isToday: isToday
            });
        });

        return headers;
    }

    function getTrackerViewMode() {
        return trackerViewMode;
    }

    function getCurrentWeekStart() {
        return currentWeekStart;
    }

    function setCurrentWeekStart(val) {
        currentWeekStart = val;
    }

    return {
        setTrackerViewMode: setTrackerViewMode,
        changeWeek: changeWeek,
        getWeekDays: getWeekDays,
        updateWeekLabel: updateWeekLabel,
        getWeekDayHeaders: getWeekDayHeaders,
        getTrackerViewMode: getTrackerViewMode,
        getCurrentWeekStart: getCurrentWeekStart,
        setCurrentWeekStart: setCurrentWeekStart
    };
})();

// Backward compat globals
window.setTrackerViewMode = window.App.WeeklyView.setTrackerViewMode;
window.changeWeek = window.App.WeeklyView.changeWeek;
window.getWeekDays = window.App.WeeklyView.getWeekDays;
window.updateWeekLabel = window.App.WeeklyView.updateWeekLabel;
window.getWeekDayHeaders = window.App.WeeklyView.getWeekDayHeaders;
window.trackerViewMode = 'month';
window.currentWeekStart = 0;
