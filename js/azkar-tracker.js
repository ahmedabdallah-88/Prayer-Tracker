/**
 * azkar-tracker.js — Azkar (Morning/Evening Remembrance) Tracker
 * Shows morning and evening as two prayer-like rows in a single view.
 */
window.App = window.App || {};
window.App.Azkar = (function() {
    var Storage = null;
    var Hijri = null;
    var I18n = null;
    var Config = null;

    function _init() {
        Storage = window.App.Storage;
        Hijri = window.App.Hijri;
        I18n = window.App.I18n;
        Config = window.App.Config;
    }

    // ==================== DATA STORAGE ====================

    function getAzkarKey(year, month) {
        return 'salah_azkar_' + Storage.getProfilePrefix() + 'h' + year + '_' + month;
    }

    function getAzkarData(year, month) {
        var key = getAzkarKey(year, month);
        var stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : { morning: {}, evening: {} };
    }

    function saveAzkarData(year, month, data) {
        localStorage.setItem(getAzkarKey(year, month), JSON.stringify(data));
    }

    // ==================== CATEGORIES ====================

    var categories = [
        { id: 'morning', icon: 'light_mode', gradient: 'linear-gradient(135deg, #FBBF24, #D97706)', color: '#D97706', shadow: 'rgba(217,119,6,0.35)' },
        { id: 'evening', icon: 'nights_stay', gradient: 'linear-gradient(135deg, #818CF8, #4F46E5)', color: '#4F46E5', shadow: 'rgba(79,70,229,0.35)' }
    ];

    // ==================== TRACKER VIEW ====================

    function updateAzkarTracker() {
        _init();
        var monthEl = document.getElementById('azkarTrackerMonth');
        var yearEl = document.getElementById('azkarTrackerYear');
        var month = monthEl ? parseInt(monthEl.value) : Hijri.getCurrentHijriMonth();
        var year = yearEl ? parseInt(yearEl.value) : Hijri.getCurrentHijriYear();
        var daysInMonth = Hijri.getHijriDaysInMonth(year, month);
        var data = getAzkarData(year, month);
        var currentLang = I18n.getCurrentLang();

        // Update compact month nav label
        var monthLabel = document.getElementById('azkarTrackerMonthLabel');
        if (monthLabel) {
            monthLabel.textContent = Hijri.getHijriMonthName(month - 1) + ' ' + year;
        }
        var daysPill = document.getElementById('azkarMonthDaysPill');
        if (daysPill) daysPill.textContent = daysInMonth;

        var container = document.getElementById('azkarPrayersContainer');
        if (!container) return;
        container.innerHTML = '';

        var todayH = Hijri.getTodayHijri();
        var isCurrentMonth = (todayH.year === year && todayH.month === month);

        categories.forEach(function(cat) {
            var catData = data[cat.id] || {};
            var section = document.createElement('div');
            section.className = 'prayer-section';

            var completed = 0;
            // Count completed
            for (var d = 1; d <= daysInMonth; d++) {
                if (catData[d]) completed++;
            }

            var possible = daysInMonth;
            if (todayH.year === year && todayH.month === month) {
                possible = todayH.day;
            } else if (Storage.isFutureDate(1, month, year)) {
                possible = 0;
            }
            var pct = possible > 0 ? Math.round((completed / possible) * 100) : 0;

            // Header (same style as fard prayer rows)
            var header = document.createElement('div');
            header.className = 'prayer-header';

            var nameDiv = document.createElement('div');
            nameDiv.className = 'prayer-name';
            var catName = cat.id === 'morning' ? I18n.t('azkar_morning') : I18n.t('azkar_evening');
            nameDiv.innerHTML = '<span class="prayer-icon-badge" style="background:' + cat.gradient + ';box-shadow:0 4px 12px ' + (cat.shadow || 'rgba(0,0,0,0.2)') + '"><span class="material-symbols-rounded" style="font-size:22px;color:white;font-variation-settings:\'FILL\' 1,\'wght\' 500;">' + cat.icon + '</span></span><span>' + catName + '</span>';

            var headerEnd = document.createElement('div');
            headerEnd.className = 'prayer-header-end';
            var pctColor = pct >= 80 ? 'var(--primary)' : pct >= 50 ? 'var(--accent)' : 'var(--danger)';
            headerEnd.innerHTML = '<span class="pct-pill" style="background:' + pctColor + '">' + pct + '%</span>' +
                '<span class="prayer-counter">' + completed + '/' + daysInMonth + '</span>';

            header.appendChild(nameDiv);
            header.appendChild(headerEnd);
            section.appendChild(header);

            // Day circle grid
            var grid = document.createElement('div');
            grid.className = 'days-grid flow-grid';

            for (var day = 1; day <= daysInMonth; day++) {
                var dayBox = document.createElement('div');
                dayBox.className = 'day-box';
                dayBox.appendChild(Hijri.createDualDayNum(day, year, month));

                if (isCurrentMonth && todayH.day === day) {
                    dayBox.classList.add('today-box');
                }

                if (Storage.isFutureDate(day, month, year)) {
                    dayBox.classList.add('disabled');
                } else {
                    if (catData[day]) {
                        dayBox.classList.add('checked');
                        dayBox.style.background = 'linear-gradient(135deg, #0EA5E9, #38BDF8)';
                        dayBox.style.color = 'white';
                    }
                    (function(d, catId) {
                        dayBox.onclick = function() {
                            var azData = getAzkarData(year, month);
                            if (!azData[catId]) azData[catId] = {};
                            azData[catId][d] = !azData[catId][d];
                            if (!azData[catId][d]) delete azData[catId][d];
                            window.App.UI.hapticFeedback(azData[catId][d] ? 'success' : 'light');
                            saveAzkarData(year, month, azData);
                            updateAzkarTracker();
                        };
                    })(day, cat.id);
                }
                grid.appendChild(dayBox);
            }
            section.appendChild(grid);

            // Mark all button for this category
            var actionRow = document.createElement('div');
            actionRow.style.cssText = 'margin-top:8px;margin-bottom:4px;display:flex;gap:8px;justify-content:center;';
            var markBtn = document.createElement('button');
            markBtn.className = 'btn btn-sm btn-outline';
            markBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">done_all</span> ' + I18n.t('mark_all');
            (function(catId) {
                markBtn.onclick = function() { markAllAzkar(catId); };
            })(cat.id);
            actionRow.appendChild(markBtn);
            section.appendChild(actionRow);

            container.appendChild(section);
        });
    }

    function changeAzkarMonth(delta) {
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
        var mEl = document.getElementById('azkarTrackerMonth');
        var yEl = document.getElementById('azkarTrackerYear');
        var month = mEl ? parseInt(mEl.value) : Hijri.getCurrentHijriMonth();
        var year = yEl ? parseInt(yEl.value) : Hijri.getCurrentHijriYear();
        month += delta;
        if (month > 12) { month = 1; year++; }
        else if (month < 1) { month = 12; year--; }
        if (mEl) mEl.value = month;
        if (yEl) yEl.value = year;

        // Animate month label slide
        var monthLabel = document.getElementById('azkarTrackerMonthLabel');
        if (monthLabel) {
            monthLabel.classList.remove('slide-from-left', 'slide-from-right');
            void monthLabel.offsetWidth;
            monthLabel.classList.add(delta > 0 ? 'slide-from-left' : 'slide-from-right');
            setTimeout(function() { monthLabel.classList.remove('slide-from-left', 'slide-from-right'); }, 250);
        }

        updateAzkarTracker();
    }

    function markAllAzkar(category) {
        _init();
        var mEl = document.getElementById('azkarTrackerMonth');
        var yEl = document.getElementById('azkarTrackerYear');
        var month = mEl ? parseInt(mEl.value) : Hijri.getCurrentHijriMonth();
        var year = yEl ? parseInt(yEl.value) : Hijri.getCurrentHijriYear();
        var daysInMonth = Hijri.getHijriDaysInMonth(year, month);
        var data = getAzkarData(year, month);

        // If no category specified, mark both
        var cats = category ? [category] : ['morning', 'evening'];
        var todayH = Hijri.getTodayHijri();
        var maxDay = daysInMonth;
        if (todayH.year === year && todayH.month === month) {
            maxDay = todayH.day;
        }

        // Check if will mark or unmark
        var willUnmark = true;
        cats.forEach(function(cat) {
            if (!data[cat]) { willUnmark = false; return; }
            for (var d = 1; d <= maxDay; d++) {
                if (!data[cat][d]) { willUnmark = false; return; }
            }
        });
        var confirmKey = willUnmark ? 'confirm_batch_azkar_unmark' : 'confirm_batch_azkar_mark';

        window.App.UI.showConfirm(I18n.t(confirmKey)).then(function(confirmed) {
            if (!confirmed) return;

            cats.forEach(function(cat) {
                if (!data[cat]) data[cat] = {};
                var allMarked = true;
                for (var d = 1; d <= maxDay; d++) {
                    if (!data[cat][d]) { allMarked = false; break; }
                }
                if (allMarked) {
                    data[cat] = {};
                } else {
                    for (var d2 = 1; d2 <= maxDay; d2++) {
                        data[cat][d2] = true;
                    }
                }
            });

            saveAzkarData(year, month, data);
            window.App.UI.hapticFeedback('success');
            updateAzkarTracker();
        });
    }

    function resetAzkar() {
        _init();
        return window.App.UI.showConfirm(I18n.t('confirm_clear')).then(function(confirmed) {
            if (!confirmed) return;
            var mEl = document.getElementById('azkarTrackerMonth');
            var yEl = document.getElementById('azkarTrackerYear');
            var month = mEl ? parseInt(mEl.value) : Hijri.getCurrentHijriMonth();
            var year = yEl ? parseInt(yEl.value) : Hijri.getCurrentHijriYear();
            var data = { morning: {}, evening: {} };
            saveAzkarData(year, month, data);
            updateAzkarTracker();
        });
    }

    // ==================== AZKAR VIEW SWITCH ====================

    function switchAzkarView(view) {
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
        document.querySelectorAll('#azkarSection .view').forEach(function(v) { v.classList.remove('active'); });

        var subTabs = document.getElementById('azkarSubTabs');
        var pillPos = 0;
        if (subTabs) {
            subTabs.querySelectorAll('.sub-tab').forEach(function(tab) { tab.classList.remove('active'); });
        }

        if (view === 'tracker') {
            document.getElementById('azkarTrackerView').classList.add('active');
            if (subTabs) { var t = subTabs.querySelectorAll('.sub-tab'); if (t[0]) t[0].classList.add('active'); }
            pillPos = 0;
            updateAzkarTracker();
        } else if (view === 'yearly') {
            var azYearlyView = document.getElementById('azkarYearlyView');
            if (azYearlyView) azYearlyView.classList.add('active');
            if (subTabs) { var t2 = subTabs.querySelectorAll('.sub-tab'); if (t2[1]) t2[1].classList.add('active'); }
            pillPos = 1;
            updateAzkarYearly();
        } else if (view === 'dashboard') {
            var azDashView = document.getElementById('azkarDashboardView');
            if (azDashView) azDashView.classList.add('active');
            if (subTabs) { var t3 = subTabs.querySelectorAll('.sub-tab'); if (t3[2]) t3[2].classList.add('active'); }
            pillPos = 2;
            updateAzkarDashboard();
        }

        // Sliding pill
        if (subTabs) {
            var pill = subTabs.querySelector('.sub-tabs-pill');
            if (pill) pill.setAttribute('data-pos', pillPos);
        }

        // View slide-in animation
        var activeView = document.querySelector('#azkarSection .view.active');
        if (activeView) {
            activeView.classList.remove('view-slide-in');
            void activeView.offsetWidth;
            activeView.classList.add('view-slide-in');
            setTimeout(function() { activeView.classList.remove('view-slide-in'); }, 300);
        }
    }

    // ==================== YEAR OVERVIEW ====================

    function updateAzkarYearly() {
        _init();
        var currentLang = I18n.getCurrentLang();
        var yearEl = document.getElementById('azkarYearlyYear');
        var yearVal = yearEl ? parseInt(yearEl.value) : Hijri.getCurrentHijriYear();
        var todayH = Hijri.getTodayHijri();
        var grid = document.getElementById('azkarMonthsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        var summaryEl = document.getElementById('azkarYearlySummary');
        var totalMorn = 0, totalEve = 0, totalDays = 0, bestPct = 0, bestIdx = 0;

        for (var month = 1; month <= 12; month++) {
            var data = getAzkarData(yearVal, month);
            var daysInMonth = Hijri.getHijriDaysInMonth(yearVal, month);
            totalDays += daysInMonth;
            var mornCount = Object.values(data.morning || {}).filter(Boolean).length;
            var eveCount = Object.values(data.evening || {}).filter(Boolean).length;
            totalMorn += mornCount;
            totalEve += eveCount;

            var mornPct = daysInMonth > 0 ? Math.round((mornCount / daysInMonth) * 100) : 0;
            var evePct = daysInMonth > 0 ? Math.round((eveCount / daysInMonth) * 100) : 0;
            var avgPct = Math.round((mornPct + evePct) / 2);
            if (avgPct > bestPct) { bestPct = avgPct; bestIdx = month; }

            var isCurrent = todayH.year === yearVal && todayH.month === month;
            var isFuture = todayH.year === yearVal && month > todayH.month;

            var card = document.createElement('div');
            card.className = 'month-card' + (isCurrent ? ' current-month' : '');
            if (isFuture) card.style.opacity = '0.35';

            var barColor = avgPct >= 90 ? 'var(--primary)' : avgPct >= 70 ? 'var(--accent)' : 'var(--danger, #dc2626)';
            var hijriLabel = Hijri.getHijriMonthName(month - 1);
            var gregSpan = Hijri.getGregorianSpanForHijriMonth(yearVal, month);

            card.innerHTML =
                '<div class="month-card-header">' +
                    '<h3>' + hijriLabel + (isCurrent ? ' <span class="current-dot"></span>' : '') + '</h3>' +
                    '<span class="month-pct">' + avgPct + '%</span>' +
                '</div>' +
                '<div class="month-greg-ref">' + gregSpan + '</div>' +
                '<div class="month-progress"><div class="progress-bar"><div class="progress-fill" style="width:' + avgPct + '%;background:' + barColor + '"></div></div></div>' +
                '<div class="month-stats">' +
                    '<span class="month-badge" style="color:#F59E0B;background:rgba(245,158,11,0.1)"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">light_mode</span> ' + mornPct + '%</span>' +
                    '<span class="month-badge" style="color:#6366F1;background:rgba(99,102,241,0.1)"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">nights_stay</span> ' + evePct + '%</span>' +
                '</div>';

            grid.appendChild(card);
        }

        // Summary
        if (summaryEl) {
            var avgMorn = totalDays > 0 ? Math.round((totalMorn / totalDays) * 100) : 0;
            var avgEve = totalDays > 0 ? Math.round((totalEve / totalDays) * 100) : 0;
            var bestName = bestIdx > 0 ? Hijri.getHijriMonthName(bestIdx - 1) : '-';
            summaryEl.innerHTML =
                '<div class="dashboard-grid" style="margin-bottom:16px;">' +
                    '<div class="stat-card"><div class="label"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">light_mode</span> ' + I18n.t('azkar_morning') + '</div><div class="value" style="color:#F59E0B">' + avgMorn + '%</div></div>' +
                    '<div class="stat-card"><div class="label"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">nights_stay</span> ' + I18n.t('azkar_evening') + '</div><div class="value" style="color:#6366F1">' + avgEve + '%</div></div>' +
                    '<div class="stat-card"><div class="label"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">emoji_events</span> ' + I18n.t('best_month') + '</div><div class="value" style="font-size:0.9em;">' + bestName + '</div><div class="sublabel">' + bestPct + '%</div></div>' +
                '</div>';
        }
    }

    // ==================== DASHBOARD ====================

    function updateAzkarDashboard() {
        _init();
        var Charts = window.App.SVGCharts;
        var currentLang = I18n.getCurrentLang();
        var dashYearEl = document.getElementById('azkarDashboardYear');
        var hYear = dashYearEl ? parseInt(dashYearEl.value) : Hijri.getCurrentHijriYear();
        var todayH = Hijri.getTodayHijri();

        // Gather stats
        var totalMorn = 0, totalEve = 0, totalBoth = 0, totalDays = 0;
        var bestMonth = { month: 0, pct: 0 };
        var monthlyMorn = [], monthlyEve = [];

        for (var m = 1; m <= 12; m++) {
            var data = getAzkarData(hYear, m);
            var days = Hijri.getHijriDaysInMonth(hYear, m);
            totalDays += days;
            var morn = Object.values(data.morning || {}).filter(Boolean).length;
            var eve = Object.values(data.evening || {}).filter(Boolean).length;
            totalMorn += morn;
            totalEve += eve;

            for (var d = 1; d <= days; d++) {
                if ((data.morning || {})[d] && (data.evening || {})[d]) totalBoth++;
            }

            var mPct = days > 0 ? Math.round((morn / days) * 100) : 0;
            var ePct = days > 0 ? Math.round((eve / days) * 100) : 0;
            monthlyMorn.push(mPct);
            monthlyEve.push(ePct);

            var avg = Math.round((mPct + ePct) / 2);
            if (avg > bestMonth.pct) bestMonth = { month: m, pct: avg };
        }

        var mornRate = totalDays > 0 ? Math.round((totalMorn / totalDays) * 100) : 0;
        var eveRate = totalDays > 0 ? Math.round((totalEve / totalDays) * 100) : 0;

        // Stat cards
        var _s = function(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
        _s('azkarDashMornRate', mornRate + '%');
        _s('azkarDashEveRate', eveRate + '%');
        _s('azkarDashBothCount', totalBoth);
        _s('azkarDashBestMonth', bestMonth.month > 0 ? Hijri.getHijriMonthName(bestMonth.month - 1) : '-');
        _s('azkarDashBestPct', bestMonth.pct + '%');

        // Mountain chart
        var mtnEl = document.getElementById('azkarMountainChart');
        if (mtnEl && Charts) {
            var monthLabels = window.App.Dashboard.getHijriMonthNamesShort();
            Charts.mountainChart(mtnEl, {
                labels: monthLabels,
                values: monthlyMorn,
                values2: monthlyEve,
                currentMonth: todayH.year === hYear ? todayH.month : undefined,
                legend: [
                    { color: '#F59E0B', label: I18n.t('azkar_morning') },
                    { color: '#6366F1', label: I18n.t('azkar_evening'), dashed: true }
                ]
            });
        }

        // Streak flame bars
        var streakEl = document.getElementById('azkarStreakFlame');
        if (streakEl && Charts) {
            var mornStreak = calculateAzkarStreak('morning');
            var eveStreak = calculateAzkarStreak('evening');
            Charts.streakFlameBars(streakEl, {
                prayers: [
                    { name: I18n.t('azkar_morning'), icon: 'light_mode', color: '#F59E0B', current: mornStreak.current, best: mornStreak.best },
                    { name: I18n.t('azkar_evening'), icon: 'nights_stay', color: '#6366F1', current: eveStreak.current, best: eveStreak.best }
                ],
                legendLabels: {
                    current: I18n.t('current_word'),
                    best: I18n.t('best_word'),
                    record: I18n.t('record_word')
                }
            });
        }
    }

    function calculateAzkarStreak(category) {
        _init();
        var todayH = Hijri.getTodayHijri();
        var current = 0, best = 0, counting = true;
        var year = todayH.year, month = todayH.month, day = todayH.day;

        for (var i = 0; i < 365; i++) {
            var data = getAzkarData(year, month);
            var catData = data[category] || {};

            if (catData[day]) {
                if (counting) current++;
                best = Math.max(best, counting ? current : 0);
            } else {
                if (counting) counting = false;
            }

            day--;
            if (day < 1) {
                month--;
                if (month < 1) { month = 12; year--; }
                day = Hijri.getHijriDaysInMonth(year, month);
            }
        }

        // Also find historical best
        year = todayH.year; month = todayH.month; day = todayH.day;
        var streak = 0;
        for (var j = 0; j < 365; j++) {
            var d2 = getAzkarData(year, month);
            var c2 = d2[category] || {};
            if (c2[day]) {
                streak++;
                best = Math.max(best, streak);
            } else {
                streak = 0;
            }
            day--;
            if (day < 1) { month--; if (month < 1) { month = 12; year--; } day = Hijri.getHijriDaysInMonth(year, month); }
        }

        return { current: current, best: best };
    }

    // ==================== PUBLIC API ====================

    return {
        getAzkarKey: getAzkarKey,
        getAzkarData: getAzkarData,
        saveAzkarData: saveAzkarData,
        updateAzkarTracker: updateAzkarTracker,
        changeAzkarMonth: changeAzkarMonth,
        markAllAzkar: markAllAzkar,
        resetAzkar: resetAzkar,
        switchAzkarView: switchAzkarView,
        updateAzkarYearly: updateAzkarYearly,
        updateAzkarDashboard: updateAzkarDashboard
    };
})();

// Backward compat globals
window.updateAzkarTracker = window.App.Azkar.updateAzkarTracker;
window.changeAzkarMonth = window.App.Azkar.changeAzkarMonth;
window.markAllAzkar = window.App.Azkar.markAllAzkar;
window.resetAzkar = window.App.Azkar.resetAzkar;
window.switchAzkarView = window.App.Azkar.switchAzkarView;
window.updateAzkarYearly = window.App.Azkar.updateAzkarYearly;
window.updateAzkarDashboard = window.App.Azkar.updateAzkarDashboard;
