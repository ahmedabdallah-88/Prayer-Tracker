/**
 * fard-tracker.js - Prayer Tracker Module
 * Handles tracker view rendering, day clicking (4-state cycle),
 * section/view switching, stats, batch marking, and year overview.
 *
 * Part of window.App.Tracker IIFE.
 */
window.App = window.App || {};
window.App.Tracker = (function() {
    'use strict';

    // ==================== HELPER REFERENCES ====================

    function _getStorage()  { return window.App.Storage; }
    function _getHijri()    { return window.App.Hijri; }
    function _getFemale()   { return window.App.Female; }
    function _getUI()       { return window.App.UI; }
    function _getI18n()     { return window.App.I18n; }

    // Track whether today-pulse animation has been shown (once per session)
    var _todayPulseShown = {};
    // Section transition tracking
    var _sectionOrder = { fard: 0, sunnah: 1, fasting: 2, azkar: 3 };
    var _currentSectionIdx = -1; // -1 = first load (no animation)

    // ==================== PRIVATE HELPERS ====================

    function createDualDayNum(hijriDay, hYear, hMonth) {
        var frag = document.createDocumentFragment();
        var dayNum = document.createElement('span');
        dayNum.className = 'day-number';
        dayNum.textContent = hijriDay;
        frag.appendChild(dayNum);

        try {
            var gDate = _getHijri().hijriToGregorian(hYear, hMonth, hijriDay);
            var gregSpan = document.createElement('span');
            gregSpan.className = 'day-greg';
            gregSpan.textContent = gDate.getDate();
            frag.appendChild(gregSpan);
        } catch(e) {}

        // Hidden Material icon (shown by CSS for congregation/qada)
        var iconSpan = document.createElement('span');
        iconSpan.className = 'day-icon material-symbols-rounded';
        iconSpan.style.display = 'none';
        iconSpan.style.fontSize = '13px';
        iconSpan.textContent = 'mosque';
        frag.appendChild(iconSpan);

        return frag;
    }

    function isCongregation(congData, prayerId, day) {
        return congData[prayerId] && congData[prayerId][day];
    }

    // ==================== switchSection (merged: base + fasting + Fiori) ====================

    function switchSection(section) {
        var Storage = _getStorage();
        var Hijri = _getHijri();

        Storage.setCurrentSection(section);

        document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
        document.querySelectorAll('.main-toggle-btn').forEach(function(b) { b.classList.remove('active'); });

        if (section === 'azkar') {
            // Azkar section
            var azkarSec = document.getElementById('azkarSection');
            if (azkarSec) azkarSec.classList.add('active');
            var azkarBtn = document.getElementById('azkarToggleBtn');
            if (azkarBtn) azkarBtn.classList.add('active');

            var todayHA = Hijri.getTodayHijri();
            var azMonthEl = document.getElementById('azkarTrackerMonth');
            var azYearEl = document.getElementById('azkarTrackerYear');
            if (azMonthEl) azMonthEl.value = todayHA.month;
            if (azYearEl) azYearEl.value = todayHA.year;
            var azDashYear = document.getElementById('azkarDashboardYear');
            if (azDashYear) azDashYear.value = todayHA.year;
            var azYearlyYear = document.getElementById('azkarYearlyYear');
            if (azYearlyYear) azYearlyYear.value = todayHA.year;

            if (typeof window.switchAzkarView === 'function') {
                window.switchAzkarView('tracker');
            }
        } else if (section === 'fasting') {
            // Fasting override branch
            var fastSec = document.getElementById('fastingSection');
            var fastBtn = document.getElementById('fastingToggleBtn');
            if (fastSec) fastSec.classList.add('active');
            if (fastBtn) fastBtn.classList.add('active');

            var todayH = Hijri.getTodayHijri();
            var fYearInput = document.getElementById('fastingYearInput');
            var fMonthSel = document.getElementById('fastingMonthSelect');
            var fYearVol = document.getElementById('fastingYearVoluntary');
            if (fYearInput) fYearInput.value = Hijri.getCurrentHijriYear();
            if (fMonthSel) fMonthSel.value = todayH.month;
            if (fYearVol) fYearVol.value = Hijri.getCurrentHijriYear();

            if (typeof window.switchFastingView === 'function') {
                window.switchFastingView('voluntary');
            }
        } else if (section === 'fard') {
            var fardSec = document.getElementById('fardSection');
            if (fardSec) fardSec.classList.add('active');
            try { document.querySelector('.main-toggle-btn:nth-child(1)').classList.add('active'); } catch(e) {}
            var todayHF = Hijri.getTodayHijri();
            var fardMonthEl = document.getElementById('fardTrackerMonthSelect');
            var fardYearEl = document.getElementById('fardTrackerYearInput');
            var hMonth = (fardMonthEl ? parseInt(fardMonthEl.value) : 0) || todayHF.month;
            var hYear  = (fardYearEl ? parseInt(fardYearEl.value) : 0) || todayHF.year;
            Hijri.setCurrentHijriMonth(hMonth);
            Hijri.setCurrentHijriYear(hYear);
            Storage.setCurrentMonth(hMonth);
            Storage.setCurrentYear(hYear);
            Storage.loadAllData('fard');
            _activeTab.fard = null; // Reset so auto-select picks current prayer
            updateTrackerView('fard');
        } else {
            // sunnah
            var sunSec = document.getElementById('sunnahSection');
            if (sunSec) sunSec.classList.add('active');
            try { document.querySelector('.main-toggle-btn:nth-child(2)').classList.add('active'); } catch(e) {}
            var todayHS = Hijri.getTodayHijri();
            var sunMonthEl = document.getElementById('sunnahTrackerMonthSelect');
            var sunYearEl = document.getElementById('sunnahTrackerYearInput');
            var hMonthS = (sunMonthEl ? parseInt(sunMonthEl.value) : 0) || todayHS.month;
            var hYearS  = (sunYearEl ? parseInt(sunYearEl.value) : 0) || todayHS.year;
            Hijri.setCurrentHijriMonth(hMonthS);
            Hijri.setCurrentHijriYear(hYearS);
            Storage.setCurrentMonth(hMonthS);
            Storage.setCurrentYear(hYearS);
            Storage.loadAllData('sunnah');
            updateTrackerView('sunnah');
        }

        // Fard-specific: delayed reminder check
        if (section === 'fard') {
            setTimeout(function() { _getUI().checkPrayerReminders(); }, 300);
        }

        // Fiori: update shell bar
        if (typeof window.updateShellBar === 'function') {
            window.updateShellBar();
        }

        // ── Section slide-in animation ──
        var newIdx = _sectionOrder[section] !== undefined ? _sectionOrder[section] : 0;
        var oldIdx = _currentSectionIdx;
        _currentSectionIdx = newIdx;

        // Skip animation on first load or same tab
        if (oldIdx < 0 || oldIdx === newIdx) return;

        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) return;

        var sectionIds = { fard: 'fardSection', sunnah: 'sunnahSection', fasting: 'fastingSection', azkar: 'azkarSection' };
        var target = document.getElementById(sectionIds[section]);
        if (!target) return;

        var isRtl = document.documentElement.dir === 'rtl' || getComputedStyle(document.documentElement).direction === 'rtl';
        var goingHigher = newIdx > oldIdx;
        // In RTL: higher index = left; In LTR: higher index = right
        var startX = (isRtl ? goingHigher : !goingHigher) ? '-25px' : '25px';

        target.style.opacity = '0';
        target.style.transform = 'translateX(' + startX + ')';
        void target.offsetWidth;
        target.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        target.style.opacity = '1';
        target.style.transform = 'translateX(0)';
        setTimeout(function() {
            target.style.transition = '';
            target.style.opacity = '';
            target.style.transform = '';
        }, 260);
    }

    // ==================== switchView (merged: base + Fiori sub-tabs) ====================

    function switchView(type, view) {
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
        var Storage = _getStorage();
        var Hijri = _getHijri();
        var prefix = type;

        document.querySelectorAll('#' + prefix + 'Section .view').forEach(function(v) { v.classList.remove('active'); });
        document.querySelectorAll('#' + prefix + 'Section .toggle-btn').forEach(function(b) { b.classList.remove('active'); });

        if (view === 'tracker') {
            var trkView = document.getElementById(prefix + 'TrackerView');
            if (trkView) trkView.classList.add('active');
            try { document.querySelector('#' + prefix + 'Section .toggle-btn:nth-child(1)').classList.add('active'); } catch(e) {}
            var todayH = Hijri.getTodayHijri();
            var mSelEl = document.getElementById(prefix + 'TrackerMonthSelect');
            var yInpEl = document.getElementById(prefix + 'TrackerYearInput');
            var hMonth = (mSelEl ? parseInt(mSelEl.value) : 0) || todayH.month;
            var hYear  = (yInpEl ? parseInt(yInpEl.value) : 0) || todayH.year;
            Hijri.setCurrentHijriMonth(hMonth);
            Hijri.setCurrentHijriYear(hYear);
            Storage.setCurrentMonth(hMonth);
            Storage.setCurrentYear(hYear);
            if (mSelEl) mSelEl.value = hMonth;
            if (yInpEl) yInpEl.value = hYear;
            Storage.loadAllData(type);
            updateTrackerView(type);
        } else if (view === 'yearly') {
            var yrlyView = document.getElementById(prefix + 'YearlyView');
            if (yrlyView) yrlyView.classList.add('active');
            try { document.querySelector('#' + prefix + 'Section .toggle-btn:nth-child(2)').classList.add('active'); } catch(e) {}
            var yrlyEl = document.getElementById(prefix + 'YearlyYear');
            var yearlyYear = yrlyEl ? parseInt(yrlyEl.value) : Hijri.getCurrentHijriYear();
            Hijri.setCurrentHijriYear(yearlyYear);
            Storage.setCurrentYear(yearlyYear);
            Storage.loadAllData(type);
            if (typeof window.updateYearlyView === 'function') {
                window.updateYearlyView(type);
            }
        } else if (view === 'qada') {
            var qadaView = document.getElementById(prefix + 'QadaView');
            if (qadaView) qadaView.classList.add('active');
            var todayHQ = Hijri.getTodayHijri();
            Hijri.setCurrentHijriMonth(todayHQ.month);
            Hijri.setCurrentHijriYear(todayHQ.year);
            Storage.setCurrentMonth(todayHQ.month);
            Storage.setCurrentYear(todayHQ.year);
            // Update month label
            var qLabel = document.getElementById('qadaTrackerMonthLabel');
            if (qLabel) qLabel.textContent = Hijri.getHijriMonthName(todayHQ.month - 1) + ' ' + todayHQ.year;
            if (window.App.QadaTracker) window.App.QadaTracker.render();
            if (window.App.QadaDashboard) window.App.QadaDashboard.initQadaViewToggle();
        } else if (view === 'dashboard') {
            var dshView = document.getElementById(prefix + 'DashboardView');
            if (dshView) dshView.classList.add('active');
            try { document.querySelector('#' + prefix + 'Section .toggle-btn:nth-child(3)').classList.add('active'); } catch(e) {}
            var dshEl = document.getElementById(prefix + 'DashboardYear');
            var dashYear = dshEl ? parseInt(dshEl.value) : Hijri.getCurrentHijriYear();
            Hijri.setCurrentHijriYear(dashYear);
            Storage.setCurrentYear(dashYear);
            Storage.loadAllData(type);
            if (typeof window.updateDashboard === 'function') {
                window.updateDashboard(type);
            }
        }

        // Fiori: update sub-tab active state + sliding pill
        var subTabs = document.getElementById(prefix + 'SubTabs');
        if (subTabs) {
            var tabs = subTabs.querySelectorAll('.sub-tab');
            var numTabs = tabs.length;
            var viewOrder = ['tracker', 'yearly', 'qada', 'dashboard'];
            var pillPos = 0;
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('active');
            }
            // Find which tab index matches the current view
            // Tab order: tracker(0), yearly(1), [qada if exists], dashboard(last)
            if (view === 'tracker') { pillPos = 0; }
            else if (view === 'yearly') { pillPos = 1; }
            else if (view === 'qada' && numTabs === 4) { pillPos = 2; }
            else if (view === 'dashboard') { pillPos = numTabs - 1; }
            if (tabs[pillPos]) tabs[pillPos].classList.add('active');
            // Animate sliding pill
            var pill = subTabs.querySelector('.sub-tabs-pill');
            if (pill) pill.setAttribute('data-pos', pillPos);
        }

        // Add slide-in animation to the active view
        var activeView = document.querySelector('#' + prefix + 'Section .view.active');
        if (activeView) {
            activeView.classList.remove('view-slide-in');
            void activeView.offsetWidth;
            activeView.classList.add('view-slide-in');
            setTimeout(function() { activeView.classList.remove('view-slide-in'); }, 300);
        }
    }

    // ==================== updateTrackerView ====================

    function updateTrackerView(type) {
        var Hijri = _getHijri();
        var Storage = _getStorage();

        var utMonthEl = document.getElementById(type + 'TrackerMonthSelect');
        var utYearEl = document.getElementById(type + 'TrackerYearInput');
        var hMonth = utMonthEl ? parseInt(utMonthEl.value) : Hijri.getCurrentHijriMonth();
        var hYear  = utYearEl ? parseInt(utYearEl.value) : Hijri.getCurrentHijriYear();
        Hijri.setCurrentHijriMonth(hMonth);
        Hijri.setCurrentHijriYear(hYear);
        Storage.setCurrentMonth(hMonth);
        Storage.setCurrentYear(hYear);

        // Update header with Hijri display
        var headerEl = document.getElementById(type + 'TrackerHijriHeader');
        if (headerEl) {
            var textEl = document.getElementById(type + 'TrackerHijriHeaderText');
            if (textEl) {
                textEl.textContent = Hijri.formatHijriMonthHeader(hYear, hMonth);
            } else {
                headerEl.textContent = Hijri.formatHijriMonthHeader(hYear, hMonth);
            }
        }

        // Update month days button
        if (typeof window.updateMonthDaysButton === 'function') {
            window.updateMonthDaysButton();
        }

        Storage.loadAllData(type);
        renderTrackerMonth(type, true);
        updateTrackerStats(type);
        if (typeof window.renderStreaks === 'function') {
            window.renderStreaks(type);
        }
    }

    // ==================== STATS ROW BUILDER ====================
    function _buildProgressRing(pct) {
        var r = 18, sw = 5, size = 52;
        var c = size / 2;
        var circ = 2 * Math.PI * r;
        var offset = circ - (pct / 100) * circ;
        if (offset < 0) offset = 0;
        if (offset > circ) offset = circ;
        var strokeColor = pct >= 80 ? '#2D6A4F' : pct >= 50 ? '#D4A03C' : '#C1574E';
        var rot = 'rotate(-90 ' + c + ' ' + c + ')';
        return '<div class="stats-ring-wrap">' +
            '<svg viewBox="0 0 ' + size + ' ' + size + '">' +
            '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="rgba(128,128,128,0.15)" stroke-width="' + sw + '"/>' +
            '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '" transform="' + rot + '"/>' +
            '</svg>' +
            '<span class="stats-ring-pct" style="color:' + strokeColor + '">' + pct + '%</span>' +
            '</div>';
    }

    function _buildStatsRow(opts) {
        // opts: { pct, completed, total, congCount, showJamaah, label, dayLabel }
        var html = '<div class="stats-section">' + _buildProgressRing(opts.pct) + '</div>';

        if (opts.showJamaah) {
            html += '<div class="stats-divider"></div>' +
                '<div class="stats-section">' +
                '<div class="stats-icon-wrap jamaah"><span class="material-symbols-rounded" style="font-size:22px;color:var(--accent);font-variation-settings:\'FILL\' 1,\'wght\' 600">mosque</span></div>' +
                '<span class="stats-value jamaah-val">' + (opts.congCount || 0) + '</span>' +
                '</div>';
        }

        html += '<div class="stats-divider"></div>' +
            '<div class="stats-section">' +
            '<div class="stats-icon-wrap days"><span class="material-symbols-rounded" style="font-size:20px;color:var(--text-muted);font-variation-settings:\'FILL\' 1,\'wght\' 500">calendar_today</span></div>' +
            '<span class="stats-value days-val">' + opts.completed + '<span class="days-total">/' + opts.total + '</span></span>' +
            '</div>';

        return html;
    }

    // ==================== PRAYER TAB STATE ====================
    var _activeTab = { fard: null, sunnah: null };

    var SKY_GRADIENTS = {
        'fajr': 'linear-gradient(135deg, #E8B4B8, #C48A90)',
        'dhuhr': 'linear-gradient(135deg, #F0C75E, #D4A030)',
        'asr': 'linear-gradient(135deg, #E8A849, #C07828)',
        'maghrib': 'linear-gradient(135deg, #C47A5A, #9E5238)',
        'isha': 'linear-gradient(135deg, #5B6B8A, #3A4A68)',
        'tahajjud': 'linear-gradient(135deg, #2e4482, #1e3a8a)',
        'sunnah-fajr': 'linear-gradient(135deg, #E8B4B8, #C48A90)',
        'duha': 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        'sunnah-dhuhr': 'linear-gradient(135deg, #F0C75E, #D4A030)',
        'sunnah-asr': 'linear-gradient(135deg, #E8A849, #C07828)',
        'sunnah-maghrib': 'linear-gradient(135deg, #C47A5A, #9E5238)',
        'sunnah-isha': 'linear-gradient(135deg, #5B6B8A, #3A4A68)',
        'witr': 'linear-gradient(135deg, #7C6DAF, #5A4B8A)'
    };

    var SKY_SHADOWS = {
        'fajr': 'rgba(196,138,144,0.35)', 'dhuhr': 'rgba(212,160,48,0.35)',
        'asr': 'rgba(192,120,40,0.35)', 'maghrib': 'rgba(158,82,56,0.35)',
        'isha': 'rgba(58,74,104,0.35)', 'tahajjud': 'rgba(30,58,138,0.35)',
        'sunnah-fajr': 'rgba(196,138,144,0.35)', 'duha': 'rgba(245,158,11,0.35)',
        'sunnah-dhuhr': 'rgba(212,160,48,0.35)', 'sunnah-asr': 'rgba(192,120,40,0.35)',
        'sunnah-maghrib': 'rgba(158,82,56,0.35)', 'sunnah-isha': 'rgba(58,74,104,0.35)',
        'witr': 'rgba(90,75,138,0.35)'
    };

    function _getDefaultPrayerTab(type) {
        if (type === 'sunnah') return 'sunnah-fajr';
        // Auto-select based on current prayer time (fard, current month only)
        var Hijri = _getHijri();
        var todayH = Hijri.getTodayHijri();
        var hYear = Hijri.getCurrentHijriYear();
        var hMonth = Hijri.getCurrentHijriMonth();
        if (todayH.year === hYear && todayH.month === hMonth) {
            try {
                // Try live prayer state first
                var state = window.getCurrentPrayerState ? window.getCurrentPrayerState() : null;
                if (state) {
                    if (state.active) return state.active;
                    return 'isha'; // Before fajr — show last prayer
                }
                // Fallback: read cached prayer times from localStorage
                var stored = localStorage.getItem('salah_prayer_times');
                if (stored) {
                    var data = JSON.parse(stored);
                    var todayStr = new Date().toISOString().split('T')[0];
                    if (data.date === todayStr && data.timings) {
                        var now = new Date();
                        var nowMin = now.getHours() * 60 + now.getMinutes();
                        var ids = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
                        var times = [];
                        for (var ti = 0; ti < ids.length; ti++) {
                            var clean = (data.timings[ids[ti]] || '').replace(/\s*\(.*\)/, '').trim();
                            var parts = clean.split(':');
                            times.push(parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0));
                        }
                        var active = null;
                        for (var tj = 0; tj < ids.length; tj++) {
                            var end = tj + 1 < ids.length ? times[tj + 1] : 1440;
                            if (nowMin >= times[tj] && nowMin < end) {
                                active = ids[tj];
                                break;
                            }
                        }
                        if (active) return active;
                        return 'isha'; // Before fajr
                    }
                }
            } catch(e) {}
        }
        return 'fajr';
    }

    function _getActiveTab(type) {
        if (!_activeTab[type]) {
            _activeTab[type] = _getDefaultPrayerTab(type);
        }
        return _activeTab[type];
    }

    // ==================== Complete Week Glow ====================
    function _applyWeekGlow(grid) {
        if (!grid) return;
        var boxes = grid.querySelectorAll('.day-box');
        if (!boxes.length) return;

        // Remove old glow classes
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].classList.remove('week-complete', 'week-complete-jamaah');
        }

        // Process visual rows of 7
        for (var rowStart = 0; rowStart < boxes.length; rowStart += 7) {
            var rowEnd = Math.min(rowStart + 7, boxes.length);
            if (rowEnd - rowStart < 7) break; // skip partial last row

            var allPrayed = true;
            var allJamaah = true;

            for (var k = rowStart; k < rowEnd; k++) {
                var box = boxes[k];
                var isExempt = box.classList.contains('exempt');
                if (isExempt) {
                    allJamaah = false;
                    continue;
                }
                var isPrayed = box.classList.contains('checked') || box.classList.contains('congregation');
                if (!isPrayed) {
                    allPrayed = false;
                    allJamaah = false;
                    break;
                }
                if (!box.classList.contains('congregation')) {
                    allJamaah = false;
                }
            }

            if (allPrayed) {
                var cls = allJamaah ? 'week-complete-jamaah' : 'week-complete';
                for (var m = rowStart; m < rowEnd; m++) {
                    if (!boxes[m].classList.contains('exempt')) {
                        boxes[m].classList.add(cls);
                    }
                }
            }
        }
    }

    // ==================== renderTrackerMonth (Tab-based single calendar) ====================

    function renderTrackerMonth(type, scrollToTab) {
        var Storage = _getStorage();
        var Hijri   = _getHijri();
        var Female  = _getFemale();
        var I18n    = _getI18n();

        var container = document.getElementById(type + 'TrackerPrayersContainer');
        if (!container) return;
        container.innerHTML = '';
        // Strip outer .prayers-container card so individual cards stand alone
        container.style.background = 'transparent';
        container.style.border = 'none';
        container.style.padding = '0';
        container.style.boxShadow = 'none';
        container.style.borderRadius = '0';
        container.style.overflow = 'hidden';
        container.style.maxWidth = '100%';

        var prayers     = Storage.getPrayersArray(type);
        var dataObj     = Storage.getDataObject(type);
        var hYear       = Hijri.getCurrentHijriYear();
        var hMonth      = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(hYear, hMonth);
        var profile     = Storage.getActiveProfile();
        var isFemale    = profile && profile.gender === 'female' && profile.age >= 12;
        var isFemaleUser = isFemale;
        var exemptData  = isFemale ? Female.getExemptDays(hYear, hMonth) : {};
        var currentLang = I18n.getCurrentLang();
        var todayH = Hijri.getTodayHijri();
        var isCurrentMonth = (todayH.year === hYear && todayH.month === hMonth);

        // Update compact month nav label
        var monthLabel = document.getElementById(type + 'TrackerMonthLabel');
        if (monthLabel) {
            monthLabel.textContent = Hijri.getHijriMonthName(hMonth - 1) + ' ' + hYear;
        }
        var daysPill = document.getElementById(type === 'fard' ? 'monthDaysToggleBtn' : type + 'MonthDaysPill');
        if (daysPill) daysPill.textContent = daysInMonth;

        var activePrayerId = _getActiveTab(type);
        // Validate tab exists in prayers array
        var found = false;
        for (var p = 0; p < prayers.length; p++) {
            if (prayers[p].id === activePrayerId) { found = true; break; }
        }
        if (!found) { activePrayerId = prayers[0].id; _activeTab[type] = activePrayerId; }

        // ── PRAYER SELECTOR (Tabs for fard, Scrollable tabs for sunnah) ──
        if (type === 'sunnah') {
            // ── SUNNAH: SCROLLABLE TABS ──
            var scroller = document.createElement('div');
            scroller.className = 'sunnah-tabs-scroller';
            scroller.id = type + 'PrayerTabs';

            var todayDay = todayH.day;
            var activeTabEl = null;

            // Track touch to distinguish scroll from tap
            var touchStartX = 0;
            var isTouchScrolling = false;
            scroller.addEventListener('touchstart', function(e) {
                touchStartX = e.touches[0].clientX;
                isTouchScrolling = false;
            }, { passive: true });
            scroller.addEventListener('touchmove', function(e) {
                if (Math.abs(e.touches[0].clientX - touchStartX) > 10) {
                    isTouchScrolling = true;
                }
            }, { passive: true });

            prayers.forEach(function(prayer) {
                var isActive = prayer.id === activePrayerId;
                var isDoneToday = isCurrentMonth && dataObj[hMonth] && dataObj[hMonth][prayer.id] && dataObj[hMonth][prayer.id][todayDay];

                var tab = document.createElement('button');
                tab.className = 'sunnah-tab' + (isActive ? ' active' : '');
                tab.setAttribute('data-prayer', prayer.id);

                var iconWrap = document.createElement('div');
                iconWrap.className = 'sunnah-tab-icon';
                var iconSize = isActive ? '22px' : '18px';
                var iconColor = isActive ? '#fff' : 'var(--text-muted)';
                var iconFill = isActive ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400";
                iconWrap.innerHTML = '<span class="material-symbols-rounded" style="font-size:' + iconSize + ';color:' + iconColor + ';font-variation-settings:' + iconFill + '">' + prayer.icon + '</span>';

                var nameSpan = document.createElement('span');
                nameSpan.className = 'sunnah-tab-name';
                nameSpan.textContent = I18n.getPrayerName(prayer.id);

                tab.appendChild(iconWrap);
                tab.appendChild(nameSpan);

                tab.onclick = (function(pid) {
                    return function() {
                        if (isTouchScrolling) { isTouchScrolling = false; return; }
                        _activeTab[type] = pid;
                        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
                        renderTrackerMonth(type, true);
                    };
                })(prayer.id);

                scroller.appendChild(tab);
                if (isActive) activeTabEl = tab;
            });

            // Wrap scroller in fade-affordance wrapper
            var scrollWrapper = document.createElement('div');
            scrollWrapper.className = 'sunnah-scroll-wrapper';
            scrollWrapper.appendChild(scroller);
            container.appendChild(scrollWrapper);

            // Fade edges based on scroll position
            scroller.addEventListener('scroll', function() {
                var wrapper = scroller.parentElement;
                if (!wrapper) return;
                var maxScroll = scroller.scrollWidth - scroller.clientWidth;
                var scrollPos = Math.abs(scroller.scrollLeft);

                var hasLeft = scrollPos < maxScroll - 5;
                var hasRight = scrollPos > 5;

                wrapper.classList.toggle('fade-left', hasLeft);
                wrapper.classList.toggle('fade-right', hasRight);
            }, { passive: true });

            // Scroll active tab into view after DOM append
            if (activeTabEl) {
                requestAnimationFrame(function() {
                    activeTabEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
                    // Trigger scroll handler to set initial fade state
                    scroller.dispatchEvent(new Event('scroll'));
                });
            } else {
                requestAnimationFrame(function() {
                    scroller.dispatchEvent(new Event('scroll'));
                });
            }
        } else {
            // ── FARD: TABS LAYOUT ──
            var tabsContainer = document.createElement('div');
            tabsContainer.className = 'prayer-tabs-container';
            tabsContainer.id = type + 'PrayerTabs';

            var tabPill = document.createElement('div');
            tabPill.className = 'prayer-tabs-pill';
            tabsContainer.appendChild(tabPill);

            var activeIdx = 0;
            prayers.forEach(function(prayer, idx) {
                if (prayer.id === activePrayerId) activeIdx = idx;
                var tab = document.createElement('button');
                tab.className = 'prayer-tab' + (prayer.id === activePrayerId ? ' active' : '');
                tab.setAttribute('data-prayer', prayer.id);

                var iconWrap = document.createElement('div');
                iconWrap.className = 'prayer-tab-icon';
                if (prayer.id === activePrayerId) {
                    iconWrap.style.background = SKY_GRADIENTS[prayer.id] || '#888';
                    iconWrap.style.boxShadow = '0 4px 10px ' + (SKY_SHADOWS[prayer.id] || 'rgba(0,0,0,0.2)');
                }
                iconWrap.innerHTML = '<span class="material-symbols-rounded">' + prayer.icon + '</span>';

                var nameSpan = document.createElement('span');
                nameSpan.className = 'prayer-tab-name';
                nameSpan.textContent = I18n.getPrayerName(prayer.id);

                tab.appendChild(iconWrap);
                tab.appendChild(nameSpan);

                tab.onclick = (function(pid, iconEl) {
                    return function() {
                        iconEl.classList.add('tap-anim');
                        setTimeout(function() { iconEl.classList.remove('tap-anim'); }, 100);
                        _activeTab[type] = pid;
                        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
                        renderTrackerMonth(type);
                    };
                })(prayer.id, iconWrap);

                tabsContainer.appendChild(tab);
            });

            container.appendChild(tabsContainer);

            // Position pill after DOM insertion
            requestAnimationFrame(function() {
                var tabs = tabsContainer.querySelectorAll('.prayer-tab');
                if (tabs[activeIdx]) {
                    var tt = tabs[activeIdx];
                    var isRTL = document.documentElement.dir === 'rtl';
                    tabPill.style.width = tt.offsetWidth + 'px';
                    if (isRTL) {
                        var rightOffset = tabsContainer.offsetWidth - tt.offsetLeft - tt.offsetWidth;
                        tabPill.style.transform = 'translateX(-' + rightOffset + 'px)';
                    } else {
                        tabPill.style.transform = 'translateX(' + tt.offsetLeft + 'px)';
                    }
                }
            });
        }

        // ── STATS ROW (Card 1 — own glassmorphism styling) ──
        var activePrayer = null;
        for (var pi = 0; pi < prayers.length; pi++) {
            if (prayers[pi].id === activePrayerId) { activePrayer = prayers[pi]; break; }
        }

        var completed = 0;
        var exemptCount = isFemale ? Female.getExemptCountForPrayer(hYear, hMonth, activePrayerId) : 0;
        if (dataObj[hMonth] && dataObj[hMonth][activePrayerId]) {
            completed = Object.values(dataObj[hMonth][activePrayerId]).filter(function(v) { return v; }).length;
        }
        var adjustedTotal = daysInMonth - exemptCount;
        var pct = adjustedTotal > 0 ? Math.round((completed / adjustedTotal) * 100) : 0;

        var congCount = 0;
        if (type === 'fard') {
            var congDataH = Storage.getCongregationData(hYear, hMonth);
            if (congDataH[activePrayerId]) {
                congCount = Object.values(congDataH[activePrayerId]).filter(Boolean).length;
            }
        }

        var statsRow = document.createElement('div');
        statsRow.className = 'prayer-tab-stats';
        statsRow.innerHTML = _buildStatsRow({
            pct: pct,
            completed: completed,
            total: adjustedTotal,
            congCount: congCount,
            showJamaah: type === 'fard',
            dayLabel: 'الأيام'
        });
        container.appendChild(statsRow);

        // ── CALENDAR CARD (Card 2 — grid + legend) ──
        var trackerCard = document.createElement('div');
        trackerCard.className = 'tracker-card';

        // ── SINGLE CALENDAR GRID ──
        var gridWrap = document.createElement('div');
        gridWrap.className = 'prayer-tab-grid';
        var grid = document.createElement('div');
        grid.className = 'days-grid flow-grid';

        for (var day = 1; day <= daysInMonth; day++) {
            var dayBox = document.createElement('div');
            dayBox.className = 'day-box';
            dayBox.setAttribute('role', 'button');
            dayBox.setAttribute('tabindex', '0');
            dayBox.setAttribute('aria-label', I18n.getPrayerName(activePrayerId) + ' - ' + day);

            dayBox.appendChild(createDualDayNum(day, hYear, hMonth));

            try {
                var gDate = Hijri.hijriToGregorian(hYear, hMonth, day);
                dayBox.title = gDate.getDate() + '/' + (gDate.getMonth() + 1) + '/' + gDate.getFullYear();
            } catch(e) {}

            var isDayToday = isCurrentMonth && todayH.day === day;
            if (isDayToday) {
                dayBox.classList.add('today-box');
                if (!_todayPulseShown[type]) {
                    dayBox.classList.add('today-pulse');
                }
            }

            if (Hijri.isFutureDateHijri(day, hMonth, hYear)) {
                dayBox.classList.add('disabled');
            } else {
                var isExempt = Female.isPrayerExempt(exemptData, activePrayerId, day);
                if (isExempt) {
                    dayBox.classList.add('exempt');
                } else if (dataObj[hMonth][activePrayerId] && dataObj[hMonth][activePrayerId][day]) {
                    dayBox.classList.add('checked');
                    if (type === 'fard') {
                        var congData = Storage.getCongregationData(hYear, hMonth);
                        if (isCongregation(congData, activePrayerId, day)) {
                            dayBox.classList.add('congregation');
                            dayBox.classList.remove('checked');
                        }
                    }
                    var qadaData = Storage.getQadaData(hYear, hMonth);
                    if (qadaData[activePrayerId] && qadaData[activePrayerId][day]) {
                        dayBox.classList.remove('checked', 'congregation');
                        dayBox.classList.add('qada');
                    }
                }
                dayBox.onclick = (function(t, pId, d) {
                    return function() { handleDayClick(t, pId, d); };
                })(type, activePrayerId, day);
            }

            grid.appendChild(dayBox);
        }

        // Mark pulse as shown for this type after first render
        if (isCurrentMonth) _todayPulseShown[type] = true;

        gridWrap.appendChild(grid);
        trackerCard.appendChild(gridWrap);

        // ── LEGEND ──
        var legend = document.createElement('div');
        legend.className = 'prayer-legend';
        if (type === 'fard') {
            legend.innerHTML =
                '<div class="legend-item"><div class="legend-dot checked-dot"><span class="material-symbols-rounded" style="font-size:10px;color:white;">check</span></div><span>' + (currentLang === 'ar' ? 'منفرد' : 'Alone') + '</span></div>' +
                '<div class="legend-item"><div class="legend-dot cong-dot"><span class="material-symbols-rounded" style="font-size:10px;color:white;">mosque</span></div><span>' + (currentLang === 'ar' ? 'جماعة' : 'Congregation') + '</span></div>' +
                '<div class="legend-item"><div class="legend-dot qada-dot"><span class="material-symbols-rounded" style="font-size:10px;color:white;">schedule</span></div><span>' + (currentLang === 'ar' ? 'قضاء' : 'Qada') + '</span></div>';
            if (isFemaleUser) {
                legend.innerHTML +=
                    '<div class="legend-item"><div class="legend-dot exempt-dot"><span class="material-symbols-rounded" style="font-size:10px;color:white;">do_not_disturb</span></div><span>' + (currentLang === 'ar' ? 'إعفاء' : 'Exemption') + '</span></div>';
            }
        } else {
            legend.innerHTML =
                '<div class="legend-item"><div class="legend-dot checked-dot"><span class="material-symbols-rounded" style="font-size:10px;color:white;">check</span></div><span>' + (currentLang === 'ar' ? 'مؤداة' : 'Done') + '</span></div>';
            if (isFemaleUser) {
                legend.innerHTML +=
                    '<div class="legend-item"><div class="legend-dot exempt-dot"><span class="material-symbols-rounded" style="font-size:10px;color:white;">do_not_disturb</span></div><span>' + (currentLang === 'ar' ? 'إعفاء' : 'Exemption') + '</span></div>';
            }
        }
        trackerCard.appendChild(legend);
        container.appendChild(trackerCard);

        // ── Feature #10: Stagger fade-in on month change (when scrollToTab is truthy) ──
        if (scrollToTab) {
            var allDayBoxes = grid.querySelectorAll('.day-box');
            var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!reducedMotion) {
                for (var si = 0; si < allDayBoxes.length; si++) {
                    allDayBoxes[si].classList.add('day-entering');
                    allDayBoxes[si].style.animationDelay = (si * 15) + 'ms';
                }
                // After stagger completes: remove day-entering, then apply week glow
                var staggerMs = allDayBoxes.length * 15 + 300;
                setTimeout(function() {
                    for (var ri = 0; ri < allDayBoxes.length; ri++) {
                        allDayBoxes[ri].classList.remove('day-entering');
                        allDayBoxes[ri].style.animationDelay = '';
                    }
                    _applyWeekGlow(grid);
                }, staggerMs);
            } else {
                _applyWeekGlow(grid);
            }
        } else {
            _applyWeekGlow(grid);
        }
    }

    // ==================== _refreshGridAndStats (lightweight re-render without tabs/chips) ====================

    function _refreshGridAndStats(type) {
        var Storage = _getStorage();
        var Hijri   = _getHijri();
        var Female  = _getFemale();
        var I18n    = _getI18n();

        var container = document.getElementById(type + 'TrackerPrayersContainer');
        if (!container) return;

        var prayers     = Storage.getPrayersArray(type);
        var dataObj     = Storage.getDataObject(type);
        var hYear       = Hijri.getCurrentHijriYear();
        var hMonth      = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(hYear, hMonth);
        var profile     = Storage.getActiveProfile();
        var isFemale    = profile && profile.gender === 'female' && profile.age >= 12;
        var isFemaleUser = isFemale;
        var exemptData  = isFemale ? Female.getExemptDays(hYear, hMonth) : {};
        var currentLang = I18n.getCurrentLang();
        var todayH      = Hijri.getTodayHijri();
        var isCurrentMonth = (todayH.year === hYear && todayH.month === hMonth);

        var activePrayerId = _getActiveTab(type);

        // ── Rebuild STATS ROW ──
        var oldStats = container.querySelector('.prayer-tab-stats');
        if (oldStats) {
            var completed = 0;
            var exemptCount = isFemale ? Female.getExemptCountForPrayer(hYear, hMonth, activePrayerId) : 0;
            if (dataObj[hMonth] && dataObj[hMonth][activePrayerId]) {
                completed = Object.values(dataObj[hMonth][activePrayerId]).filter(function(v) { return v; }).length;
            }
            var adjustedTotal = daysInMonth - exemptCount;
            var pct = adjustedTotal > 0 ? Math.round((completed / adjustedTotal) * 100) : 0;

            var congCount = 0;
            if (type === 'fard') {
                var congDataH = Storage.getCongregationData(hYear, hMonth);
                if (congDataH[activePrayerId]) {
                    congCount = Object.values(congDataH[activePrayerId]).filter(Boolean).length;
                }
            }

            oldStats.innerHTML = _buildStatsRow({
                pct: pct,
                completed: completed,
                total: adjustedTotal,
                congCount: congCount,
                showJamaah: type === 'fard',
                dayLabel: 'الأيام'
            });
        }

        // ── Rebuild CALENDAR GRID ──
        var oldGridWrap = container.querySelector('.prayer-tab-grid');
        if (oldGridWrap) {
            var grid = document.createElement('div');
            grid.className = 'days-grid flow-grid';

            for (var day = 1; day <= daysInMonth; day++) {
                var dayBox = document.createElement('div');
                dayBox.className = 'day-box';
                dayBox.setAttribute('role', 'button');
                dayBox.setAttribute('tabindex', '0');
                dayBox.setAttribute('aria-label', I18n.getPrayerName(activePrayerId) + ' - ' + day);

                dayBox.appendChild(createDualDayNum(day, hYear, hMonth));

                try {
                    var gDate = Hijri.hijriToGregorian(hYear, hMonth, day);
                    dayBox.title = gDate.getDate() + '/' + (gDate.getMonth() + 1) + '/' + gDate.getFullYear();
                } catch(e) {}

                var isDayToday = isCurrentMonth && todayH.day === day;
                if (isDayToday) dayBox.classList.add('today-box');

                if (Hijri.isFutureDateHijri(day, hMonth, hYear)) {
                    dayBox.classList.add('disabled');
                } else {
                    var isExempt = Female.isPrayerExempt(exemptData, activePrayerId, day);
                    if (isExempt) {
                        dayBox.classList.add('exempt');
                    } else if (dataObj[hMonth][activePrayerId] && dataObj[hMonth][activePrayerId][day]) {
                        dayBox.classList.add('checked');
                        if (type === 'fard') {
                            var congData = Storage.getCongregationData(hYear, hMonth);
                            if (isCongregation(congData, activePrayerId, day)) {
                                dayBox.classList.add('congregation');
                                dayBox.classList.remove('checked');
                            }
                        }
                        var qadaData = Storage.getQadaData(hYear, hMonth);
                        if (qadaData[activePrayerId] && qadaData[activePrayerId][day]) {
                            dayBox.classList.remove('checked', 'congregation');
                            dayBox.classList.add('qada');
                        }
                    }
                    dayBox.onclick = (function(t, pId, d) {
                        return function() { handleDayClick(t, pId, d); };
                    })(type, activePrayerId, day);
                }

                grid.appendChild(dayBox);
            }

            _applyWeekGlow(grid);

            oldGridWrap.innerHTML = '';
            oldGridWrap.appendChild(grid);
        }
    }

    // ==================== toggleTrackerDay ====================

    function toggleTrackerDay(type, prayerId, day) {
        var Storage = _getStorage();
        var Hijri   = _getHijri();

        if (Storage.isFutureDate(day, Storage.getCurrentMonth(), Storage.getCurrentYear())) {
            _getUI().showToast(_getI18n().t('future_date'), 'warning');
            return;
        }

        var dataObj = Storage.getDataObject(type);
        var currentMonth = Storage.getCurrentMonth();

        if (!dataObj[currentMonth][prayerId]) {
            dataObj[currentMonth][prayerId] = {};
        }

        dataObj[currentMonth][prayerId][day] = !dataObj[currentMonth][prayerId][day];
        Storage.saveMonthData(type, currentMonth);
        _refreshGridAndStats(type);
        updateTrackerStats(type);
        if (typeof window.renderStreaks === 'function') {
            window.renderStreaks(type);
        }
        if (type === 'fard') {
            if (typeof window.updateCongregationStats === 'function') window.updateCongregationStats();
            _getUI().checkPrayerReminders();
        }
    }

    // ==================== updateTrackerStats (final override with exempt adjustment) ====================

    function updateTrackerStats(type) {
        var Storage = _getStorage();
        var Hijri   = _getHijri();
        var Female  = _getFemale();

        var prayers     = Storage.getPrayersArray(type);
        var dataObj     = Storage.getDataObject(type);
        var hYear       = Hijri.getCurrentHijriYear();
        var hMonth      = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(hYear, hMonth);
        var profile     = Storage.getActiveProfile();
        var isFemale    = profile && profile.gender === 'female' && profile.age >= 12;

        var totalCompleted = 0;
        var totalPossible  = 0;

        prayers.forEach(function(prayer) {
            var exemptCount  = isFemale ? Female.getExemptCountForPrayer(hYear, hMonth, prayer.id) : 0;
            var adjustedDays = daysInMonth - exemptCount;
            totalPossible += adjustedDays;

            var completed = 0;
            if (dataObj[hMonth] && dataObj[hMonth][prayer.id]) {
                completed = Object.values(dataObj[hMonth][prayer.id]).filter(function(v) { return v; }).length;
            }
            totalCompleted += completed;
        });

        var elCompleted = document.getElementById(type + 'TrackerTotalCompleted');
        var elRemaining = document.getElementById(type + 'TrackerTotalRemaining');
        var elRate = document.getElementById(type + 'TrackerCompletionRate');
        if (elCompleted) elCompleted.textContent = totalCompleted;
        if (elRemaining) elRemaining.textContent = Math.max(0, totalPossible - totalCompleted);

        var rate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
        if (elRate) elRate.textContent = rate + '%';
    }

    // ==================== changeTrackerMonth ====================

    function changeTrackerMonth(type, delta) {
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
        var Hijri   = _getHijri();
        var Storage = _getStorage();

        var hMonth = Hijri.getCurrentHijriMonth() + delta;
        var hYear  = Hijri.getCurrentHijriYear();

        if (hMonth > 12) {
            hMonth = 1;
            hYear++;
        } else if (hMonth < 1) {
            hMonth = 12;
            hYear--;
        }

        Hijri.setCurrentHijriMonth(hMonth);
        Hijri.setCurrentHijriYear(hYear);
        Storage.setCurrentMonth(hMonth);
        Storage.setCurrentYear(hYear);

        // Reset week start for weekly view
        if (window.trackerViewMode === 'week') {
            if (delta > 0) {
                window.currentWeekStart = 1;
            } else {
                window.currentWeekStart = Math.max(1, Hijri.getHijriDaysInMonth(hYear, hMonth) - 6);
            }
            if (typeof window.updateWeekLabel === 'function') {
                window.updateWeekLabel();
            }
        }

        // Animate month label slide
        var monthLabel = document.getElementById(type + 'TrackerMonthLabel');
        if (monthLabel) {
            monthLabel.classList.remove('slide-from-left', 'slide-from-right');
            void monthLabel.offsetWidth;
            var isRTL = document.documentElement.dir === 'rtl';
            var slideDir = (delta > 0) === isRTL ? 'slide-from-left' : 'slide-from-right';
            monthLabel.classList.add(slideDir);
            setTimeout(function() { monthLabel.classList.remove('slide-from-left', 'slide-from-right'); }, 250);
        }

        var elMonth = document.getElementById(type + 'TrackerMonthSelect');
        var elYear = document.getElementById(type + 'TrackerYearInput');
        if (elMonth) elMonth.value = hMonth;
        if (elYear) elYear.value = hYear;
        Storage.loadAllData(type);
        updateTrackerView(type);
    }

    // ==================== resetTrackerMonth ====================

    function resetTrackerMonth(type) {
        var Storage = _getStorage();
        var currentMonth = Storage.getCurrentMonth();

        _getUI().showConfirm(_getI18n().t('confirm_clear')).then(function(confirmed) {
            if (confirmed) {
                var dataObj = Storage.getDataObject(type);
                var prayers = Storage.getPrayersArray(type);

                dataObj[currentMonth] = {};
                prayers.forEach(function(prayer) {
                    dataObj[currentMonth][prayer.id] = {};
                });
                Storage.saveMonthData(type, currentMonth);
                renderTrackerMonth(type);
                updateTrackerStats(type);
                if (typeof window.renderStreaks === 'function') {
                    window.renderStreaks(type);
                }
            }
        });
    }

    // ==================== handleDayClick (4-state cycle) ====================

    function handleDayClick(type, prayerId, day) {
        var Storage = _getStorage();
        var Hijri   = _getHijri();
        var UI      = _getUI();
        var I18n    = _getI18n();
        var Female  = _getFemale();

        var currentMonth = Storage.getCurrentMonth();
        var currentYear  = Storage.getCurrentYear();

        if (Storage.isFutureDate(day, currentMonth, currentYear)) {
            UI.showToast(I18n.t('future_date'), 'warning');
            return;
        }

        var dataObj = Storage.getDataObject(type);
        if (!dataObj[currentMonth]) dataObj[currentMonth] = {};
        if (!dataObj[currentMonth][prayerId]) dataObj[currentMonth][prayerId] = {};

        var isChecked = dataObj[currentMonth][prayerId][day];
        var congData  = (type === 'fard') ? Storage.getCongregationData(currentYear, currentMonth) : null;
        var isCong    = congData && congData[prayerId] && congData[prayerId][day];
        var qadaData  = Storage.getQadaData(currentYear, currentMonth);
        var isQada    = qadaData[prayerId] && qadaData[prayerId][day];

        // Check if female user for 5-state cycle
        var profile = Storage.getActiveProfile();
        var isFemale = profile && profile.gender === 'female' && profile.age >= 12;
        var exemptData = isFemale ? Female.getExemptDays(currentYear, currentMonth) : {};
        var isExempt = isFemale && exemptData[day] && exemptData[day][prayerId];

        if (isFemale) {
            // 5-state cycle: empty → alone → exempt → qada → congregation → empty
            // (sunnah skips congregation: empty → alone → exempt → qada → empty)
            if (!isChecked && !isExempt) {
                // State 0 -> State 1: Mark as prayed (alone)
                dataObj[currentMonth][prayerId][day] = true;
                UI.hapticFeedback('success');
            } else if (isChecked && !isCong && !isQada && !isExempt) {
                // State 1 -> State 2: Mark as exempt
                UI.hapticFeedback('medium');
                dataObj[currentMonth][prayerId][day] = false;
                if (!exemptData[day]) exemptData[day] = {};
                exemptData[day][prayerId] = true;
                Female.saveExemptDays(currentYear, currentMonth, exemptData);
                Female.savePeriodHistory();
            } else if (isExempt) {
                // State 2 -> State 3: Mark as qada (remove exempt)
                UI.hapticFeedback('light');
                if (exemptData[day]) {
                    delete exemptData[day][prayerId];
                    if (Object.keys(exemptData[day]).length === 0) delete exemptData[day];
                }
                Female.saveExemptDays(currentYear, currentMonth, exemptData);
                Female.savePeriodHistory();
                dataObj[currentMonth][prayerId][day] = true;
                if (!qadaData[prayerId]) qadaData[prayerId] = {};
                qadaData[prayerId][day] = true;
            } else if (isQada) {
                if (type === 'fard') {
                    // State 3 -> State 4: Mark as congregation
                    UI.hapticFeedback('medium');
                    if (qadaData[prayerId]) {
                        delete qadaData[prayerId][day];
                        if (Object.keys(qadaData[prayerId]).length === 0) delete qadaData[prayerId];
                    }
                    if (!congData[prayerId]) congData[prayerId] = {};
                    congData[prayerId][day] = true;
                } else {
                    // Sunnah: State 3 -> State 0: Remove everything
                    UI.hapticFeedback('light');
                    dataObj[currentMonth][prayerId][day] = false;
                    if (qadaData[prayerId]) {
                        delete qadaData[prayerId][day];
                        if (Object.keys(qadaData[prayerId]).length === 0) delete qadaData[prayerId];
                    }
                }
            } else if (isCong) {
                // State 4 -> State 0: Remove everything
                UI.hapticFeedback('light');
                dataObj[currentMonth][prayerId][day] = false;
                if (congData[prayerId]) {
                    delete congData[prayerId][day];
                    if (Object.keys(congData[prayerId]).length === 0) delete congData[prayerId];
                }
            }
        } else {
            // Original 4-state cycle: empty → alone → congregation → qada → empty
            if (!isChecked) {
                // State 0 -> State 1: Mark as prayed (alone)
                dataObj[currentMonth][prayerId][day] = true;
                UI.hapticFeedback('success');
            } else if (isChecked && !isCong && !isQada) {
                // State 1 -> State 2: Mark as congregation
                UI.hapticFeedback('medium');
                if (type === 'fard' && congData) {
                    if (!congData[prayerId]) congData[prayerId] = {};
                    congData[prayerId][day] = true;
                } else {
                    // For sunnah: skip congregation, go to qada
                    if (!qadaData[prayerId]) qadaData[prayerId] = {};
                    qadaData[prayerId][day] = true;
                }
            } else if (isCong) {
                // State 2 -> State 3: Mark as qada
                UI.hapticFeedback('light');
                if (congData[prayerId]) {
                    delete congData[prayerId][day];
                    if (Object.keys(congData[prayerId]).length === 0) delete congData[prayerId];
                }
                if (!qadaData[prayerId]) qadaData[prayerId] = {};
                qadaData[prayerId][day] = true;
            } else if (isQada) {
                // State 3 -> State 0: Remove everything
                UI.hapticFeedback('light');
                dataObj[currentMonth][prayerId][day] = false;
                if (qadaData[prayerId]) {
                    delete qadaData[prayerId][day];
                    if (Object.keys(qadaData[prayerId]).length === 0) delete qadaData[prayerId];
                }
                if (congData && congData[prayerId]) { delete congData[prayerId][day]; }
            }
        }

        Storage.saveMonthData(type, currentMonth);
        if (type === 'fard' && congData) Storage.saveCongregationData(currentYear, currentMonth, congData);
        Storage.saveQadaData(currentYear, currentMonth, qadaData);
        _refreshGridAndStats(type);
        updateTrackerStats(type);
        if (typeof window.renderStreaks === 'function') {
            window.renderStreaks(type);
        }
        if (type === 'fard') {
            if (typeof window.updateCongregationStats === 'function') window.updateCongregationStats();
            UI.checkPrayerReminders();
        }

        // Glow animation on state change
        var newChecked = dataObj[currentMonth] && dataObj[currentMonth][prayerId] && dataObj[currentMonth][prayerId][day];
        var newCong = congData && congData[prayerId] && congData[prayerId][day];
        var newQada = qadaData[prayerId] && qadaData[prayerId][day];
        var newExempt = isFemale && exemptData[day] && exemptData[day][prayerId];

        var glowClass = null;
        if (newExempt) {
            // no glow for exempt
        } else if (newQada) {
            glowClass = 'day-glow-red';
        } else if (newCong) {
            glowClass = 'day-glow-amber';
        } else if (newChecked) {
            glowClass = 'day-glow-green';
        }

        // Tap-bounce + glow animation
        requestAnimationFrame(function() {
            var gridWrap = document.querySelector('#' + type + 'TrackerPrayersContainer .prayer-tab-grid .flow-grid');
            if (gridWrap) {
                var box = gridWrap.children[day - 1];
                if (box) {
                    // Feature #6: tap-bounce
                    box.classList.remove('tap-bounce');
                    void box.offsetWidth;
                    box.classList.add('tap-bounce');
                    setTimeout(function() { box.classList.remove('tap-bounce'); }, 350);
                    // Glow
                    if (glowClass) {
                        box.classList.add(glowClass);
                        setTimeout(function() { box.classList.remove(glowClass); }, 600);
                    }
                }
            }
        });
    }

    // ==================== batchMarkPrayer ====================

    function batchMarkPrayer(type, prayerId) {
        var Storage = _getStorage();
        var Hijri   = _getHijri();
        var Female  = _getFemale();
        var UI      = _getUI();
        var I18n    = _getI18n();

        var dataObj     = Storage.getDataObject(type);
        var hYear       = Hijri.getCurrentHijriYear();
        var hMonth      = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(hYear, hMonth);
        var profile     = Storage.getActiveProfile();
        var isFemaleUser = profile && profile.gender === 'female' && profile.age >= 12;
        var exemptData  = isFemaleUser ? Female.getExemptDays(hYear, hMonth) : {};

        if (!dataObj[hMonth][prayerId]) dataObj[hMonth][prayerId] = {};

        // Count current state
        var markedCount = 0;
        for (var day = 1; day <= daysInMonth; day++) {
            if (Hijri.isFutureDateHijri(day, hMonth, hYear)) continue;
            if (Female.isPrayerExempt(exemptData, prayerId, day)) continue;
            if (dataObj[hMonth][prayerId][day]) markedCount++;
        }

        // Count available days
        var availableDays = 0;
        for (var day2 = 1; day2 <= daysInMonth; day2++) {
            if (Hijri.isFutureDateHijri(day2, hMonth, hYear)) continue;
            if (Female.isPrayerExempt(exemptData, prayerId, day2)) continue;
            availableDays++;
        }

        // Toggle: if most are marked, unmark all. Otherwise mark all.
        var shouldMark = markedCount < availableDays / 2;
        var confirmKey = shouldMark ? 'confirm_batch_mark' : 'confirm_batch_unmark';

        UI.showConfirm(I18n.t(confirmKey)).then(function(confirmed) {
            if (!confirmed) return;

            for (var day3 = 1; day3 <= daysInMonth; day3++) {
                if (Hijri.isFutureDateHijri(day3, hMonth, hYear)) continue;
                if (Female.isPrayerExempt(exemptData, prayerId, day3)) continue;
                dataObj[hMonth][prayerId][day3] = shouldMark;
            }

            Storage.saveMonthData(type, hMonth);
            renderTrackerMonth(type);
            updateTrackerStats(type);
            if (typeof window.renderStreaks === 'function') {
                window.renderStreaks(type);
            }
            if (type === 'fard') {
                if (typeof window.updateCongregationStats === 'function') window.updateCongregationStats();
            }

            var pName = I18n.getPrayerName(prayerId);
            UI.showToast(pName + ': ' + availableDays, 'success', 1500);
        });
    }

    // ==================== toggleDay (year overview variant) ====================

    function toggleDay(type, prayerId, day) {
        var Storage = _getStorage();
        var UI      = _getUI();
        var I18n    = _getI18n();

        if (Storage.isFutureDate(day, Storage.getCurrentMonth(), Storage.getCurrentYear())) {
            UI.showToast(I18n.t('future_date'), 'warning');
            return;
        }

        var dataObj = Storage.getDataObject(type);
        var currentMonth = Storage.getCurrentMonth();

        if (!dataObj[currentMonth][prayerId]) {
            dataObj[currentMonth][prayerId] = {};
        }

        dataObj[currentMonth][prayerId][day] = !dataObj[currentMonth][prayerId][day];
        Storage.saveMonthData(type, currentMonth);
        renderMonthDetail(type);
    }

    // ==================== resetMonth (year overview variant) ====================

    function resetMonth(type) {
        var Storage = _getStorage();
        var UI      = _getUI();
        var I18n    = _getI18n();
        var currentMonth = Storage.getCurrentMonth();

        UI.showConfirm(I18n.t('confirm_clear')).then(function(confirmed) {
            if (confirmed) {
                var dataObj = Storage.getDataObject(type);
                var prayers = Storage.getPrayersArray(type);

                dataObj[currentMonth] = {};
                prayers.forEach(function(prayer) {
                    dataObj[currentMonth][prayer.id] = {};
                });
                Storage.saveMonthData(type, currentMonth);
                renderMonthDetail(type);
            }
        });
    }

    // ==================== renderMonthDetail (year overview month detail) ====================

    function renderMonthDetail(type) {
        var Storage = _getStorage();
        var Hijri   = _getHijri();
        var Female  = _getFemale();
        var I18n    = _getI18n();

        var container = document.getElementById(type + 'PrayersContainer');
        container.innerHTML = '';

        var prayers     = Storage.getPrayersArray(type);
        var dataObj     = Storage.getDataObject(type);
        var hYear       = Hijri.getCurrentHijriYear();
        var hMonth      = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(hYear, hMonth);
        var profile     = Storage.getActiveProfile();
        var isFemale    = profile && profile.gender === 'female' && profile.age >= 12;
        var exemptData  = isFemale ? Female.getExemptDays(hYear, hMonth) : {};

        prayers.forEach(function(prayer) {
            var section = document.createElement('div');
            section.className = 'prayer-section ' + prayer.class;

            var completed = 0;
            var exemptCount = isFemale ? Female.getExemptCountForPrayer(hYear, hMonth, prayer.id) : 0;
            if (dataObj[hMonth] && dataObj[hMonth][prayer.id]) {
                completed = Object.values(dataObj[hMonth][prayer.id]).filter(function(v) { return v; }).length;
            }
            var adjustedTotal = daysInMonth - exemptCount;

            section.innerHTML =
                '<div class="prayer-header">' +
                    '<div class="prayer-name">' +
                        '<span class="material-symbols-rounded" style="font-size:18px;">' + prayer.icon + '</span>' +
                        '<span>' + I18n.getPrayerName(prayer.id) + '</span>' +
                    '</div>' +
                    '<div class="prayer-counter">' + completed + ' / ' + adjustedTotal + '</div>' +
                '</div>' +
                '<div class="days-grid" id="' + type + '-grid-' + prayer.id + '"></div>';

            container.appendChild(section);

            var grid = document.getElementById(type + '-grid-' + prayer.id);
            for (var day = 1; day <= daysInMonth; day++) {
                var dayBox = document.createElement('div');
                dayBox.className = 'day-box';

                if (Female.isPrayerExempt(exemptData, prayer.id, day)) {
                    dayBox.appendChild(createDualDayNum(day, hYear, hMonth));
                    dayBox.classList.add('exempt');
                } else if (Hijri.isFutureDateHijri(day, hMonth, hYear)) {
                    dayBox.appendChild(createDualDayNum(day, hYear, hMonth));
                    dayBox.classList.add('disabled');
                    dayBox.style.opacity = '0.3';
                } else {
                    dayBox.appendChild(createDualDayNum(day, hYear, hMonth));

                    if (dataObj[hMonth][prayer.id] && dataObj[hMonth][prayer.id][day]) {
                        dayBox.classList.add('checked');
                        // Show congregation for fard
                        if (type === 'fard') {
                            var congData = Storage.getCongregationData(hYear, hMonth);
                            if (isCongregation(congData, prayer.id, day)) {
                                dayBox.classList.add('congregation');
                                dayBox.classList.remove('checked');
                            }
                        }
                        // Show qada
                        var qadaData = Storage.getQadaData(hYear, hMonth);
                        if (qadaData[prayer.id] && qadaData[prayer.id][day]) {
                            dayBox.classList.remove('checked', 'congregation');
                            dayBox.classList.add('qada');
                        }
                    }

                    dayBox.onclick = (function(t, pId, d) {
                        return function() { handleDayClick(t, pId, d); };
                    })(type, prayer.id, day);
                }

                grid.appendChild(dayBox);
            }
        });
    }

    // ==================== changeQadaMonth ====================

    function changeQadaMonth(delta) {
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
        var Hijri = _getHijri();
        var Storage = _getStorage();

        var hMonth = Hijri.getCurrentHijriMonth() + delta;
        var hYear = Hijri.getCurrentHijriYear();
        if (hMonth > 12) { hMonth = 1; hYear++; }
        else if (hMonth < 1) { hMonth = 12; hYear--; }

        Hijri.setCurrentHijriMonth(hMonth);
        Hijri.setCurrentHijriYear(hYear);
        Storage.setCurrentMonth(hMonth);
        Storage.setCurrentYear(hYear);

        var label = document.getElementById('qadaTrackerMonthLabel');
        if (label) label.textContent = Hijri.getHijriMonthName(hMonth - 1) + ' ' + hYear;

        if (window.App.QadaTracker) window.App.QadaTracker.render();
    }

    // ==================== PUBLIC API ====================

    return {
        switchSection:      switchSection,
        switchView:         switchView,
        updateTrackerView:  updateTrackerView,
        renderTrackerMonth: renderTrackerMonth,
        toggleTrackerDay:   toggleTrackerDay,
        updateTrackerStats: updateTrackerStats,
        changeTrackerMonth: changeTrackerMonth,
        changeQadaMonth:    changeQadaMonth,
        resetTrackerMonth:  resetTrackerMonth,
        handleDayClick:     handleDayClick,
        batchMarkPrayer:    batchMarkPrayer,
        toggleDay:          toggleDay,
        resetMonth:         resetMonth,
        renderMonthDetail:  renderMonthDetail,
        buildStatsRow:      _buildStatsRow,
        buildProgressRing:  _buildProgressRing
    };
})();

// ==================== BACKWARD COMPAT GLOBALS ====================
window.switchSection      = window.App.Tracker.switchSection;
window.switchView         = window.App.Tracker.switchView;
window.renderTrackerMonth = window.App.Tracker.renderTrackerMonth;
window.updateTrackerStats = window.App.Tracker.updateTrackerStats;
window.updateTrackerView  = window.App.Tracker.updateTrackerView;
window.changeTrackerMonth = window.App.Tracker.changeTrackerMonth;
window.changeQadaMonth    = window.App.Tracker.changeQadaMonth;
window.resetTrackerMonth  = window.App.Tracker.resetTrackerMonth;
window.handleDayClick     = window.App.Tracker.handleDayClick;
window.batchMarkPrayer    = window.App.Tracker.batchMarkPrayer;
window.toggleDay          = window.App.Tracker.toggleDay;
window.resetMonth         = window.App.Tracker.resetMonth;
window.renderMonthDetail  = window.App.Tracker.renderMonthDetail;
