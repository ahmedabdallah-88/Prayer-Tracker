/**
 * fasting-tracker.js — Fasting Tracker UI & Logic
 * Extracted from index.html (lines 3431-3694, 4782-4795)
 */
window.App = window.App || {};
window.App.Fasting = (function() {
    // ==================== STATE ====================
    var fastingExemptModeOn = false;
    var fastingMonth, fastingYear;

    // ==================== SUNNAH FASTING DAY DETECTION ====================

    var SUNNAH_BADGE_CONFIG = {
        'dhul-hijjah':      { icon: 'brightness_2', color: 'var(--accent)', radius: '50%' },
        'ashura':           { icon: 'star', color: 'var(--accent)', radius: '50%' },
        'white-days':       { icon: 'circle', color: '#7B8CA3', radius: '50%', fill: true },
        'monday-thursday':  { icon: 'event_repeat', color: 'var(--accent)', radius: '4px' }
    };

    function getSunnahFastingType(hijriYear, hijriMonth, hijriDay) {
        if (hijriMonth === 12 && hijriDay >= 1 && hijriDay <= 9) return 'dhul-hijjah';
        if (hijriMonth === 1 && (hijriDay === 9 || hijriDay === 10)) return 'ashura';
        if (hijriDay === 13 || hijriDay === 14 || hijriDay === 15) return 'white-days';
        var gregDate = window.App.Hijri.hijriToGregorian(hijriYear, hijriMonth, hijriDay);
        var weekday = gregDate.getDay();
        if (weekday === 1 || weekday === 4) return 'monday-thursday';
        return null;
    }

    function createSunnahBadge(type) {
        var cfg = SUNNAH_BADGE_CONFIG[type];
        if (!cfg) return null;
        var badge = document.createElement('span');
        badge.className = 'sunnah-fast-badge';
        badge.style.cssText = 'position:absolute;bottom:-6px;left:-6px;width:22px;height:22px;' +
            'background:var(--card-bg);border:1.5px solid ' + cfg.color + ';border-radius:7px;' +
            'display:flex;align-items:center;justify-content:center;z-index:2;' +
            'box-shadow:0 1px 3px rgba(0,0,0,0.15);';
        var icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.style.cssText = 'font-size:14px;color:' + cfg.color + ';font-variation-settings:\'wght\' 600;' +
            (cfg.fill ? "font-variation-settings:'FILL' 1,'wght' 600;" : '');
        icon.textContent = cfg.icon;
        badge.appendChild(icon);
        return badge;
    }

    // ==================== SHAWWAL BANNER ====================

    function renderShawwalBanner(month, year) {
        var existing = document.getElementById('shawwalBanner');
        if (existing) existing.remove();
        if (month !== 10) return; // Shawwal only

        var t = window.App.I18n.t;
        var data = getVolFastingData(year, 10);
        var fastedCount = Object.values(data).filter(function(v) { return v; }).length;
        var completed = fastedCount >= 6;

        var banner = document.createElement('div');
        banner.id = 'shawwalBanner';
        banner.className = 'shawwal-banner' + (completed ? ' shawwal-complete' : '');

        if (completed) {
            banner.innerHTML =
                '<div class="shawwal-complete-row">' +
                    '<span class="material-symbols-rounded" style="font-size:20px;color:var(--primary);font-variation-settings:\'FILL\' 1;">check_circle</span>' +
                    '<span class="shawwal-complete-text">' + t('shawwal_complete') + '</span>' +
                '</div>';
        } else {
            var pct = Math.round((Math.min(fastedCount, 6) / 6) * 100);
            banner.innerHTML =
                '<div class="shawwal-header">' +
                    '<div class="shawwal-title">' + t('shawwal_title') + '</div>' +
                    '<div class="shawwal-counter">' + Math.min(fastedCount, 6) + ' / ٦</div>' +
                '</div>' +
                '<div class="shawwal-hadith">' + t('shawwal_hadith') + '</div>' +
                '<div class="shawwal-progress-bar"><div class="shawwal-progress-fill" style="width:' + pct + '%"></div></div>';
        }

        var grid = document.getElementById('voluntaryFastingGrid');
        if (grid && grid.parentNode) {
            grid.parentNode.insertBefore(banner, grid);
        }
    }

    // ==================== HELPERS (delegate to Storage) ====================

    function getFastingKey(year) {
        return window.App.Storage.getFastingKey(year);
    }

    function getFastingData(year) {
        return window.App.Storage.getFastingData(year);
    }

    function saveFastingData(year, data) {
        window.App.Storage.saveFastingData(year, data);
    }

    function getVolFastingKey(year, month) {
        return window.App.Storage.getVolFastingKey(year, month);
    }

    function getVolFastingData(year, month) {
        return window.App.Storage.getVolFastingData(year, month);
    }

    function saveVolFastingData(year, month, data) {
        window.App.Storage.saveVolFastingData(year, month, data);
    }

    // ==================== FASTING VIEW SWITCH (MERGED with Fiori override) ====================

    function switchFastingView(view) {
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
        document.querySelectorAll('#fastingSection .view').forEach(function(v) { v.classList.remove('active'); });
        document.querySelectorAll('#fastingSection .toggle-btn').forEach(function(b) { b.classList.remove('active'); });

        if (view === 'voluntary') {
            document.getElementById('fastingVoluntaryView').classList.add('active');
            try { document.querySelector('#fastingSection .toggle-btn:nth-child(1)').classList.add('active'); } catch(e) {}
            updateVoluntaryFasting();
        } else if (view === 'ramadan') {
            var ramView = document.getElementById('fastingRamadanView');
            if (ramView) ramView.classList.add('active');
            try { document.querySelector('#fastingSection .toggle-btn:nth-child(2)').classList.add('active'); } catch(e) {}
            updateFastingView();
        } else if (view === 'dashboard') {
            var fastDashView = document.getElementById('fastingDashboardView');
            if (fastDashView) fastDashView.classList.add('active');
            try { document.querySelector('#fastingSection .toggle-btn:nth-child(3)').classList.add('active'); } catch(e) {}
            var fastDashYear = document.getElementById('fastingDashboardYear');
            if (fastDashYear) fastDashYear.value = window.App.Storage.getCurrentYear();
            updateFastingDashboard();
        }

        // Fiori sub-tab active state management + sliding pill
        var subTabs = document.getElementById('fastingSubTabs');
        if (subTabs) {
            var pillPos = 0;
            subTabs.querySelectorAll('.sub-tab').forEach(function(tab, i) {
                tab.classList.remove('active');
                if ((view === 'voluntary' && i === 0) || (view === 'ramadan' && i === 1) || (view === 'dashboard' && i === 2)) {
                    tab.classList.add('active');
                    pillPos = i;
                }
            });
            var pill = subTabs.querySelector('.sub-tabs-pill');
            if (pill) pill.setAttribute('data-pos', pillPos);
        }

        // View slide-in animation
        var activeView = document.querySelector('#fastingSection .view.active');
        if (activeView) {
            activeView.classList.remove('view-slide-in');
            void activeView.offsetWidth;
            activeView.classList.add('view-slide-in');
            setTimeout(function() { activeView.classList.remove('view-slide-in'); }, 300);
        }
    }

    // ==================== VOLUNTARY FASTING ====================

    function updateVoluntaryFasting() {
        var monthEl = document.getElementById('fastingMonthSelect');
        var yearEl = document.getElementById('fastingYearVoluntary');
        if (monthEl) fastingMonth = parseInt(monthEl.value);
        if (yearEl) fastingYear = parseInt(yearEl.value);
        var daysInMonth = window.App.Storage.getDaysInMonth(fastingMonth, fastingYear);
        var data = getVolFastingData(fastingYear, fastingMonth);
        var isFemale = window.App.Storage.getActiveProfile() && window.App.Storage.getActiveProfile().gender === 'female' && window.App.Storage.getActiveProfile().age >= 12;
        var exemptData = isFemale ? window.App.Female.getExemptDays(fastingYear, fastingMonth) : {};

        // Update compact month nav label
        var monthLabel = document.getElementById('fastingMonthLabel');
        if (monthLabel && window.App.Hijri) {
            monthLabel.textContent = window.App.Hijri.getHijriMonthName(fastingMonth - 1) + ' ' + fastingYear;
        }
        var daysPill = document.getElementById('fastingMonthDaysPill');
        if (daysPill) daysPill.textContent = daysInMonth;

        var grid = document.getElementById('voluntaryFastingGrid');
        if (!grid) return;
        grid.innerHTML = '';

        var fasted = 0, exemptCount = 0;

        for (var day = 1; day <= daysInMonth; day++) {
            var dayBox = document.createElement('div');
            dayBox.className = 'day-box';
            dayBox.style.position = 'relative';

            if (window.App.Storage.isFutureDate(day, fastingMonth, fastingYear)) {
                dayBox.appendChild(window.App.Hijri.createDualDayNum(day, fastingYear, fastingMonth));
                dayBox.classList.add('disabled');
            } else if (isFemale && fastingExemptModeOn) {
                dayBox.appendChild(window.App.Hijri.createDualDayNum(day, fastingYear, fastingMonth));

                // Check if any prayer is exempt on this day (reuse prayer exempt data)
                var dayExempt = exemptData[day] && Object.values(exemptData[day]).some(function(v) { return v; });
                if (dayExempt) {
                    dayBox.classList.add('exempt');
                    exemptCount++;
                }
                dayBox.style.cursor = 'default';
                dayBox.title = window.App.I18n.t('exempt_linked_prayer');
            } else {
                dayBox.appendChild(window.App.Hijri.createDualDayNum(day, fastingYear, fastingMonth));

                // Check if exempt day for female
                var dayExempt2 = isFemale && exemptData[day] && Object.values(exemptData[day]).some(function(v) { return v; });
                if (dayExempt2) {
                    dayBox.classList.add('exempt');
                    exemptCount++;
                } else if (data[day]) {
                    dayBox.classList.add('checked');
                    fasted++;
                }

                if (!dayExempt2) {
                    (function(d, box) {
                        box.onclick = function() {
                            box.classList.remove('tap-bounce');
                            void box.offsetWidth;
                            box.classList.add('tap-bounce');
                            setTimeout(function() { box.classList.remove('tap-bounce'); }, 350);
                            var volData = getVolFastingData(fastingYear, fastingMonth);
                            volData[d] = !volData[d];
                            window.App.UI.hapticFeedback(volData[d] ? 'success' : 'light');
                            if (!volData[d]) delete volData[d];
                            saveVolFastingData(fastingYear, fastingMonth, volData);
                            updateVoluntaryFasting();
                        };
                    })(day, dayBox);
                }
            }

            // Sunnah fasting day badge (voluntary calendar only)
            var sunnahType = getSunnahFastingType(fastingYear, fastingMonth, day);
            if (sunnahType) {
                var badge = createSunnahBadge(sunnahType);
                if (badge) dayBox.appendChild(badge);
            }

            grid.appendChild(dayBox);
        }

        // Feature #10: stagger fade-in
        var reducedM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reducedM) {
            var allVolBoxes = grid.querySelectorAll('.fasting-day-box');
            for (var vi = 0; vi < allVolBoxes.length; vi++) {
                allVolBoxes[vi].classList.add('day-entering');
                allVolBoxes[vi].style.animationDelay = (vi * 15) + 'ms';
            }
        }

        // Shawwal 6-day banner
        renderShawwalBanner(fastingMonth, fastingYear);

        var elFasted = document.getElementById('volFastedCount');
        var elCounter = document.getElementById('volFastingCounter');
        if (elFasted) elFasted.textContent = fasted;
        if (elCounter) elCounter.textContent = fasted + ' / ' + daysInMonth;
    }

    function changeFastingMonth(delta) {
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
        var mEl = document.getElementById('fastingMonthSelect');
        var yEl = document.getElementById('fastingYearVoluntary');
        if (mEl) fastingMonth = parseInt(mEl.value);
        if (yEl) fastingYear = parseInt(yEl.value);
        fastingMonth += delta;
        if (fastingMonth > 12) { fastingMonth = 1; fastingYear++; }
        else if (fastingMonth < 1) { fastingMonth = 12; fastingYear--; }
        if (mEl) mEl.value = fastingMonth;
        if (yEl) yEl.value = fastingYear;

        // Animate month label slide
        var monthLabel = document.getElementById('fastingMonthLabel');
        if (monthLabel) {
            monthLabel.classList.remove('slide-from-left', 'slide-from-right');
            void monthLabel.offsetWidth;
            var isRTL = document.documentElement.dir === 'rtl';
            var slideDir = (delta > 0) === isRTL ? 'slide-from-left' : 'slide-from-right';
            monthLabel.classList.add(slideDir);
            setTimeout(function() { monthLabel.classList.remove('slide-from-left', 'slide-from-right'); }, 250);
        }

        updateVoluntaryFasting();
    }

    function resetVoluntaryFasting() {
        return window.App.UI.showConfirm(window.App.I18n.t('confirm_clear')).then(function(confirmed) {
            if (!confirmed) return;
            var rMEl = document.getElementById('fastingMonthSelect');
            var rYEl = document.getElementById('fastingYearVoluntary');
            if (rMEl) fastingMonth = parseInt(rMEl.value);
            if (rYEl) fastingYear = parseInt(rYEl.value);
            localStorage.removeItem(getVolFastingKey(fastingYear, fastingMonth));
            updateVoluntaryFasting();
        });
    }

    // ==================== FASTING DASHBOARD ====================

    function updateFastingDashboard() {
        var fdYearEl = document.getElementById('fastingDashboardYear');
        var year = (fdYearEl ? parseInt(fdYearEl.value) : 0) || window.App.Hijri.getCurrentHijriYear();

        var totalVol = 0;
        var bestMonth = { month: 0, days: 0 };
        var monthlyVol = [];

        for (var month = 1; month <= 12; month++) {
            var data = getVolFastingData(year, month);
            var count = Object.values(data).filter(function(v) { return v; }).length;
            totalVol += count;
            monthlyVol.push(count);
            if (count > bestMonth.days) {
                bestMonth = { month: month, days: count };
            }
        }

        var elVolTotal = document.getElementById('fastDashVolTotal');
        var elBestMonth = document.getElementById('fastDashBestMonth');
        var elBestDays = document.getElementById('fastDashBestMonthDays');
        var elAvg = document.getElementById('fastDashAvg');
        if (elVolTotal) elVolTotal.textContent = totalVol;
        if (elBestMonth) elBestMonth.textContent = bestMonth.month > 0 ? window.App.Hijri.getHijriMonthName(bestMonth.month - 1) : '-';
        if (elBestDays) elBestDays.textContent = bestMonth.days + ' \u064A\u0648\u0645';
        if (elAvg) elAvg.textContent = Math.round(totalVol / 12);

        // Ramadan stats
        var ramadanData = getFastingData(year);
        var ramadanDays = window.App.Hijri.getHijriDaysInMonth(year, 9);
        var ramadanFasted = 0;
        Object.values(ramadanData).forEach(function(v) { if (v === 'fasted') ramadanFasted++; });
        var elRamadan = document.getElementById('fastDashRamadan');
        var elRamadanRate = document.getElementById('fastDashRamadanRate');
        if (elRamadan) elRamadan.textContent = ramadanFasted + '/' + ramadanDays;
        if (elRamadanRate) elRamadanRate.textContent = Math.round((ramadanFasted / ramadanDays) * 100) + '%';

        // Monthly chart (SVG bar chart)
        var chartContainer = document.getElementById('fastingMonthlyChart');
        if (chartContainer && window.App.SVGCharts) {
            var monthLabels = window.App.Dashboard.getHijriMonthNamesShort();
            var items = monthlyVol.map(function(v, i) {
                return { label: monthLabels[i], value: v, color: '#059669' };
            });
            window.App.SVGCharts.barChart(chartContainer, { items: items });
        }
    }

    // ==================== RAMADAN FASTING VIEW ====================

    function updateFastingView() {
        var yearEl = document.getElementById('fastingYearInput');
        var year = (yearEl ? parseInt(yearEl.value) : 0) || window.App.Hijri.getCurrentHijriYear();
        var data = getFastingData(year);
        var grid = document.getElementById('fastingGrid');
        if (!grid) return;
        grid.innerHTML = '';

        // Ramadan is always Hijri month 9 - get its days
        var ramadanDays = window.App.Hijri.getHijriDaysInMonth(year, 9);

        // Show Gregorian reference
        var refEl = document.getElementById('ramadanHijriRef');
        if (refEl) {
            refEl.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">nights_stay</span> ' + window.App.Hijri.getHijriMonthName(8) + ' ' + year + ' (' + window.App.Hijri.getGregorianSpanForHijriMonth(year, 9) + ')';
        }

        var fasted = 0, exempt = 0, missed = 0;

        for (var day = 1; day <= ramadanDays; day++) {
            var box = document.createElement('div');
            box.className = 'fasting-day-box';

            box.appendChild(window.App.Hijri.createDualDayNum(day, year, 9));

            var status = data[day] || '';

            if (status === 'fasted') { box.classList.add('fasted'); fasted++; }
            else if (status === 'exempt') { box.classList.add('exempt-fast'); exempt++; }
            else if (status === 'missed') { box.classList.add('missed'); missed++; }

            (function(d, b) {
                b.onclick = function() {
                    b.classList.remove('tap-bounce');
                    void b.offsetWidth;
                    b.classList.add('tap-bounce');
                    setTimeout(function() { b.classList.remove('tap-bounce'); }, 350);
                    cycleFastingDay(year, d);
                };
            })(day, box);
            grid.appendChild(box);
        }

        // Feature #10: stagger fade-in for Ramadan grid
        var reducedMR = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reducedMR) {
            var allRamBoxes = grid.querySelectorAll('.fasting-day-box');
            for (var ri = 0; ri < allRamBoxes.length; ri++) {
                allRamBoxes[ri].classList.add('day-entering');
                allRamBoxes[ri].style.animationDelay = (ri * 15) + 'ms';
            }
        }

        var elDaysFasted = document.getElementById('fastingDaysFasted');
        var elDaysExempt = document.getElementById('fastingDaysExempt');
        var elDaysMissed = document.getElementById('fastingDaysMissed');
        var elDaysOwed = document.getElementById('fastingDaysOwed');
        var elFastCounter = document.getElementById('fastingCounter');
        if (elDaysFasted) elDaysFasted.textContent = fasted;
        if (elDaysExempt) elDaysExempt.textContent = exempt;
        if (elDaysMissed) elDaysMissed.textContent = missed;
        var isFemaleRamadan = window.App.Storage.getActiveProfile() && window.App.Storage.getActiveProfile().gender === 'female' && window.App.Storage.getActiveProfile().age >= 12;
        if (elDaysOwed) elDaysOwed.textContent = isFemaleRamadan ? (exempt + missed) : missed;
        if (elFastCounter) elFastCounter.textContent = fasted + ' / ' + ramadanDays;
    }

    function cycleFastingDay(year, day) {
        var data = getFastingData(year);
        var current = data[day] || '';
        var isFemale = window.App.Storage.getActiveProfile() && window.App.Storage.getActiveProfile().gender === 'female' && window.App.Storage.getActiveProfile().age >= 12;

        var cycle = isFemale
            ? { '': 'fasted', 'fasted': 'exempt', 'exempt': 'missed', 'missed': '' }
            : { '': 'fasted', 'fasted': 'missed', 'missed': '' };
        data[day] = cycle[current];

        window.App.UI.hapticFeedback(data[day] === 'fasted' ? 'success' : 'light');

        if (!data[day]) delete data[day];

        saveFastingData(year, data);
        updateFastingView();
    }

    function resetFasting() {
        return window.App.UI.showConfirm(window.App.I18n.t('confirm_clear_fasting')).then(function(confirmed) {
            if (!confirmed) return;
            var year = parseInt(document.getElementById('fastingYearInput').value) || window.App.Storage.getCurrentYear();
            localStorage.removeItem(getFastingKey(year));
            updateFastingView();
        });
    }

    // ==================== STATE ACCESSORS ====================

    function getFastingExemptModeOn() {
        return fastingExemptModeOn;
    }

    function setFastingExemptModeOn(val) {
        fastingExemptModeOn = val;
    }

    // ==================== PUBLIC API ====================

    return {
        switchFastingView: switchFastingView,
        updateVoluntaryFasting: updateVoluntaryFasting,
        changeFastingMonth: changeFastingMonth,
        resetVoluntaryFasting: resetVoluntaryFasting,
        updateFastingDashboard: updateFastingDashboard,
        updateFastingView: updateFastingView,
        cycleFastingDay: cycleFastingDay,
        resetFasting: resetFasting,
        getFastingExemptModeOn: getFastingExemptModeOn,
        setFastingExemptModeOn: setFastingExemptModeOn,
        getSunnahFastingType: getSunnahFastingType,
        getVolFastingData: getVolFastingData
    };
})();

// Backward compat globals
window.switchFastingView = window.App.Fasting.switchFastingView;
window.updateVoluntaryFasting = window.App.Fasting.updateVoluntaryFasting;
window.changeFastingMonth = window.App.Fasting.changeFastingMonth;
window.resetVoluntaryFasting = window.App.Fasting.resetVoluntaryFasting;
window.updateFastingView = window.App.Fasting.updateFastingView;
window.resetFasting = window.App.Fasting.resetFasting;
window.updateFastingDashboard = window.App.Fasting.updateFastingDashboard;
window.fastingExemptModeOn = false; // Also expose as global for inline HTML
