/**
 * dashboard.js — Dashboard using custom SVG visualizations
 * All Chart.js usage replaced with window.App.SVGCharts
 */
window.App = window.App || {};
window.App.Dashboard = (function() {
    var Storage = window.App.Storage;
    var Hijri   = window.App.Hijri;
    var I18n    = window.App.I18n;
    var Config  = window.App.Config;

    function getHijriMonthNamesShort() {
        var lang = I18n.getCurrentLang();
        return lang === 'ar'
            ? ['\u0645\u062d\u0631\u0645', '\u0635\u0641\u0631', '\u0631\u0628\u064a\u0639\u0661', '\u0631\u0628\u064a\u0639\u0662', '\u062c\u0645\u0627\u062f\u0649\u0661', '\u062c\u0645\u0627\u062f\u0649\u0662', '\u0631\u062c\u0628', '\u0634\u0639\u0628\u0627\u0646', '\u0631\u0645\u0636\u0627\u0646', '\u0634\u0648\u0627\u0644', '\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629', '\u0630\u0648 \u0627\u0644\u062d\u062c\u0629']
            : ['Muh', 'Saf', 'Rb1', 'Rb2', 'Jm1', 'Jm2', 'Raj', 'Sha', 'Ram', 'Shw', 'DhQ', 'DhH'];
    }

    // ==================== SHARED DATA GATHERERS ====================

    function _maxMonthForYear(hYear) {
        var todayH = Hijri.getTodayHijri();
        return (hYear === todayH.year) ? todayH.month : 12;
    }

    function gatherPrayerStats(type, hYear) {
        var prayers = Storage.getPrayersArray(type);
        var dataObj = Storage.getDataObject(type);
        var results = [];
        var maxM = _maxMonthForYear(hYear);

        prayers.forEach(function(prayer) {
            var completed = 0, total = 0, congCount = 0;
            for (var m = 1; m <= maxM; m++) {
                var days = Hijri.getHijriDaysInMonth(hYear, m);
                total += days;
                if (dataObj[m] && dataObj[m][prayer.id]) {
                    var cDays = Object.keys(dataObj[m][prayer.id]).filter(function(d) { return dataObj[m][prayer.id][d]; });
                    completed += cDays.length;
                    if (type === 'fard') {
                        var congData = Storage.getCongregationData(hYear, m);
                        cDays.forEach(function(d) {
                            if (congData[prayer.id] && congData[prayer.id][parseInt(d)]) congCount++;
                        });
                    }
                }
            }
            var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            var congPct = completed > 0 ? Math.round((congCount / completed) * 100) : 0;
            results.push({
                id: prayer.id,
                name: I18n.getPrayerName(prayer.id),
                icon: prayer.icon || prayer.materialIcon,
                color: prayer.color,
                completed: completed,
                total: total,
                completion: pct,
                congregation: congPct,
                congCount: congCount
            });
        });
        return results;
    }

    function gatherMonthlyData(type, hYear) {
        var completionData = [];
        var congData = [];
        var maxM = _maxMonthForYear(hYear);
        for (var m = 1; m <= maxM; m++) {
            completionData.push(Storage.getMonthStats(type, m, hYear).percentage);
            if (type === 'fard') {
                var prayers = Storage.getPrayersArray('fard');
                var dataObj = Storage.getDataObject('fard');
                var cd = Storage.getCongregationData(hYear, m);
                var daysInMonth = Hijri.getHijriDaysInMonth(hYear, m);
                var totalPossible = daysInMonth * prayers.length;
                var monthCong = 0;
                prayers.forEach(function(p) {
                    if (dataObj[m] && dataObj[m][p.id]) {
                        var cDays = Object.keys(dataObj[m][p.id]).filter(function(d) { return dataObj[m][p.id][d]; });
                        cDays.forEach(function(d) {
                            if (cd[p.id] && cd[p.id][parseInt(d)]) monthCong++;
                        });
                    }
                });
                congData.push(totalPossible > 0 ? Math.round((monthCong / totalPossible) * 100) : 0);
            }
        }
        return { completion: completionData, congregation: congData };
    }

    function gatherWeeklyData(hYear) {
        var prayers = Storage.getPrayersArray('fard');
        var currentLang = I18n.getCurrentLang();
        var shortNames = currentLang === 'ar'
            ? ['\u0623\u062d\u062f', '\u0625\u062b\u0646\u064a\u0646', '\u062b\u0644\u0627\u062b\u0627\u0621', '\u0623\u0631\u0628\u0639\u0627\u0621', '\u062e\u0645\u064a\u0633', '\u062c\u0645\u0639\u0629', '\u0633\u0628\u062a']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var weekTotals = [0,0,0,0,0,0,0];
        var weekCong = [0,0,0,0,0,0,0];
        var maxM = _maxMonthForYear(hYear);

        for (var month = 1; month <= maxM; month++) {
            var cd = Storage.getCongregationData(hYear, month);
            var daysInMonth = Hijri.getHijriDaysInMonth(hYear, month);
            for (var day = 1; day <= daysInMonth; day++) {
                var date = Hijri.hijriToGregorian(hYear, month, day);
                var dow = date.getDay();
                weekTotals[dow]++;
                var dayCong = 0;
                prayers.forEach(function(p) {
                    if (cd[p.id] && cd[p.id][day]) dayCong++;
                });
                weekCong[dow] += dayCong;
            }
        }

        return shortNames.map(function(name, i) {
            var maxPossible = weekTotals[i] * prayers.length;
            return { name: name, value: maxPossible > 0 ? Math.round((weekCong[i] / maxPossible) * 100) : 0 };
        });
    }

    // ==================== MAIN DASHBOARD UPDATE ====================

    function updateDashboard(type) {
        var Charts = window.App.SVGCharts;
        var dashYearEl = document.getElementById(type + 'DashboardYear');
        var hYear = dashYearEl ? parseInt(dashYearEl.value) : Storage.getCurrentYear();
        Storage.setCurrentYear(hYear);
        Storage.loadAllData(type);

        var yearStats = Storage.getYearStats(type, hYear);
        var prayerStats = gatherPrayerStats(type, hYear);
        var monthlyData = gatherMonthlyData(type, hYear);
        var monthLabels = getHijriMonthNamesShort();
        var currentLang = I18n.getCurrentLang();
        var todayH = Hijri.getTodayHijri();

        // --- Update stat cards (null-safe) ---
        var _set = function(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
        _set(type + 'YearTotalCompleted', yearStats.completed);
        _set(type + 'YearTotalPossible', yearStats.total);
        _set(type + 'YearCompletionRate', yearStats.percentage + '%');

        var bestMonth = { month: 0, percentage: 0 };
        var maxMBest = _maxMonthForYear(hYear);
        for (var m = 1; m <= maxMBest; m++) {
            var ms = Storage.getMonthStats(type, m, hYear);
            if (ms.percentage > bestMonth.percentage) bestMonth = { month: m, percentage: ms.percentage };
        }
        _set(type + 'BestMonth', bestMonth.month > 0 ? Config.monthNames[bestMonth.month - 1] : '-');
        _set(type + 'BestMonthRate', bestMonth.percentage + '%');

        var bestPrayer = prayerStats.reduce(function(best, p) { return p.completion > best.completion ? p : best; }, { name: '-', completion: 0 });
        _set(type + 'BestPrayer', bestPrayer.name);
        _set(type + 'BestPrayerRate', bestPrayer.completion + '%');

        // Congregation stats (fard only)
        if (type === 'fard') {
            var yearCong = 0, yearComp = 0;
            prayerStats.forEach(function(p) { yearCong += p.congCount; yearComp += p.completed; });
            var congRate = yearComp > 0 ? Math.round((yearCong / yearComp) * 100) : 0;
            _set('fardYearCongRate', congRate + '%');
            _set('fardYearCongCount', yearCong + ' ' + I18n.t('congregation') + ' / ' + yearComp);
        }

        // Overall completion stats (sunnah)
        if (type === 'sunnah') {
            _set('sunnahYearCompRate', yearStats.percentage + '%');
            var compLabel = currentLang === 'ar'
                ? yearStats.completed + ' من ' + yearStats.total + ' صلاة'
                : yearStats.completed + ' of ' + yearStats.total + ' prayers';
            _set('sunnahYearCompCount', compLabel);
        }

        // --- RENDER SVG CHARTS ---

        // 1. Orbital Progress
        var orbitalEl = document.getElementById(type + 'OrbitalProgress');
        if (orbitalEl) {
            try {
                var completionPct = yearStats.percentage;
                var congPct = 0, yCong = 0, yComp = 0;
                if (type === 'fard') {
                    prayerStats.forEach(function(p) { yCong += p.congCount; yComp += p.completed; });
                    congPct = yComp > 0 ? Math.round((yCong / yComp) * 100) : 0;
                }
                Charts.orbitalProgress(orbitalEl, {
                    completionPct: completionPct,
                    congPct: congPct,
                    completed: yearStats.completed,
                    total: yearStats.total,
                    congCount: yCong,
                    isFard: type === 'fard',
                    lang: currentLang
                });
            } catch(e) {
                console.error('[DASHBOARD] orbitalProgress error:', e);
            }
        }

        // 1b. Prayer Consistency Moons (fard only)
        if (type === 'fard') {
            var moonEl = document.getElementById('fardPrayerMoons');
            if (moonEl && window.App.PrayerStreaks) {
                window.App.PrayerStreaks.renderMoonSection(moonEl);
            }
        }

        // 1c. Sunnah Prayer Streak Chips (sunnah only)
        if (type === 'sunnah') {
            var sunnahStreakEl = document.getElementById('sunnahPrayerStreaks');
            if (sunnahStreakEl && window.App.PrayerStreaks) {
                window.App.PrayerStreaks.renderSunnahStreakChips(sunnahStreakEl);
            }
        }

        // 2. Streak Flame Bars
        var streakEl = document.getElementById(type + 'StreakFlame');
        if (streakEl && window.App.Jamaah) {
            var streakData = prayerStats.map(function(p) {
                var streak = window.App.Jamaah.calculateStreak(type, p.id);
                return { name: p.name, icon: p.icon, color: p.color, current: streak.current, best: streak.best };
            });
            Charts.streakFlameBars(streakEl, {
                prayers: streakData,
                legendLabels: {
                    current: currentLang === 'ar' ? 'الحالية' : 'Current',
                    best: currentLang === 'ar' ? 'الأفضل' : 'Best',
                    record: currentLang === 'ar' ? 'رقم قياسي' : 'Record'
                }
            });
        }

        // 3. Mountain Landscape
        var mtnEl = document.getElementById(type + 'MountainChart');
        if (mtnEl) {
            var mtnData = {
                labels: monthLabels,
                values: monthlyData.completion,
                currentMonth: todayH.year === hYear ? todayH.month : undefined
            };
            if (type === 'fard') {
                mtnData.values2 = monthlyData.congregation;
                mtnData.legend = [
                    { color: 'var(--primary)', label: currentLang === 'ar' ? 'الإنجاز الكلي' : 'Total' },
                    { color: 'var(--accent)', label: currentLang === 'ar' ? 'الجماعة' : 'Congregation', dashed: true }
                ];
            }
            Charts.mountainChart(mtnEl, mtnData);
        }

        // 4. Prayer Dual Bars
        var dualEl = document.getElementById(type + 'DualBarsCard');
        if (dualEl) {
            Charts.prayerDualBars(dualEl, {
                prayers: prayerStats,
                showCongregation: type === 'fard'
            });
        }

        // 6. Weekly Rhythm (fard only)
        var weeklyEl = document.getElementById(type + 'WeeklyRhythm');
        if (weeklyEl && type === 'fard') {
            var weeklyData = gatherWeeklyData(hYear);
            Charts.weeklyRhythm(weeklyEl, { days: weeklyData });
        }

        // Qada report (fard only)
        if (type === 'fard' && typeof window.renderQadaReport === 'function') {
            window.renderQadaReport();
        }

        // Qada Dashboard sub-toggle (fard only)
        if (type === 'fard' && window.App.QadaDashboard) {
            window.App.QadaDashboard.injectSubToggle();
        }

        // Period history (females only)
        var activeProfile = Storage.getActiveProfile();
        var isFemaleAdult = activeProfile && activeProfile.gender === 'female' && activeProfile.age >= 12;
        if (type === 'fard') {
            var fardPeriodDash = document.getElementById('fardPeriodDashboard');
            if (fardPeriodDash) {
                fardPeriodDash.style.display = isFemaleAdult ? '' : 'none';
            }
            if (isFemaleAdult) {
                renderPeriodHistoryDashboard();
            }
        }
    }

    // ==================== PERIOD HISTORY (DASHBOARD) ====================

    function renderPeriodHistoryDashboard() {
        var container = document.getElementById('fardPeriodHistoryContainer');
        if (!container) return;
        var profile = Storage.getActiveProfile();
        if (!profile || profile.gender !== 'female' || profile.age < 12) {
            container.innerHTML = '';
            return;
        }

        var currentYear = Storage.getCurrentYear();
        var dashYrEl = document.getElementById('fardDashboardYear');
        var year = (dashYrEl ? parseInt(dashYrEl.value) : 0) || currentYear;
        var stored = localStorage.getItem('salah_periods_' + Storage.getProfilePrefix() + 'h' + year);
        var periods = stored ? JSON.parse(stored) : [];

        if (periods.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0633\u062c\u0644\u0629. \u062d\u062f\u062f\u064a \u0623\u064a\u0627\u0645 \u0627\u0644\u0625\u0639\u0641\u0627\u0621 \u0645\u0646 \u0627\u0644\u0645\u062a\u062a\u0628\u0639 \u0627\u0644\u0634\u0647\u0631\u064a.</p>';
            return;
        }

        container.innerHTML = '';
        periods.forEach(function(p) {
            var entry = document.createElement('div');
            entry.className = 'period-entry';
            entry.innerHTML = '<div class="dates"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">calendar_month</span> ' + p.start + ' ' + I18n.getHijriMonthName(p.month - 1) + ' \u2192 ' + p.end + ' ' + I18n.getHijriMonthName(p.month - 1) + ' ' + year + '</div>' +
                '<div class="duration">' + p.duration + ' \u064a\u0648\u0645</div>';
            container.appendChild(entry);
        });
    }

    // ==================== PUBLIC API ====================

    return {
        updateDashboard: updateDashboard,
        renderPeriodHistoryDashboard: renderPeriodHistoryDashboard,
        getHijriMonthNamesShort: getHijriMonthNamesShort
    };
})();

// Backward compat
window.updateDashboard = window.App.Dashboard.updateDashboard;
