/* Prayer Tracker PWA — year-overview.js */
window.App = window.App || {};
window.App.YearOverview = (function() {

    function updateYearlyView(type) {
        var Hijri = window.App.Hijri;
        var Storage = window.App.Storage;
        var I18n = window.App.I18n;
        var currentLang = I18n.getCurrentLang();

        var yearEl = document.getElementById(type + 'YearlyYear');
        var yearVal = yearEl ? parseInt(yearEl.value) : Hijri.getCurrentHijriYear();
        Hijri.setCurrentHijriYear(yearVal);
        Storage.setCurrentYear(yearVal);
        Storage.loadAllData(type);

        var grid = document.getElementById(type + 'MonthsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        var todayH = Hijri.getTodayHijri();
        var totalPct = 0, totalCong = 0;
        var totalCompleted = 0, totalPossible = 0;

        // First pass: gather summary data
        var monthStats = [];
        for (var m = 1; m <= 12; m++) {
            var stats = Storage.getMonthStats(type, m, yearVal);
            var congRate = 0;
            if (type === 'fard') {
                var congData = Storage.getCongregationData(yearVal, m);
                var prayers = Storage.getPrayersArray('fard');
                var dataObj = Storage.getDataObject('fard');
                var mCong = 0, mComp = 0;
                prayers.forEach(function(prayer) {
                    if (dataObj[m] && dataObj[m][prayer.id]) {
                        var cDays = Object.keys(dataObj[m][prayer.id]).filter(function(d) { return dataObj[m][prayer.id][d]; });
                        mComp += cDays.length;
                        cDays.forEach(function(d) {
                            if (congData[prayer.id] && congData[prayer.id][parseInt(d)]) mCong++;
                        });
                    }
                });
                congRate = mComp > 0 ? Math.round((mCong / mComp) * 100) : 0;
                totalCong += congRate;
            }
            totalPct += stats.percentage;
            totalCompleted += stats.completed;
            totalPossible += stats.total;
            monthStats.push({ stats: stats, congRate: congRate });
        }

        // Best month: sort by completion %, then congregation % as tiebreaker, then most recent
        var bestMonthIdx = 0, bestPct = 0, bestCong = 0;
        for (var bm = 1; bm <= 12; bm++) {
            var bmStats = monthStats[bm - 1];
            var bmPct = bmStats.stats.percentage;
            var bmCong = bmStats.congRate;
            if (bmPct > bestPct || (bmPct === bestPct && bmCong > bestCong) || (bmPct === bestPct && bmCong === bestCong && bm > bestMonthIdx)) {
                bestPct = bmPct;
                bestCong = bmCong;
                bestMonthIdx = bm;
            }
        }

        // Summary cards — 2+1 layout matching dashboard style
        var summaryEl = document.getElementById(type + 'YearlySummary');
        if (summaryEl) {
            var avgPct = Math.round(totalPct / 12);
            var avgCong = type === 'fard' ? Math.round(totalCong / 12) : 0;
            var bestName = bestMonthIdx > 0 ? Hijri.getHijriMonthName(bestMonthIdx - 1) : '-';

            var html = '<div style="background:var(--card-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:20px;padding:16px;border:1px solid rgba(0,0,0,0.04);margin-bottom:14px;">';

            // ROW 1: two cards side by side
            html += '<div style="display:flex;gap:10px;">';

            // Card 1: أفضل شهر (best month)
            html += '<div style="flex:1;padding:14px 12px;border-radius:14px;background:rgba(var(--primary-rgb),0.05);border:1px solid rgba(var(--primary-rgb),0.08);display:flex;align-items:center;gap:10px;">' +
                '<div style="width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--accent),var(--accent-light));box-shadow:0 3px 8px rgba(var(--accent-rgb),0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                '<span class="material-symbols-rounded" style="font-size:20px;color:#fff;font-variation-settings:\'FILL\' 1,\'wght\' 500;">emoji_events</span></div>' +
                '<div><div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (currentLang === 'ar' ? 'أفضل شهر' : 'Best Month') + '</div>' +
                '<div style="font-size:15px;font-weight:800;color:var(--text-primary);font-family:\'Noto Kufi Arabic\',sans-serif;">' + bestName + '</div>' +
                '<div style="font-size:10px;color:var(--primary-mid);font-weight:700;">' + bestPct + '%</div></div></div>';

            if (type === 'fard') {
                // Card 2 (fard): متوسط الجماعة
                html += '<div style="flex:1;padding:14px 12px;border-radius:14px;background:rgba(var(--accent-rgb),0.05);border:1px solid rgba(var(--accent-rgb),0.08);display:flex;align-items:center;gap:10px;">' +
                    '<div style="width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--accent),var(--accent-light));box-shadow:0 3px 8px rgba(var(--accent-rgb),0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                    '<span class="material-symbols-rounded" style="font-size:20px;color:#fff;font-variation-settings:\'FILL\' 1,\'wght\' 500;">mosque</span></div>' +
                    '<div><div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (currentLang === 'ar' ? 'متوسط الجماعة' : 'Avg Congregation') + '</div>' +
                    '<div style="font-size:15px;font-weight:800;color:var(--text-primary);font-family:\'Rubik\',sans-serif;">' + avgCong + '%</div></div></div>';
            } else {
                // Card 2 (sunnah): متوسط الإنجاز
                html += '<div style="flex:1;padding:14px 12px;border-radius:14px;background:rgba(var(--primary-rgb),0.05);border:1px solid rgba(var(--primary-rgb),0.08);display:flex;align-items:center;gap:10px;">' +
                    '<div style="width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--primary),var(--primary-mid));box-shadow:0 3px 8px rgba(var(--primary-rgb),0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                    '<span class="material-symbols-rounded" style="font-size:20px;color:#fff;font-variation-settings:\'FILL\' 1,\'wght\' 500;">verified</span></div>' +
                    '<div><div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (currentLang === 'ar' ? 'متوسط الإنجاز' : 'Avg Completion') + '</div>' +
                    '<div style="font-size:15px;font-weight:800;color:var(--text-primary);font-family:\'Rubik\',sans-serif;">' + avgPct + '%</div></div></div>';
            }
            html += '</div>';

            // ROW 2: full-width bar
            html += '<div style="margin-top:10px;padding:14px 16px;border-radius:14px;background:rgba(var(--primary-rgb),0.05);border:1px solid rgba(var(--primary-rgb),0.08);display:flex;align-items:center;justify-content:space-between;">';
            html += '<div style="display:flex;align-items:center;gap:10px;">';
            html += '<div style="width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--primary),var(--primary-mid));box-shadow:0 3px 8px rgba(var(--primary-rgb),0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">';

            if (type === 'fard') {
                html += '<span class="material-symbols-rounded" style="font-size:20px;color:#fff;font-variation-settings:\'FILL\' 1,\'wght\' 500;">verified</span></div>';
                html += '<div><div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (currentLang === 'ar' ? 'متوسط الإنجاز' : 'Avg Completion') + '</div>';
                var subText = currentLang === 'ar' ? totalCompleted + ' صلاة من ' + totalPossible : totalCompleted + ' of ' + totalPossible + ' prayers';
                html += '<div style="font-size:12px;color:var(--text-muted);font-weight:500;">' + subText + '</div></div></div>';
                html += '<div style="font-size:28px;font-weight:800;color:var(--primary);font-family:\'Rubik\',sans-serif;font-variant-numeric:tabular-nums;">' + avgPct + '%</div>';
            } else {
                html += '<span class="material-symbols-rounded" style="font-size:20px;color:#fff;font-variation-settings:\'FILL\' 1,\'wght\' 500;">star</span></div>';
                html += '<div><div style="font-size:10px;color:var(--text-muted);font-weight:600;">' + (currentLang === 'ar' ? 'نسبة الإنجاز الكلي' : 'Total Completion Rate') + '</div>';
                var subText2 = currentLang === 'ar' ? totalCompleted + ' صلاة من ' + totalPossible : totalCompleted + ' of ' + totalPossible + ' prayers';
                html += '<div style="font-size:12px;color:var(--text-muted);font-weight:500;">' + subText2 + '</div></div></div>';
                var yearPct = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
                html += '<div style="font-size:28px;font-weight:800;color:var(--primary);font-family:\'Rubik\',sans-serif;font-variant-numeric:tabular-nums;">' + yearPct + '%</div>';
            }

            html += '</div></div>';
            summaryEl.innerHTML = html;

            // Info button for year overview (report 15)
            if (window.App.InfoTooltips) {
                var infoWrap = document.createElement('div');
                infoWrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:12px;position:relative;';
                infoWrap.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;color:var(--primary);">calendar_view_month</span>' +
                    '<span style="font-size:14px;font-weight:700;color:var(--text-primary);font-family:\'Noto Kufi Arabic\',sans-serif;">' +
                    (currentLang === 'ar' ? 'نظرة سنوية' : 'Year Overview') + '</span>';
                window.App.InfoTooltips.attachToHeader(15, infoWrap);
                summaryEl.appendChild(infoWrap);
            }
        }

        // Month cards
        for (var month = 1; month <= 12; month++) {
            var ms = monthStats[month - 1];
            var card = document.createElement('div');
            card.className = 'month-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.onclick = (function(t, mm) {
                return function() { openMonth(t, mm); };
            })(type, month);

            var isCurrent = todayH.year === yearVal && todayH.month === month;
            var isFuture = todayH.year === yearVal && month > todayH.month;
            if (isCurrent) card.classList.add('current-month');
            if (isFuture) card.style.opacity = '0.35';

            // Progress bar color
            var pct = ms.stats.percentage;
            var barColor = pct >= 90 ? 'linear-gradient(90deg, var(--primary-mid), var(--primary-light))' : pct >= 70 ? 'linear-gradient(90deg, var(--accent), var(--accent-light))' : pct > 0 ? 'linear-gradient(90deg, var(--danger), var(--danger-light))' : 'transparent';

            var congBadge = '';
            if (type === 'fard' && ms.congRate > 0) {
                congBadge = '<span class="month-badge"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">mosque</span> ' + ms.congRate + '%</span>';
            }

            var hijriLabel = Hijri.getHijriMonthName(month - 1);
            var gregSpan = Hijri.getGregorianSpanForHijriMonth(yearVal, month);

            card.innerHTML =
                '<div class="month-card-header">' +
                    '<h3>' + hijriLabel + (isCurrent ? ' <span class="current-dot"></span>' : '') + '</h3>' +
                    '<span class="month-pct">' + pct + '%</span>' +
                '</div>' +
                '<div class="month-greg-ref">' + gregSpan + '</div>' +
                '<div class="month-progress">' +
                    '<div class="progress-bar">' +
                        '<div class="progress-fill" style="width:' + pct + '%;background:' + barColor + '"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="month-stats">' +
                    '<span class="month-stat-mini">' + ms.stats.completed + '/' + ms.stats.total + '</span>' +
                    congBadge +
                '</div>';

            grid.appendChild(card);
        }
    }

    function openMonth(type, month) {
        var Hijri = window.App.Hijri;
        var Storage = window.App.Storage;

        Storage.setCurrentMonth(month);
        Hijri.setCurrentHijriMonth(month);
        var titleEl = document.getElementById(type + 'CurrentMonthTitle');
        if (titleEl) titleEl.textContent = Hijri.formatHijriMonthHeader(Hijri.getCurrentHijriYear(), month);

        var yrlyView = document.getElementById(type + 'YearlyView');
        var mthlyView = document.getElementById(type + 'MonthlyView');
        if (yrlyView) yrlyView.classList.remove('active');
        if (mthlyView) mthlyView.classList.add('active');

        renderMonthDetail(type);
    }

    function backToYearly(type) {
        var mView = document.getElementById(type + 'MonthlyView');
        var yView = document.getElementById(type + 'YearlyView');
        if (mView) mView.classList.remove('active');
        if (yView) yView.classList.add('active');
        updateYearlyView(type);
    }

    function renderMonthDetail(type) {
        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;
        var I18n = window.App.I18n;
        var Female = window.App.Female;

        var container = document.getElementById(type + 'PrayersContainer');
        if (!container) return;
        container.innerHTML = '';

        var prayers = Storage.getPrayersArray(type);
        var dataObj = Storage.getDataObject(type);
        var hYear = Hijri.getCurrentHijriYear();
        var hMonth = Hijri.getCurrentHijriMonth();
        var daysInMonth = Hijri.getHijriDaysInMonth(hYear, hMonth);
        var activeProfile = Storage.getActiveProfile();
        var isFemale = activeProfile && activeProfile.gender === 'female' && activeProfile.age >= 12;
        var exemptData = isFemale ? Female.getExemptDays(hYear, hMonth) : {};

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

                    if (dataObj[hMonth] && dataObj[hMonth][prayer.id] && dataObj[hMonth][prayer.id][day]) {
                        dayBox.classList.add('checked');
                        // Show congregation for fard
                        if (type === 'fard') {
                            var congData = Storage.getCongregationData(hYear, hMonth);
                            if (congData[prayer.id] && congData[prayer.id][day]) {
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
                        return function() { window.handleDayClick(t, pId, d); };
                    })(type, prayer.id, day);
                }

                grid.appendChild(dayBox);
            }
        });
    }

    // Private helper — same as in fard-tracker
    function createDualDayNum(hijriDay, hYear, hMonth) {
        var Hijri = window.App.Hijri;
        var frag = document.createDocumentFragment();
        var dayNum = document.createElement('span');
        dayNum.className = 'day-number';
        dayNum.textContent = hijriDay;
        frag.appendChild(dayNum);

        try {
            var gDate = Hijri.hijriToGregorian(hYear, hMonth, hijriDay);
            var gregSpan = document.createElement('span');
            gregSpan.className = 'day-greg';
            gregSpan.textContent = gDate.getDate();
            frag.appendChild(gregSpan);
        } catch(e) {}

        var iconSpan = document.createElement('span');
        iconSpan.className = 'day-icon material-symbols-rounded';
        iconSpan.style.display = 'none';
        iconSpan.style.fontSize = '13px';
        iconSpan.textContent = 'mosque';
        frag.appendChild(iconSpan);

        return frag;
    }

    // Year overview toggle/reset day functions
    function toggleDay(type, prayerId, day) {
        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;

        var hMonth = Hijri.getCurrentHijriMonth();
        var hYear = Hijri.getCurrentHijriYear();

        if (Hijri.isFutureDateHijri(day, hMonth, hYear)) {
            window.App.UI.showToast(window.App.I18n.t('future_date'), 'warning');
            return;
        }

        var dataObj = Storage.getDataObject(type);
        if (!dataObj[hMonth]) dataObj[hMonth] = {};
        if (!dataObj[hMonth][prayerId]) dataObj[hMonth][prayerId] = {};
        dataObj[hMonth][prayerId][day] = !dataObj[hMonth][prayerId][day];
        Storage.saveMonthData(type, hMonth);
        renderMonthDetail(type);
    }

    function resetMonth(type) {
        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;
        var hMonth = Hijri.getCurrentHijriMonth();

        window.App.UI.showConfirm(window.App.I18n.t('confirm_clear')).then(function(confirmed) {
            if (confirmed) {
                var dataObj = Storage.getDataObject(type);
                var prayers = Storage.getPrayersArray(type);
                dataObj[hMonth] = {};
                prayers.forEach(function(p) { dataObj[hMonth][p.id] = {}; });
                Storage.saveMonthData(type, hMonth);
                renderMonthDetail(type);
            }
        });
    }

    return {
        updateYearlyView: updateYearlyView,
        openMonth: openMonth,
        backToYearly: backToYearly,
        renderMonthDetail: renderMonthDetail,
        toggleDay: toggleDay,
        resetMonth: resetMonth
    };
})();

// Backward compat
window.updateYearlyView = window.App.YearOverview.updateYearlyView;
window.openMonth = window.App.YearOverview.openMonth;
window.backToYearly = window.App.YearOverview.backToYearly;
window.renderMonthDetail = window.App.YearOverview.renderMonthDetail;
