/**
 * qada-dashboard.js — Qada Reports & Dashboard (Phase 3)
 * Prayer Tracker PWA
 *
 * Renders 5 qada reports inside the fard dashboard view
 * with a sub-segmented control to toggle between fard and qada reports.
 *
 * Depends on:
 *   window.App.Hijri, window.App.I18n, window.App.Config,
 *   window.App.QadaCalc, window.App.QadaTracker,
 *   window.App.InfoTooltips, window.App.SVGCharts
 */
window.App = window.App || {};
window.App.QadaDashboard = (function() {
    'use strict';

    var PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    var SKY_COLORS = {
        fajr: '#D4A0A7', dhuhr: '#E8B84A', asr: '#D4943A',
        maghrib: '#B0664A', isha: '#4A5A7A'
    };

    function t(k) { return window.App.I18n ? window.App.I18n.t(k) : k; }
    function lang() { return window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar'; }

    function _loadPlan() {
        return window.App.QadaCalc ? window.App.QadaCalc.loadPlan() : null;
    }

    function hasPlan() { return !!_loadPlan(); }

    // ==================== HIJRI DATE MATH ====================

    function addHijriDays(startYear, startMonth, startDay, daysToAdd) {
        var Hijri = window.App.Hijri;
        var y = startYear, m = startMonth, d = startDay;
        var remaining = daysToAdd;
        while (remaining > 0) {
            var dim = Hijri.getHijriDaysInMonth(y, m);
            var daysLeftInMonth = dim - d;
            if (remaining <= daysLeftInMonth) {
                d += remaining;
                remaining = 0;
            } else {
                remaining -= (daysLeftInMonth + 1);
                d = 1;
                m++;
                if (m > 12) { m = 1; y++; }
            }
        }
        return { year: y, month: m, day: d };
    }

    // ==================== DATA GATHERERS ====================

    function gatherAllLogData(plan) {
        var Hijri = window.App.Hijri;
        var QT = window.App.QadaTracker;
        if (!QT || !plan) return { monthlyTotals: {}, totalLogged: 0 };

        var todayH = Hijri.getTodayHijri();
        var pid = window.App.Profiles ? window.App.Profiles.getActiveProfileId() : null;
        if (!pid) return { monthlyTotals: {}, totalLogged: 0 };

        // Scan localStorage for actual qada log keys to find real data range
        var prefix = 'salah_qada_log_' + pid + '_h';
        var foundMonths = []; // [{year, month}]
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(prefix) === 0) {
                var suffix = k.substring(prefix.length); // e.g. "1447_9"
                var parts = suffix.split('_');
                if (parts.length === 2) {
                    foundMonths.push({ year: parseInt(parts[0]), month: parseInt(parts[1]) });
                }
            }
        }

        // Also include createdDate month if available
        var startY, startM;
        if (plan.createdDate) {
            var created = new Date(plan.createdDate);
            var createdH = Hijri.gregorianToHijri(created);
            startY = createdH.year;
            startM = createdH.month;
        }

        // Find earliest month (min of found keys and createdDate)
        for (var f = 0; f < foundMonths.length; f++) {
            var fm = foundMonths[f];
            if (!startY || fm.year < startY || (fm.year === startY && fm.month < startM)) {
                startY = fm.year;
                startM = fm.month;
            }
        }

        if (!startY) return { monthlyTotals: {}, totalLogged: 0 };

        // Iterate from earliest month to today
        var monthlyTotals = {};
        var totalLogged = 0;
        var y = startY, m = startM;

        while (y < todayH.year || (y === todayH.year && m <= todayH.month)) {
            var logData = QT.loadLog(y, m);
            var monthTotal = 0;
            var days = Object.keys(logData);
            for (var di = 0; di < days.length; di++) {
                var dayData = logData[days[di]];
                for (var j = 0; j < PRAYER_IDS.length; j++) {
                    monthTotal += (dayData[PRAYER_IDS[j]] || 0);
                }
            }
            var key = y + '_' + m;
            monthlyTotals[key] = monthTotal;
            totalLogged += monthTotal;

            m++;
            if (m > 12) { m = 1; y++; }
            if (y > todayH.year + 5) break;
        }

        return { monthlyTotals: monthlyTotals, totalLogged: totalLogged };
    }

    function daysSinceCreation(plan) {
        if (!plan) return 1;
        // Use createdDate if available, but also check if data exists earlier
        var earliest = plan.createdDate ? new Date(plan.createdDate) : new Date();
        var pid = window.App.Profiles ? window.App.Profiles.getActiveProfileId() : null;
        if (pid) {
            var prefix = 'salah_qada_log_' + pid + '_h';
            var Hijri = window.App.Hijri;
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(prefix) === 0) {
                    var suffix = k.substring(prefix.length);
                    var parts = suffix.split('_');
                    if (parts.length === 2) {
                        var gDate = Hijri.hijriToGregorian(parseInt(parts[0]), parseInt(parts[1]), 1);
                        if (gDate < earliest) earliest = gDate;
                    }
                }
            }
        }
        var diff = Math.floor((new Date() - earliest) / 86400000);
        return diff < 1 ? 1 : diff;
    }

    // ==================== SUB-TOGGLE ====================

    var _currentSubView = 'fard'; // 'fard' or 'qada'

    function injectSubToggle() {
        var dashView = document.getElementById('fardDashboardView');
        if (!dashView) return;

        // Remove existing toggle
        var existing = document.getElementById('qadaDashSubToggle');
        if (existing) existing.remove();

        if (!hasPlan()) {
            _showFardContent(dashView, true);
            return;
        }

        // Create sub-toggle pill
        var wrapper = document.createElement('div');
        wrapper.id = 'qadaDashSubToggle';
        wrapper.style.cssText = 'display:flex;position:relative;background:rgba(128,128,128,0.08);border-radius:12px;padding:3px;margin-bottom:14px;';

        var fardBtn = document.createElement('button');
        fardBtn.id = 'qadaDashSubFard';
        fardBtn.className = 'qada-dash-sub-btn';
        fardBtn.innerHTML = '<span data-t="fard_label">' + t('fard_label') + '</span>';
        fardBtn.onclick = function() { switchSubView('fard'); };

        var qadaBtn = document.createElement('button');
        qadaBtn.id = 'qadaDashSubQada';
        qadaBtn.className = 'qada-dash-sub-btn';
        qadaBtn.innerHTML = '<span data-t="qada_tab">' + t('qada_tab') + '</span>';
        qadaBtn.onclick = function() { switchSubView('qada'); };

        var pill = document.createElement('div');
        pill.id = 'qadaDashSubPill';
        pill.className = 'qada-dash-sub-pill';

        wrapper.appendChild(fardBtn);
        wrapper.appendChild(qadaBtn);
        wrapper.appendChild(pill);

        // Insert after the year navigation
        var yearNav = dashView.querySelector('.month-nav-compact');
        if (yearNav && yearNav.nextSibling) {
            dashView.insertBefore(wrapper, yearNav.nextSibling);
        } else {
            dashView.insertBefore(wrapper, dashView.firstChild);
        }

        // Ensure container for qada reports
        var qadaContainer = document.getElementById('qadaDashReportsContainer');
        if (!qadaContainer) {
            qadaContainer = document.createElement('div');
            qadaContainer.id = 'qadaDashReportsContainer';
            qadaContainer.style.display = 'none';
            dashView.appendChild(qadaContainer);
        }

        // Apply current state
        switchSubView(_currentSubView);
    }

    function switchSubView(view) {
        _currentSubView = view;
        var dashView = document.getElementById('fardDashboardView');
        if (!dashView) return;

        var fardBtn = document.getElementById('qadaDashSubFard');
        var qadaBtn = document.getElementById('qadaDashSubQada');
        var pill = document.getElementById('qadaDashSubPill');
        var qadaContainer = document.getElementById('qadaDashReportsContainer');

        if (fardBtn) fardBtn.classList.toggle('active', view === 'fard');
        if (qadaBtn) qadaBtn.classList.toggle('active', view === 'qada');

        if (pill) {
            var isRtl = document.documentElement.getAttribute('dir') === 'rtl';
            if (view === 'fard') {
                pill.style.transform = isRtl ? 'translateX(100%)' : 'translateX(0)';
            } else {
                pill.style.transform = isRtl ? 'translateX(0)' : 'translateX(100%)';
            }
        }

        if (view === 'fard') {
            _showFardContent(dashView, true);
            if (qadaContainer) qadaContainer.style.display = 'none';
        } else {
            _showFardContent(dashView, false);
            if (qadaContainer) {
                qadaContainer.style.display = '';
                renderQadaReports();
            }
        }
    }

    function _showFardContent(dashView, show) {
        // Toggle visibility of all fard dashboard children except the sub-toggle,
        // the year nav, hidden spans, and the qada container
        var children = dashView.children;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child.id === 'qadaDashSubToggle') continue;
            if (child.id === 'qadaDashReportsContainer') continue;
            if (child.classList && child.classList.contains('month-nav-compact')) continue;
            // Skip hidden stat spans
            if (child.style && child.style.display === 'none' && child.tagName === 'SPAN') continue;
            child.style.display = show ? '' : 'none';
        }
    }

    // ==================== RENDER ALL 5 REPORTS ====================

    function renderQadaReports() {
        var container = document.getElementById('qadaDashReportsContainer');
        if (!container) return;
        container.innerHTML = '';

        var plan = _loadPlan();
        if (!plan) {
            container.innerHTML =
                '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);">' +
                    '<span class="material-symbols-rounded" style="font-size:48px;opacity:0.3;display:block;margin-bottom:12px;">calculate</span>' +
                    '<div style="font-weight:700;margin-bottom:4px;">' + t('qada_no_plan') + '</div>' +
                '</div>';
            return;
        }

        var logInfo = gatherAllLogData(plan);

        renderReport1_OverallProgress(container, plan);
        renderReport2_PerPrayerProgress(container, plan);
        renderReport3_StatsCards(container, plan, logInfo);
        renderReport4_PlanVsReality(container, plan, logInfo);
        renderReport5_MonthlyTrend(container, plan, logInfo);
    }

    // ==================== REPORT 1: Overall Progress ====================

    function renderReport1_OverallProgress(parent, plan) {
        var card = _createCard('qadaR1');
        var header = _createHeader('bar_chart', t('qdr_overall_progress'), 18);
        card.appendChild(header);
        if (window.App.InfoTooltips) window.App.InfoTooltips.attachToHeader(18, header);

        var completedAll = plan.completedAll || 0;
        var totalAll = plan.totalAll || 1;
        var pct = Math.round((completedAll / totalAll) * 100);
        var pctColor = _pctColor(pct);

        var body = document.createElement('div');
        body.style.cssText = 'padding:8px 0;';

        // Large progress bar
        var barWrap = document.createElement('div');
        barWrap.style.cssText = 'width:100%;height:24px;background:rgba(128,128,128,0.1);border-radius:12px;overflow:hidden;position:relative;';
        var fill = document.createElement('div');
        fill.style.cssText = 'height:100%;border-radius:12px;background:' + pctColor + ';width:' + Math.min(pct, 100) + '%;transition:width 0.6s ease;';
        barWrap.appendChild(fill);

        // Percentage overlay
        var pctLabel = document.createElement('div');
        pctLabel.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;font-family:Rubik,sans-serif;color:' + (pct > 50 ? '#fff' : 'var(--text-primary)') + ';';
        pctLabel.textContent = pct + '%';
        barWrap.appendChild(pctLabel);
        body.appendChild(barWrap);

        // Numbers below
        var isAr = lang() === 'ar';
        var numRow = document.createElement('div');
        numRow.style.cssText = 'display:flex;justify-content:space-between;margin-top:10px;font-size:0.85em;';
        numRow.innerHTML =
            '<span style="color:var(--text-secondary);font-weight:600;">' +
                (isAr ? _arabicNum(completedAll) + ' من ' + _arabicNum(totalAll) + ' صلاة' :
                        completedAll.toLocaleString() + ' of ' + totalAll.toLocaleString() + ' prayers') +
            '</span>' +
            '<span style="color:' + pctColor + ';font-weight:800;font-family:Rubik,sans-serif;">' +
                (isAr ? 'باقي ' + _arabicNum(totalAll - completedAll) : (totalAll - completedAll).toLocaleString() + ' remaining') +
            '</span>';
        body.appendChild(numRow);

        card.appendChild(body);
        parent.appendChild(card);
    }

    // ==================== REPORT 2: Per-Prayer Progress ====================

    function renderReport2_PerPrayerProgress(parent, plan) {
        var card = _createCard('qadaR2');
        var header = _createHeader('view_list', t('qdr_per_prayer_progress'), 19);
        card.appendChild(header);
        if (window.App.InfoTooltips) window.App.InfoTooltips.attachToHeader(19, header);

        var body = document.createElement('div');
        body.style.cssText = 'display:flex;flex-direction:column;gap:10px;padding:4px 0;';

        PRAYER_IDS.forEach(function(pid) {
            var total = plan.totalByPrayer ? (plan.totalByPrayer[pid] || 0) : 0;
            var completed = plan.completedByPrayer ? (plan.completedByPrayer[pid] || 0) : 0;
            var remaining = total - completed;
            if (remaining < 0) remaining = 0;
            var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            var color = SKY_COLORS[pid] || '#888';

            var prayerDef = window.App.Config.fardPrayers.find(function(p) { return p.id === pid; });
            var icon = prayerDef ? prayerDef.icon : 'mosque';
            var name = window.App.I18n ? window.App.I18n.getPrayerName(pid) : pid;

            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;';

            // Icon badge
            row.innerHTML =
                '<span class="prayer-icon-badge" style="background:' + color + ';width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                    '<span class="material-symbols-rounded" style="font-size:16px;color:white;">' + icon + '</span>' +
                '</span>' +
                '<span style="width:52px;font-size:12px;font-weight:700;color:var(--text-primary);font-family:\'Noto Kufi Arabic\',sans-serif;">' + name + '</span>';

            // Bar
            var barWrap = document.createElement('div');
            barWrap.style.cssText = 'flex:1;height:8px;background:rgba(128,128,128,0.1);border-radius:4px;overflow:hidden;';
            var barFill = document.createElement('div');
            barFill.style.cssText = 'height:100%;border-radius:4px;background:' + color + ';width:' + Math.min(pct, 100) + '%;transition:width 0.6s ease;';
            barWrap.appendChild(barFill);
            row.appendChild(barWrap);

            // Percentage
            var pctSpan = document.createElement('span');
            pctSpan.style.cssText = 'width:34px;text-align:center;font-size:11px;font-weight:800;color:' + color + ';font-family:Rubik,sans-serif;';
            pctSpan.textContent = pct + '%';
            row.appendChild(pctSpan);

            // Remaining
            var remSpan = document.createElement('span');
            remSpan.style.cssText = 'font-size:10px;color:var(--text-muted);font-weight:600;white-space:nowrap;';
            remSpan.textContent = (lang() === 'ar' ? 'باقي: ' : 'Left: ') + remaining.toLocaleString();
            row.appendChild(remSpan);

            body.appendChild(row);
        });

        card.appendChild(body);
        parent.appendChild(card);
    }

    // ==================== REPORT 3: Stats Cards ====================

    function renderReport3_StatsCards(parent, plan, logInfo) {
        var card = _createCard('qadaR3');
        var header = _createHeader('insights', t('qdr_performance_summary'), 20);
        card.appendChild(header);
        if (window.App.InfoTooltips) window.App.InfoTooltips.attachToHeader(20, header);

        var isAr = lang() === 'ar';
        var Hijri = window.App.Hijri;

        // Find best month
        var bestMonthKey = null;
        var bestMonthCount = 0;
        var keys = Object.keys(logInfo.monthlyTotals);
        for (var i = 0; i < keys.length; i++) {
            if (logInfo.monthlyTotals[keys[i]] > bestMonthCount) {
                bestMonthCount = logInfo.monthlyTotals[keys[i]];
                bestMonthKey = keys[i];
            }
        }
        var bestMonthLabel = '-';
        if (bestMonthKey) {
            var parts = bestMonthKey.split('_');
            var bMonth = parseInt(parts[1]);
            var bYear = parseInt(parts[0]);
            bestMonthLabel = Hijri.getHijriMonthName(bMonth - 1) + ' ' + bYear;
        }

        // Daily average
        var days = daysSinceCreation(plan);
        var completedAll = plan.completedAll || 0;
        var avgDaily = days > 0 ? (completedAll / days).toFixed(1) : '0';

        // Expected completion date
        var avgNum = parseFloat(avgDaily);
        var remaining = (plan.totalAll || 0) - completedAll;
        if (remaining < 0) remaining = 0;
        var expectedLabel = '';
        if (avgNum > 0 && remaining > 0) {
            var daysNeeded = Math.ceil(remaining / avgNum);
            var todayH = Hijri.getTodayHijri();
            var expected = addHijriDays(todayH.year, todayH.month, todayH.day, daysNeeded);
            var hijriMonthName = Hijri.getHijriMonthName(expected.month - 1);
            var hijriText = hijriMonthName + ' ' + expected.year + ' ' + (isAr ? 'هـ' : 'AH');
            var gDate = Hijri.hijriToGregorian(expected.year, expected.month, expected.day);
            var gMonths = isAr ? window.App.Config.gregorianMonthNamesAr : window.App.Config.gregorianMonthNamesEn;
            var gregText = gMonths[gDate.getMonth()] + ' ' + gDate.getFullYear() + (isAr ? ' م' : ' CE');
            expectedLabel = hijriText + ' — ' + gregText;
        } else if (avgNum <= 0) {
            expectedLabel = t('qdr_start_logging');
        } else {
            expectedLabel = isAr ? 'اكتملت!' : 'Completed!';
        }

        // Row 1: 2 cards side by side
        var row1 = document.createElement('div');
        row1.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;';

        // Card 1: Best Month
        row1.innerHTML =
            '<div style="padding:14px 12px;border-radius:14px;background:rgba(var(--accent-rgb),0.06);border:1px solid rgba(var(--accent-rgb),0.1);">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                    '<span class="material-symbols-rounded" style="font-size:20px;color:var(--accent);font-variation-settings:\'FILL\' 1;">emoji_events</span>' +
                    '<span style="font-size:10px;color:var(--text-muted);font-weight:600;">' + t('qdr_best_month') + '</span>' +
                '</div>' +
                '<div style="font-size:13px;font-weight:800;color:var(--text-primary);font-family:\'Noto Kufi Arabic\',sans-serif;">' + bestMonthLabel + '</div>' +
                '<div style="font-size:11px;color:var(--accent);font-weight:700;">' + bestMonthCount + ' ' + t('qada_period_prayers') + '</div>' +
            '</div>' +
            // Card 2: Daily Average
            '<div style="padding:14px 12px;border-radius:14px;background:rgba(var(--primary-rgb),0.06);border:1px solid rgba(var(--primary-rgb),0.1);">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                    '<span class="material-symbols-rounded" style="font-size:20px;color:var(--primary);font-variation-settings:\'FILL\' 1;">speed</span>' +
                    '<span style="font-size:10px;color:var(--text-muted);font-weight:600;">' + t('qdr_daily_avg') + '</span>' +
                '</div>' +
                '<div style="font-size:20px;font-weight:800;color:var(--text-primary);font-family:Rubik,sans-serif;">' + avgDaily + '</div>' +
                '<div style="font-size:11px;color:var(--primary);font-weight:700;">' + (isAr ? 'صلاة/يوم' : 'prayers/day') + '</div>' +
            '</div>';
        card.appendChild(row1);

        // Row 2: Expected completion (full width)
        var row2 = document.createElement('div');
        row2.style.cssText = 'padding:14px 16px;border-radius:14px;background:rgba(var(--primary-rgb),0.06);border:1px solid rgba(var(--primary-rgb),0.1);margin-top:10px;display:flex;align-items:center;gap:12px;';
        row2.innerHTML =
            '<span class="material-symbols-rounded" style="font-size:24px;color:var(--primary);font-variation-settings:\'FILL\' 1;">event</span>' +
            '<div>' +
                '<div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + t('qdr_expected_completion') + '</div>' +
                '<div style="font-size:13px;font-weight:700;color:var(--text-primary);font-family:\'Noto Kufi Arabic\',sans-serif;margin-top:2px;">' + expectedLabel + '</div>' +
            '</div>';
        card.appendChild(row2);

        parent.appendChild(card);
    }

    // ==================== REPORT 4: Plan vs Reality ====================

    function renderReport4_PlanVsReality(parent, plan, logInfo) {
        var card = _createCard('qadaR4');
        var header = _createHeader('compare_arrows', t('qdr_plan_vs_reality'), 21);
        card.appendChild(header);
        if (window.App.InfoTooltips) window.App.InfoTooltips.attachToHeader(21, header);

        var isAr = lang() === 'ar';
        var dailyTarget = plan.dailyTarget || 5;
        var days = daysSinceCreation(plan);
        var completedAll = plan.completedAll || 0;
        var avgDaily = days > 0 ? (completedAll / days) : 0;
        var avgDailyStr = avgDaily.toFixed(1);

        // Two numbers side by side
        var row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;';
        row.innerHTML =
            // Target
            '<div style="text-align:center;padding:12px;border-radius:14px;background:rgba(var(--accent-rgb),0.06);border:1px solid rgba(var(--accent-rgb),0.1);">' +
                '<div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + t('qdr_target_label') + '</div>' +
                '<div style="font-size:24px;font-weight:800;color:var(--accent);font-family:Rubik,sans-serif;margin:4px 0;">' + dailyTarget + '</div>' +
                '<div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (isAr ? 'صلوات/يوم' : 'prayers/day') + '</div>' +
            '</div>' +
            // Actual
            '<div style="text-align:center;padding:12px;border-radius:14px;background:rgba(var(--primary-rgb),0.06);border:1px solid rgba(var(--primary-rgb),0.1);">' +
                '<div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + t('qdr_actual_label') + '</div>' +
                '<div style="font-size:24px;font-weight:800;color:var(--primary);font-family:Rubik,sans-serif;margin:4px 0;">' + avgDailyStr + '</div>' +
                '<div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (isAr ? 'صلوات/يوم' : 'prayers/day') + '</div>' +
            '</div>';
        card.appendChild(row);

        // Difference indicator
        var expectedByNow = days * dailyTarget;
        var difference = completedAll - expectedByNow;
        var diffAbs = Math.abs(Math.round(difference));
        var diffDiv = document.createElement('div');
        diffDiv.style.cssText = 'text-align:center;margin-top:10px;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:700;';

        if (difference > 5) {
            diffDiv.style.background = 'rgba(var(--primary-rgb),0.08)';
            diffDiv.style.color = 'var(--primary)';
            diffDiv.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">trending_up</span> ' +
                (isAr ? 'متقدم على الخطة بـ ' + _arabicNum(diffAbs) + ' صلوات' :
                        'Ahead of plan by ' + diffAbs + ' prayers');
        } else if (difference < -5) {
            diffDiv.style.background = 'rgba(var(--danger-rgb),0.08)';
            diffDiv.style.color = 'var(--danger)';
            diffDiv.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">trending_down</span> ' +
                (isAr ? 'متأخر عن الخطة بـ ' + _arabicNum(diffAbs) + ' صلوات' :
                        'Behind plan by ' + diffAbs + ' prayers');
        } else {
            diffDiv.style.background = 'rgba(var(--primary-rgb),0.08)';
            diffDiv.style.color = 'var(--primary)';
            diffDiv.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">check_circle</span> ' +
                (isAr ? 'ماشي مع الخطة' : 'On track');
        }
        card.appendChild(diffDiv);

        parent.appendChild(card);
    }

    // ==================== REPORT 5: Monthly Trend ====================

    function renderReport5_MonthlyTrend(parent, plan, logInfo) {
        var card = _createCard('qadaR5');
        var header = _createHeader('show_chart', t('qdr_monthly_trend'), 22);
        card.appendChild(header);
        if (window.App.InfoTooltips) window.App.InfoTooltips.attachToHeader(22, header);

        var Hijri = window.App.Hijri;
        var chartDiv = document.createElement('div');
        chartDiv.style.cssText = 'width:100%;';

        if (!plan.createdDate) {
            chartDiv.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">' + t('qdr_start_logging') + '</div>';
            card.appendChild(chartDiv);
            parent.appendChild(card);
            return;
        }

        var created = new Date(plan.createdDate);
        var createdH = Hijri.gregorianToHijri(created);
        var todayH = Hijri.getTodayHijri();

        // Build data points: remaining at end of each month
        var labels = [];
        var values = [];
        var totalAll = plan.totalAll || 0;
        var runningCompleted = 0;

        var y = createdH.year, m = createdH.month;
        while (y < todayH.year || (y === todayH.year && m <= todayH.month)) {
            var key = y + '_' + m;
            var monthCount = logInfo.monthlyTotals[key] || 0;
            runningCompleted += monthCount;
            var remainingAtEnd = totalAll - runningCompleted;
            if (remainingAtEnd < 0) remainingAtEnd = 0;

            var shortNames = window.App.Dashboard ? window.App.Dashboard.getHijriMonthNamesShort() : [];
            var label = shortNames.length >= m ? shortNames[m - 1] : m + '';
            if (y !== todayH.year || labels.length === 0) {
                label += '\n' + (y % 100);
            }
            labels.push(label);
            values.push(remainingAtEnd);

            m++;
            if (m > 12) { m = 1; y++; }
            if (y > todayH.year + 5) break;
        }

        if (labels.length < 2) {
            chartDiv.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">' +
                (lang() === 'ar' ? 'البيانات ستظهر بعد شهرين على الأقل' : 'Data will appear after at least 2 months') + '</div>';
            card.appendChild(chartDiv);
            parent.appendChild(card);
            return;
        }

        // Build SVG line chart (downward trend)
        _renderTrendChart(chartDiv, labels, values, todayH);
        card.appendChild(chartDiv);
        parent.appendChild(card);
    }

    function _renderTrendChart(container, labels, values, todayH) {
        // Resolve theme colors
        var style = getComputedStyle(document.documentElement);
        var _primary = style.getPropertyValue('--primary').trim() || '#2D6A4F';
        var _primaryMid = style.getPropertyValue('--primary-mid').trim() || '#52B788';
        var _textMuted = style.getPropertyValue('--text-muted').trim() || '#8D99AE';

        var n = labels.length;
        var W = 360, H = 190;
        var padL = 40, padR = 12, padTop = 24, padBot = 28;
        var chartW = W - padL - padR;
        var chartH = H - padTop - padBot;
        var baseY = padTop + chartH;

        var maxVal = Math.max.apply(null, values) || 1;

        function toPoint(i, v) {
            var x = n === 1 ? padL + chartW / 2 : padL + (i / (n - 1)) * chartW;
            var y = padTop + chartH - (v / maxVal) * chartH;
            return { x: x, y: y };
        }

        function smoothLine(pts) {
            if (pts.length === 0) return '';
            var d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
            for (var i = 1; i < pts.length; i++) {
                var prev = pts[i - 1], cur = pts[i];
                var midX = (prev.x + cur.x) / 2;
                d += ' C ' + midX.toFixed(1) + ' ' + prev.y.toFixed(1) +
                     ' ' + midX.toFixed(1) + ' ' + cur.y.toFixed(1) +
                     ' ' + cur.x.toFixed(1) + ' ' + cur.y.toFixed(1);
            }
            return d;
        }

        function smoothArea(pts) {
            if (pts.length === 0) return '';
            var d = 'M ' + pts[0].x.toFixed(1) + ' ' + baseY;
            d += ' L ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
            for (var i = 1; i < pts.length; i++) {
                var prev = pts[i - 1], cur = pts[i];
                var midX = (prev.x + cur.x) / 2;
                d += ' C ' + midX.toFixed(1) + ' ' + prev.y.toFixed(1) +
                     ' ' + midX.toFixed(1) + ' ' + cur.y.toFixed(1) +
                     ' ' + cur.x.toFixed(1) + ' ' + cur.y.toFixed(1);
            }
            d += ' L ' + pts[pts.length - 1].x.toFixed(1) + ' ' + baseY + ' Z';
            return d;
        }

        var pts = [];
        for (var i = 0; i < n; i++) {
            pts.push(toPoint(i, values[i]));
        }

        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">';

        // Gradient
        svg += '<defs>';
        svg += '<linearGradient id="qadaTrendFill" x1="0" y1="0" x2="0" y2="1">';
        svg += '<stop offset="0%" stop-color="' + _primaryMid + '" stop-opacity="0.2"/>';
        svg += '<stop offset="100%" stop-color="' + _primaryMid + '" stop-opacity="0.02"/>';
        svg += '</linearGradient>';
        svg += '</defs>';

        // Y-axis gridlines
        var ySteps = 4;
        for (var g = 0; g <= ySteps; g++) {
            var gY = padTop + (g / ySteps) * chartH;
            var gVal = Math.round(maxVal * (1 - g / ySteps));
            svg += '<line x1="' + padL + '" y1="' + gY.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gY.toFixed(1) + '" stroke="rgba(128,128,128,0.08)" stroke-width="0.5"/>';
            var shortVal = gVal >= 1000 ? (gVal / 1000).toFixed(0) + 'k' : gVal;
            svg += '<text x="' + (padL - 4) + '" y="' + (gY + 3).toFixed(1) + '" text-anchor="end" font-family="Rubik,sans-serif" font-size="7" fill="' + _textMuted + '">' + shortVal + '</text>';
        }

        // Baseline
        svg += '<line x1="' + padL + '" y1="' + baseY + '" x2="' + (W - padR) + '" y2="' + baseY + '" stroke="rgba(0,0,0,0.06)" stroke-width="0.5"/>';

        // Area + line
        if (pts.length > 1) {
            svg += '<path d="' + smoothArea(pts) + '" fill="url(#qadaTrendFill)"/>';
            svg += '<path d="' + smoothLine(pts) + '" fill="none" stroke="' + _primaryMid + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
        }

        // Dots + labels
        for (var j = 0; j < n; j++) {
            var pt = pts[j];
            var val = values[j];
            var isLast = j === n - 1;

            // Dot
            var dotR = isLast ? 5 : 3.5;
            svg += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + dotR + '" fill="' + _primaryMid + '"/>';
            svg += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + (dotR - 1.5) + '" fill="white"/>';
            svg += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + (dotR - 2.5) + '" fill="' + _primaryMid + '"/>';

            // Value label above dot (show for first, last, and every 3rd)
            if (j === 0 || isLast || j % 3 === 0) {
                var shortVal2 = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
                svg += '<text x="' + pt.x.toFixed(1) + '" y="' + (pt.y - dotR - 4).toFixed(1) + '" text-anchor="middle" font-family="Rubik,sans-serif" font-size="7.5" font-weight="600" fill="' + (isLast ? _primary : '#6B7B8D') + '">' + shortVal2 + '</text>';
            }

            // Month label
            var lblLines = labels[j].split('\n');
            svg += '<text x="' + pt.x.toFixed(1) + '" y="' + (baseY + 12) + '" text-anchor="middle" font-family="\'Noto Kufi Arabic\',sans-serif" font-size="7" font-weight="500" fill="' + _textMuted + '">' + lblLines[0] + '</text>';
            if (lblLines[1]) {
                svg += '<text x="' + pt.x.toFixed(1) + '" y="' + (baseY + 20) + '" text-anchor="middle" font-family="Rubik,sans-serif" font-size="6" font-weight="500" fill="' + _textMuted + '">' + lblLines[1] + '</text>';
            }
        }

        svg += '</svg>';
        container.innerHTML = svg;
    }

    // ==================== HELPERS ====================

    function _createCard(id) {
        var card = document.createElement('div');
        card.className = 'chart-card';
        card.id = id;
        card.style.marginTop = '14px';
        return card;
    }

    function _createHeader(iconName, title, reportId) {
        var h = document.createElement('h3');
        h.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;">' + iconName + '</span> ' + title;
        return h;
    }

    function _pctColor(pct) {
        if (pct >= 75) return 'var(--primary)';
        if (pct >= 50) return 'var(--primary-mid, #52B788)';
        if (pct >= 25) return 'var(--accent)';
        return 'var(--danger)';
    }

    function _arabicNum(n) {
        return n.toLocaleString('ar-EG');
    }

    // ==================== PUBLIC API ====================

    return {
        hasPlan: hasPlan,
        injectSubToggle: injectSubToggle,
        switchSubView: switchSubView,
        renderQadaReports: renderQadaReports
    };
})();
