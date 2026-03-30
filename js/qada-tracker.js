/**
 * qada-tracker.js — Qada Daily Tracking (Phase 2)
 * Prayer Tracker PWA
 *
 * Renders the القضاء tab inside fard section with day-circle grids,
 * +/− popup for logging qada count per prayer per day, summary banner.
 *
 * Depends on:
 *   window.App.Hijri, window.App.I18n, window.App.UI,
 *   window.App.Storage, window.App.Profiles, window.App.QadaCalc,
 *   window.App.Config
 */
window.App = window.App || {};
window.App.QadaTracker = (function() {
    'use strict';

    var _qadaPulseShown = false;
    var PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    var PRAYER_KEYS = {
        fajr: 'prayer_fajr', dhuhr: 'prayer_dhuhr', asr: 'prayer_asr',
        maghrib: 'prayer_maghrib', isha: 'prayer_isha'
    };
    var SKY_GRADIENTS = {
        fajr: 'linear-gradient(135deg, #E8B4B8, #C48A90)',
        dhuhr: 'linear-gradient(135deg, #F0C75E, #D4A030)',
        asr: 'linear-gradient(135deg, #E8A849, #C07828)',
        maghrib: 'linear-gradient(135deg, #C47A5A, #9E5238)',
        isha: 'linear-gradient(135deg, #5B6B8A, #3A4A68)'
    };
    var SKY_SHADOWS = {
        fajr: 'rgba(196,138,144,0.35)',
        dhuhr: 'rgba(212,160,48,0.35)',
        asr: 'rgba(192,120,40,0.35)',
        maghrib: 'rgba(158,82,56,0.35)',
        isha: 'rgba(58,74,104,0.35)'
    };

    var _popupTimer = null;
    var _activePopup = null;

    // ---- helpers ----
    function t(k) { return window.App.I18n ? window.App.I18n.t(k) : k; }
    function lang() { return window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar'; }
    function haptic(type) { if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic(type); }

    // ==================== STORAGE ====================

    function _profileId() {
        return window.App.Profiles ? window.App.Profiles.getActiveProfileId() : null;
    }

    function _logKey(hYear, hMonth) {
        var pid = _profileId();
        return pid ? 'salah_qada_log_' + pid + '_h' + hYear + '_' + hMonth : null;
    }

    function loadLog(hYear, hMonth) {
        var key = _logKey(hYear, hMonth);
        if (!key) return {};
        try { return JSON.parse(localStorage.getItem(key)) || {}; }
        catch(e) { return {}; }
    }

    function saveLog(hYear, hMonth, data) {
        var key = _logKey(hYear, hMonth);
        if (!key) return;
        localStorage.setItem(key, JSON.stringify(data));
    }

    function deleteAllQadaData() {
        var pid = _profileId();
        if (!pid) return;
        // Delete the plan
        if (window.App.QadaCalc && window.App.QadaCalc.loadPlan) {
            var planKey = 'salah_qada_plan_' + pid;
            localStorage.removeItem(planKey);
        }
        // Delete all qada log keys (salah_qada_log_{pid}_h...)
        var logPrefix = 'salah_qada_log_' + pid + '_';
        // Delete all qada storage keys (salah_qada_{profilePrefix}h...)
        var profilePrefix = window.App.Storage.getProfilePrefix ? window.App.Storage.getProfilePrefix() : (pid + '_');
        var storagePrefix = 'salah_qada_' + profilePrefix + 'h';
        var keysToDelete = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && (k.indexOf(logPrefix) === 0 || k.indexOf(storagePrefix) === 0)) {
                keysToDelete.push(k);
            }
        }
        keysToDelete.forEach(function(k) { localStorage.removeItem(k); });
    }

    function getCount(logData, day, prayerId) {
        if (logData[day] && logData[day][prayerId]) return logData[day][prayerId];
        return 0;
    }

    function setCount(logData, day, prayerId, count) {
        if (!logData[day]) logData[day] = {};
        logData[day][prayerId] = count;
        // Clean up zeros
        if (count <= 0) {
            delete logData[day][prayerId];
            if (Object.keys(logData[day]).length === 0) delete logData[day];
        }
    }

    // ==================== PLAN HELPERS ====================

    function _loadPlan() {
        return window.App.QadaCalc ? window.App.QadaCalc.loadPlan() : null;
    }

    function _savePlan(plan) {
        if (window.App.QadaCalc) window.App.QadaCalc.savePlan(plan);
    }

    function hasPlan() {
        return !!_loadPlan();
    }

    function updatePlanCompleted(prayerId, delta) {
        var plan = _loadPlan();
        if (!plan) return;
        if (!plan.completedByPrayer) plan.completedByPrayer = {};
        plan.completedByPrayer[prayerId] = (plan.completedByPrayer[prayerId] || 0) + delta;
        if (plan.completedByPrayer[prayerId] < 0) plan.completedByPrayer[prayerId] = 0;
        plan.completedAll = 0;
        PRAYER_IDS.forEach(function(id) {
            plan.completedAll += (plan.completedByPrayer[id] || 0);
        });
        _savePlan(plan);
    }

    // ==================== TODAY HELPERS ====================

    function getTodayTotal(logData, todayDay) {
        var total = 0;
        if (!logData[todayDay]) return 0;
        PRAYER_IDS.forEach(function(id) {
            total += (logData[todayDay][id] || 0);
        });
        return total;
    }

    // ==================== RENDER ====================

    // Track current view state for in-place updates
    var _viewState = { hYear: 0, hMonth: 0 };
    var _activeQadaTab = null;

    function render() {
        var container = document.getElementById('qadaTrackerContainer');
        if (!container) return;
        container.innerHTML = '';

        var plan = _loadPlan();
        if (!plan) {
            container.innerHTML =
                '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);">' +
                    '<span class="material-symbols-rounded" style="font-size:48px;opacity:0.3;display:block;margin-bottom:12px;">calculate</span>' +
                    '<div style="font-weight:700;margin-bottom:4px;">' + t('qada_no_plan') + '</div>' +
                    '<div style="font-size:0.85em;">' + t('qada_create_plan_prompt') + '</div>' +
                '</div>';
            return;
        }

        var Hijri = window.App.Hijri;
        var hYear = Hijri.getCurrentHijriYear();
        var hMonth = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(hYear, hMonth);
        var todayH = Hijri.getTodayHijri();
        var isCurrentMonth = (todayH.year === hYear && todayH.month === hMonth);
        var logData = loadLog(hYear, hMonth);

        _viewState.hYear = hYear;
        _viewState.hMonth = hMonth;

        // ---- Summary banner ----
        var completedAll = plan.completedAll || 0;
        var totalAll = plan.totalAll || 1;
        var remaining = totalAll - completedAll;
        if (remaining < 0) remaining = 0;
        var pct = Math.round((completedAll / totalAll) * 100);
        var pctColor = pct >= 75 ? 'var(--primary)' : pct >= 40 ? 'var(--accent)' : 'var(--danger)';
        var todayCount = isCurrentMonth ? getTodayTotal(logData, String(todayH.day)) : 0;
        var dailyTarget = plan.dailyTarget || 5;

        var banner = document.createElement('div');
        banner.className = 'qada-summary-banner';
        banner.id = 'qadaSummaryBanner';
        banner.innerHTML = _buildBannerHTML(pct, pctColor, todayCount, dailyTarget, remaining);
        container.appendChild(banner);

        // Default active tab
        if (!_activeQadaTab) {
            try {
                var state = window.getCurrentPrayerState ? window.getCurrentPrayerState() : null;
                _activeQadaTab = (state && state.active) ? state.active : 'fajr';
            } catch(e) { _activeQadaTab = 'fajr'; }
        }
        var activePrayerId = _activeQadaTab;

        // ── PRAYER TABS ROW ──
        var tabsContainer = document.createElement('div');
        tabsContainer.className = 'prayer-tabs-container';
        var tabPill = document.createElement('div');
        tabPill.className = 'prayer-tabs-pill';
        tabsContainer.appendChild(tabPill);

        var activeIdx = 0;
        PRAYER_IDS.forEach(function(prayerId, idx) {
            if (prayerId === activePrayerId) activeIdx = idx;
            var prayerDef = window.App.Config.fardPrayers.find(function(p) { return p.id === prayerId; });
            var icon = prayerDef ? prayerDef.icon : 'mosque';

            var tab = document.createElement('button');
            tab.className = 'prayer-tab' + (prayerId === activePrayerId ? ' active' : '');

            var iconWrap = document.createElement('div');
            iconWrap.className = 'prayer-tab-icon';
            if (prayerId === activePrayerId) {
                iconWrap.style.background = SKY_GRADIENTS[prayerId] || '#888';
                iconWrap.style.boxShadow = '0 2px 8px ' + (SKY_SHADOWS[prayerId] || 'rgba(0,0,0,0.2)');
            }
            iconWrap.innerHTML = '<span class="material-symbols-rounded">' + icon + '</span>';

            var nameSpan = document.createElement('span');
            nameSpan.className = 'prayer-tab-name';
            nameSpan.textContent = t(PRAYER_KEYS[prayerId]);

            tab.appendChild(iconWrap);
            tab.appendChild(nameSpan);
            tab.onclick = (function(pid) {
                return function() {
                    _activeQadaTab = pid;
                    if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
                    render();
                };
            })(prayerId);
            tabsContainer.appendChild(tab);
        });
        container.appendChild(tabsContainer);

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

        // ── STATS ROW (Card 1 — own glassmorphism styling) ──
        var totalForPrayer = plan.totalByPrayer ? (plan.totalByPrayer[activePrayerId] || 0) : 0;
        var completedForPrayer = plan.completedByPrayer ? (plan.completedByPrayer[activePrayerId] || 0) : 0;
        var pctForPrayer = totalForPrayer > 0 ? Math.round((completedForPrayer / totalForPrayer) * 100) : 0;
        var todayCountForPrayer = isCurrentMonth ? getCount(logData, String(todayH.day), activePrayerId) : 0;

        var statsRow = document.createElement('div');
        statsRow.className = 'prayer-tab-stats';
        statsRow.innerHTML = window.App.Tracker.buildStatsRow({
            pct: pctForPrayer,
            completed: todayCountForPrayer,
            total: dailyTarget,
            showJamaah: false,
            dayLabel: 'اليوم'
        });
        container.appendChild(statsRow);

        // ── CALENDAR CARD (Card 2 — grid) ──
        var trackerCard = document.createElement('div');
        trackerCard.className = 'tracker-card';

        // ── SINGLE CALENDAR GRID ──
        var gridWrap = document.createElement('div');
        gridWrap.className = 'prayer-tab-grid';
        var grid = document.createElement('div');
        grid.className = 'days-grid flow-grid';

        for (var day = 1; day <= daysInMonth; day++) {
            var dayBox = document.createElement('div');
            dayBox.className = 'day-box qada-day-box';
            dayBox.setAttribute('role', 'button');
            dayBox.setAttribute('tabindex', '0');

            var count = getCount(logData, String(day), activePrayerId);
            var isDayToday = isCurrentMonth && todayH.day === day;
            var isFuture = Hijri.isFutureDateHijri(day, hMonth, hYear);

            if (isDayToday) {
                dayBox.classList.add('today-box');
                if (!_qadaPulseShown) dayBox.classList.add('today-pulse');
            }
            dayBox.appendChild(Hijri.createDualDayNum(day, hYear, hMonth));

            if (isFuture) {
                dayBox.classList.add('disabled');
            } else {
                if (count > 0) {
                    dayBox.classList.add('qada-filled');
                    var badge = document.createElement('span');
                    badge.className = 'qada-badge';
                    badge.textContent = count;
                    dayBox.appendChild(badge);
                }
                dayBox.onclick = (function(pid, d, box) {
                    return function(e) {
                        e.stopPropagation();
                        showPopup(pid, d, _viewState.hYear, _viewState.hMonth, box);
                    };
                })(activePrayerId, day, dayBox);
            }
            grid.appendChild(dayBox);
        }
        if (isCurrentMonth) _qadaPulseShown = true;
        gridWrap.appendChild(grid);
        trackerCard.appendChild(gridWrap);
        container.appendChild(trackerCard);
    }

    function _buildBannerHTML(pct, pctColor, todayCount, dailyTarget, remaining) {
        return '<div class="qada-summary-row">' +
                '<span style="font-weight:700;color:var(--text-primary);">' + t('qada_progress') + '</span>' +
                '<span style="font-weight:800;color:' + pctColor + ';">' + pct + '%</span>' +
            '</div>' +
            '<div class="qada-progress-bar"><div class="qada-progress-fill" style="width:' + Math.min(pct, 100) + '%;background:' + pctColor + ';"></div></div>' +
            '<div class="qada-summary-row" style="margin-top:8px;font-size:0.85em;">' +
                '<span style="color:var(--text-secondary);">' + t('qada_today_label') + ': <strong>' + todayCount + ' / ' + dailyTarget + '</strong></span>' +
                '<span style="color:var(--text-secondary);">' + t('qada_remaining_short') + ': <strong>' + remaining + '</strong> ' + t('qada_period_prayers') + '</span>' +
            '</div>';
    }

    // ==================== POPUP ====================

    function closePopup() {
        if (_activePopup) {
            _activePopup.remove();
            _activePopup = null;
        }
        if (_popupTimer) {
            clearTimeout(_popupTimer);
            _popupTimer = null;
        }
    }

    function resetPopupTimer() {
        if (_popupTimer) clearTimeout(_popupTimer);
        _popupTimer = setTimeout(closePopup, 3000);
    }

    function showPopup(prayerId, day, hYear, hMonth, dayBox) {
        // If popup already open for same day+prayer, just reset timer
        if (_activePopup && _activePopup._prayerId === prayerId && _activePopup._day === day) {
            resetPopupTimer();
            return;
        }
        closePopup();
        haptic('soft');

        var logData = loadLog(hYear, hMonth);
        var count = getCount(logData, String(day), prayerId);

        var popup = document.createElement('div');
        popup.className = 'qada-popup';
        popup._prayerId = prayerId;
        popup._day = day;

        // Position: above or below the circle
        var rect = dayBox.getBoundingClientRect();
        var spaceAbove = rect.top;
        var showBelow = spaceAbove < 120;

        popup.innerHTML =
            '<div class="qada-popup-arrow' + (showBelow ? ' arrow-top' : ' arrow-bottom') + '"></div>' +
            '<div class="qada-popup-body">' +
                '<button class="qada-popup-btn minus" id="qadaPopMinus">−</button>' +
                '<span class="qada-popup-num" id="qadaPopNum">' + count + '</span>' +
                '<button class="qada-popup-btn plus" id="qadaPopPlus">+</button>' +
            '</div>';

        document.body.appendChild(popup);
        _activePopup = popup;

        // Position the popup
        var popW = 140;
        var popH = 52;
        var left = rect.left + rect.width / 2 - popW / 2;
        var top;
        if (showBelow) {
            top = rect.bottom + 8;
        } else {
            top = rect.top - popH - 16;
        }
        // Clamp to viewport
        if (left < 8) left = 8;
        if (left + popW > window.innerWidth - 8) left = window.innerWidth - 8 - popW;

        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
        popup.style.width = popW + 'px';

        resetPopupTimer();

        // Button handlers — update in-place, no re-render
        var numEl = document.getElementById('qadaPopNum');

        document.getElementById('qadaPopPlus').onclick = function(e) {
            e.stopPropagation();
            haptic('light');
            count++;
            numEl.textContent = count;
            setCount(logData, String(day), prayerId, count);
            saveLog(hYear, hMonth, logData);
            updatePlanCompleted(prayerId, 1);
            updateDayBox(dayBox, count, day);
            _updateBannerInPlace();
            _updateHeaderInPlace(prayerId);
            resetPopupTimer();
            dayBox.classList.remove('tap-bounce');
            void dayBox.offsetWidth;
            dayBox.classList.add('tap-bounce');
            setTimeout(function() { dayBox.classList.remove('tap-bounce'); }, 350);
        };

        document.getElementById('qadaPopMinus').onclick = function(e) {
            e.stopPropagation();
            haptic('light');
            if (count <= 0) return;
            count--;
            numEl.textContent = count;
            setCount(logData, String(day), prayerId, count);
            saveLog(hYear, hMonth, logData);
            updatePlanCompleted(prayerId, -1);
            updateDayBox(dayBox, count, day);
            _updateBannerInPlace();
            _updateHeaderInPlace(prayerId);
            resetPopupTimer();
            dayBox.classList.remove('tap-bounce');
            void dayBox.offsetWidth;
            dayBox.classList.add('tap-bounce');
            setTimeout(function() { dayBox.classList.remove('tap-bounce'); }, 350);
        };

        // Close on outside click
        setTimeout(function() {
            document.addEventListener('click', _outsideClickHandler);
        }, 10);
    }

    function _outsideClickHandler(e) {
        if (_activePopup && !_activePopup.contains(e.target)) {
            closePopup();
            document.removeEventListener('click', _outsideClickHandler);
        }
    }

    function updateDayBox(dayBox, count, day) {
        dayBox.innerHTML = '';
        dayBox.classList.remove('qada-filled');
        // Always show day number
        var numSpan = document.createElement('span');
        numSpan.className = 'day-number';
        numSpan.textContent = day;
        dayBox.appendChild(numSpan);
        if (count > 0) {
            dayBox.classList.add('qada-filled');
            var badge = document.createElement('span');
            badge.className = 'qada-badge';
            badge.textContent = count;
            dayBox.appendChild(badge);
        }
    }

    // Update summary banner without re-rendering the whole view
    function _updateBannerInPlace() {
        var banner = document.getElementById('qadaSummaryBanner');
        if (!banner) return;
        var plan = _loadPlan();
        if (!plan) return;

        var Hijri = window.App.Hijri;
        var hYear = _viewState.hYear;
        var hMonth = _viewState.hMonth;
        var todayH = Hijri.getTodayHijri();
        var isCurrentMonth = (todayH.year === hYear && todayH.month === hMonth);
        var logData = loadLog(hYear, hMonth);

        var completedAll = plan.completedAll || 0;
        var totalAll = plan.totalAll || 1;
        var remaining = totalAll - completedAll;
        if (remaining < 0) remaining = 0;
        var pct = Math.round((completedAll / totalAll) * 100);
        var pctColor = pct >= 75 ? 'var(--primary)' : pct >= 40 ? 'var(--accent)' : 'var(--danger)';
        var todayCount = isCurrentMonth ? getTodayTotal(logData, String(todayH.day)) : 0;
        var dailyTarget = plan.dailyTarget || 5;

        banner.innerHTML = _buildBannerHTML(pct, pctColor, todayCount, dailyTarget, remaining);
    }

    // Update single prayer header remaining count without re-rendering
    function _updateHeaderInPlace(prayerId) {
        var headerEnd = document.getElementById('qadaHeaderEnd_' + prayerId);
        if (!headerEnd) return;
        var plan = _loadPlan();
        if (!plan) return;
        var totalForPrayer = plan.totalByPrayer ? (plan.totalByPrayer[prayerId] || 0) : 0;
        var completedForPrayer = plan.completedByPrayer ? (plan.completedByPrayer[prayerId] || 0) : 0;
        var remainForPrayer = totalForPrayer - completedForPrayer;
        if (remainForPrayer < 0) remainForPrayer = 0;
        headerEnd.innerHTML =
            '<span class="prayer-counter" style="color:var(--text-muted);font-size:0.8em;">' +
                t('qada_remaining_short') + ': ' + remainForPrayer +
            '</span>';
    }

    // ==================== TAB MANAGEMENT ====================

    function injectTab() {
        var subTabs = document.getElementById('fardSubTabs');
        if (!subTabs) return;

        // Remove existing qada tab if any
        var existing = document.getElementById('fardQadaSubTab');
        if (existing) existing.remove();

        if (!hasPlan()) {
            // Restore 3-tab pill width
            updatePillWidth(subTabs, 3);
            return;
        }

        // Insert before dashboard tab (last tab)
        var tabs = subTabs.querySelectorAll('.sub-tab');
        var dashTab = tabs[tabs.length - 1]; // dashboard is last

        var qadaTab = document.createElement('div');
        qadaTab.className = 'sub-tab';
        qadaTab.id = 'fardQadaSubTab';
        qadaTab.setAttribute('role', 'button');
        qadaTab.setAttribute('tabindex', '0');
        qadaTab.onclick = function() { switchView('fard', 'qada'); };
        qadaTab.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">history</span> <span data-t="qada_tab">' + t('qada_tab') + '</span>';

        subTabs.insertBefore(qadaTab, dashTab);
        updatePillWidth(subTabs, 4);
    }

    function removeTab() {
        var existing = document.getElementById('fardQadaSubTab');
        if (existing) existing.remove();
        var subTabs = document.getElementById('fardSubTabs');
        if (subTabs) updatePillWidth(subTabs, 3);
    }

    function updatePillWidth(subTabs, numTabs) {
        var pill = subTabs.querySelector('.sub-tabs-pill');
        if (pill) {
            pill.style.width = 'calc(' + (100 / numTabs) + '% - 2px)';
        }
    }

    // ==================== PUBLIC API ====================

    return {
        render: render,
        hasPlan: hasPlan,
        injectTab: injectTab,
        removeTab: removeTab,
        closePopup: closePopup,
        loadLog: loadLog,
        saveLog: saveLog,
        deleteAllData: deleteAllQadaData
    };
})();
