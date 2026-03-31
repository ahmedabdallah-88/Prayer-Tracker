/* Prayer Tracker PWA — missed-prayer-notif.js
 * Shows a notification bar when fard prayers have passed but are not marked.
 * Single missed = full banner with 3 buttons.
 * Multiple missed = compact summary with icon-button cards.
 *
 * Writes to the SAME localStorage keys as handleDayClick() — this is a
 * shortcut, not a separate data layer.
 */
window.App = window.App || {};
window.App.MissedPrayerNotif = (function() {

    var PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    // Material Symbols icons matching the prayer tabs
    var PRAYER_ICONS = {
        fajr: 'wb_twilight',
        dhuhr: 'wb_sunny',
        asr: 'partly_cloudy_day',
        maghrib: 'wb_twilight',
        isha: 'dark_mode'
    };

    // ==================== CHECK & SHOW ====================

    function checkAndShow() {
        var container = document.getElementById('missedPrayerBar');
        if (!container) return;

        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;
        var PrayerTimes = window.App.PrayerTimes;

        if (!Storage || !Hijri || !PrayerTimes) {
            container.style.display = 'none';
            return;
        }

        // Only show for fard section or if section is active
        if (!Storage.getActiveProfile()) {
            container.style.display = 'none';
            return;
        }

        // Check session dismiss — respect 30-minute cooldown
        var dismissed = sessionStorage.getItem('missedPrayerDismissed');
        if (dismissed && (Date.now() - parseInt(dismissed)) < 30 * 60 * 1000) {
            container.style.display = 'none';
            return;
        }

        // Get prayer times data
        var ptData = PrayerTimes.getData();
        if (!ptData || !ptData.timings) {
            container.style.display = 'none';
            return;
        }

        var timings = ptData.timings;

        // Get today's Hijri date
        var todayH = Hijri.getTodayHijri();
        var hDay = todayH.day;
        var hMonth = todayH.month;
        var hYear = todayH.year;

        // Ensure Storage is pointing at today's month/year for data reads
        var dataObj = Storage.getDataObject('fard');
        if (!dataObj[hMonth]) dataObj[hMonth] = {};

        // Get congregation and qada data for today's month
        var congData = Storage.getCongregationData(hYear, hMonth);
        var qadaData = Storage.getQadaData(hYear, hMonth);

        // Check female exempt
        var profile = Storage.getActiveProfile();
        var isFemale = profile && profile.gender === 'female' && profile.age >= 12;
        var exemptData = {};
        if (isFemale && window.App.Female) {
            exemptData = window.App.Female.getExemptDays(hYear, hMonth);
        }

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();

        // Build prayer time array
        var prayerMinutes = {};
        for (var pi = 0; pi < PRAYER_ORDER.length; pi++) {
            var pid = PRAYER_ORDER[pi];
            prayerMinutes[pid] = PrayerTimes.parseTimeToMinutes(timings[pid]);
        }

        var missedPrayers = [];

        for (var i = 0; i < PRAYER_ORDER.length; i++) {
            var prayerId = PRAYER_ORDER[i];
            var prayerTime = prayerMinutes[prayerId];

            // Determine if this prayer's time has "passed"
            // A prayer is passed 30 minutes after its start time
            var hasPassed = false;
            var BUFFER = 30; // minutes after prayer start

            if (prayerId === 'isha') {
                var fajrTime = prayerMinutes['fajr'];
                if (nowMin < fajrTime) {
                    // After midnight, before fajr — isha from "yesterday" is passed
                    hasPassed = true;
                } else {
                    hasPassed = (nowMin >= prayerTime + BUFFER);
                }
            } else {
                hasPassed = (nowMin >= prayerTime + BUFFER);
            }

            if (!hasPassed) continue;

            // Check if already marked (any state: alone, congregation, qada, exempt)
            var isMarked = !!(dataObj[hMonth][prayerId] && dataObj[hMonth][prayerId][hDay]);
            var isCong = !!(congData[prayerId] && congData[prayerId][hDay]);
            var isQada = !!(qadaData[prayerId] && qadaData[prayerId][hDay]);
            var isExempt = !!(isFemale && exemptData[hDay] && exemptData[hDay][prayerId]);

            if (isMarked || isCong || isQada || isExempt) continue;

            missedPrayers.push({
                id: prayerId,
                icon: PRAYER_ICONS[prayerId],
                time: timings[prayerId]
            });
        }

        // Render
        if (missedPrayers.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        container.style.display = 'block';

        if (missedPrayers.length === 1) {
            _renderBanner(container, missedPrayers[0], hDay, hMonth, hYear);
        } else {
            _renderSummary(container, missedPrayers, hDay, hMonth, hYear);
        }
    }

    // ==================== RENDER: SINGLE BANNER ====================

    function _renderBanner(container, prayer, hDay, hMonth, hYear) {
        var I18n = window.App.I18n;
        var lang = I18n ? I18n.getCurrentLang() : 'ar';
        var prayerName = _getPrayerName(prayer.id);

        var html = '';
        html += '<div class="missed-banner" id="missedBanner_' + prayer.id + '">';
        html += '  <div class="missed-banner-icon"><span class="material-symbols-rounded" style="font-size:20px;color:#fff;">' + prayer.icon + '</span></div>';
        html += '  <div class="missed-banner-content">';
        html += '    <div class="missed-banner-title">';
        html += lang === 'ar' ? '\u0644\u0645 \u062a\u0633\u062c\u0644 ' + prayerName : 'Not marked: ' + prayerName;
        html += '    </div>';
        html += '    <div class="missed-banner-sub">';
        html += lang === 'ar' ? '\u0641\u0627\u062a \u0645\u064a\u0639\u0627\u062f\u0647\u0627' : 'Time has passed';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="missed-banner-actions">';
        html += _buildActionBtn(prayer.id, 'alone', hDay, hMonth, hYear, lang, false);
        html += _buildActionBtn(prayer.id, 'jamaah', hDay, hMonth, hYear, lang, false);
        html += _buildActionBtn(prayer.id, 'qada', hDay, hMonth, hYear, lang, false);
        html += '  </div>';
        html += '  <button class="missed-banner-close" onclick="window.App.MissedPrayerNotif.dismiss()"><span class="material-symbols-rounded" style="font-size:14px;">close</span></button>';
        html += '</div>';

        container.innerHTML = html;
    }

    // ==================== RENDER: COMPACT SUMMARY ====================

    function _renderSummary(container, prayers, hDay, hMonth, hYear) {
        var I18n = window.App.I18n;
        var lang = I18n ? I18n.getCurrentLang() : 'ar';

        var html = '';
        html += '<div class="missed-summary" id="missedSummary">';
        html += '  <div class="missed-summary-header">';
        html += '    <div class="missed-summary-title">';
        html += '      <span class="missed-summary-badge" id="missedBadgeCount">' + prayers.length + '</span>';
        html += lang === 'ar' ? '\u0635\u0644\u0648\u0627\u062a \u0644\u0645 \u062a\u064f\u0633\u062c\u0651\u0644' : 'Prayers not marked';
        html += '    </div>';
        html += '    <button class="missed-summary-dismiss" onclick="window.App.MissedPrayerNotif.dismiss()">';
        html += lang === 'ar' ? '\u062a\u062c\u0627\u0647\u0644' : 'Dismiss';
        html += ' <span class="material-symbols-rounded" style="font-size:12px;vertical-align:middle;">close</span>';
        html += '    </button>';
        html += '  </div>';
        html += '  <div class="missed-summary-prayers' + (prayers.length >= 4 ? ' missed-compact' : '') + '">';

        for (var i = 0; i < prayers.length; i++) {
            var p = prayers[i];
            var pName = _getPrayerName(p.id);
            html += '<div class="missed-prayer-card" id="missedCard_' + p.id + '">';
            html += '  <div class="missed-prayer-card-name">' + pName + '</div>';
            html += '  <div class="missed-prayer-card-actions" id="missedActions_' + p.id + '">';
            html += _buildActionBtn(p.id, 'alone', hDay, hMonth, hYear, lang, true);
            html += _buildActionBtn(p.id, 'jamaah', hDay, hMonth, hYear, lang, true);
            html += _buildActionBtn(p.id, 'qada', hDay, hMonth, hYear, lang, true);
            html += '  </div>';
            html += '</div>';
        }

        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
    }

    // ==================== ACTION BUTTON BUILDER ====================

    function _buildActionBtn(prayerId, markType, hDay, hMonth, hYear, lang, isCompact) {
        var icons = { alone: 'check', jamaah: 'mosque', qada: 'schedule' };
        var labels = {
            alone:  { ar: '\u0645\u0646\u0641\u0631\u062f', en: 'Alone' },
            jamaah: { ar: '\u062c\u0645\u0627\u0639\u0629', en: 'Jamaah' },
            qada:   { ar: '\u0642\u0636\u0627\u0621', en: 'Qada' }
        };
        var cssClass = 'missed-' + (isCompact ? 'sp-' : '') + 'btn missed-' + (isCompact ? 'sp-' : '') + 'btn-' + markType;
        var onclick = "window.App.MissedPrayerNotif.mark('" + prayerId + "','" + markType + "'," + hDay + "," + hMonth + "," + hYear + ")";

        if (isCompact) {
            return '<button class="' + cssClass + '" onclick="' + onclick + '" title="' + labels[markType][lang] + '">' +
                '<span class="material-symbols-rounded" style="font-size:14px;">' + icons[markType] + '</span></button>';
        }
        return '<button class="' + cssClass + '" onclick="' + onclick + '">' +
            '<span class="missed-btn-icon"><span class="material-symbols-rounded" style="font-size:16px;">' + icons[markType] + '</span></span>' +
            labels[markType][lang] + '</button>';
    }

    // ==================== MARK PRAYER ====================

    function mark(prayerId, markType, day, month, year) {
        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;

        // Ensure we're working with the correct year/month in Storage
        var savedYear = Storage.getCurrentYear();
        var savedMonth = Storage.getCurrentMonth();
        Storage.setCurrentYear(year);
        Storage.setCurrentMonth(month);

        // Reload fard data for the target month if Storage isn't pointing there
        if (savedYear !== year || savedMonth !== month) {
            Storage.loadAllData('fard', year);
        }

        var dataObj = Storage.getDataObject('fard');
        if (!dataObj[month]) dataObj[month] = {};
        if (!dataObj[month][prayerId]) dataObj[month][prayerId] = {};

        var congData = Storage.getCongregationData(year, month);
        var qadaData = Storage.getQadaData(year, month);

        // ===== Write data exactly like handleDayClick =====

        if (markType === 'alone') {
            // Mark as prayed (alone) — same as State 0 → State 1
            dataObj[month][prayerId][day] = true;
        } else if (markType === 'jamaah') {
            // Mark as prayed + congregation — State 0 → State 1 + congregation
            dataObj[month][prayerId][day] = true;
            if (!congData[prayerId]) congData[prayerId] = {};
            congData[prayerId][day] = true;
        } else if (markType === 'qada') {
            // Mark as prayed + qada — matches State 0 → checked + qada flag
            dataObj[month][prayerId][day] = true;
            if (!qadaData[prayerId]) qadaData[prayerId] = {};
            qadaData[prayerId][day] = true;
        }

        // ===== Save — same calls as handleDayClick =====
        Storage.saveMonthData('fard', month);
        Storage.saveCongregationData(year, month, congData);
        Storage.saveQadaData(year, month, qadaData);

        // Restore Storage year/month if changed
        if (savedYear !== year || savedMonth !== month) {
            Storage.setCurrentYear(savedYear);
            Storage.setCurrentMonth(savedMonth);
            Storage.loadAllData('fard', savedYear);
        }

        // ===== Refresh UI — same calls as handleDayClick =====
        // Only refresh calendar if we're viewing fard tracker in current month
        var viewingHYear = Hijri.getCurrentHijriYear();
        var viewingHMonth = Hijri.getCurrentHijriMonth();
        if (viewingHYear === year && viewingHMonth === month) {
            if (window.App.Tracker && window.App.Tracker._refreshGridAndStats) {
                window.App.Tracker._refreshGridAndStats('fard');
            } else if (typeof window.renderTrackerMonth === 'function') {
                window.renderTrackerMonth('fard');
            }
        }

        if (typeof window.updateTrackerStats === 'function') {
            window.updateTrackerStats('fard');
        }
        if (typeof window.renderStreaks === 'function') {
            window.renderStreaks('fard');
        }
        if (typeof window.updateCongregationStats === 'function') {
            window.updateCongregationStats();
        }
        if (window.App.Jamaah && window.App.Jamaah.invalidateStreakCache) {
            window.App.Jamaah.invalidateStreakCache();
        }
        if (window.App.UI && window.App.UI.checkPrayerReminders) {
            window.App.UI.checkPrayerReminders();
        }

        // ===== Show feedback =====
        _showFeedback(prayerId, markType);

        // ===== Haptic =====
        if (window.App.UI && window.App.UI.hapticFeedback) {
            window.App.UI.hapticFeedback('success');
        }

        // ===== Toast =====
        var I18n = window.App.I18n;
        var lang = I18n ? I18n.getCurrentLang() : 'ar';
        var prayerName = _getPrayerName(prayerId);
        var msgs = {
            alone:  { ar: '\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 ' + prayerName + ' \u2014 \u0645\u0646\u0641\u0631\u062f \u2713', en: prayerName + ' marked \u2014 Alone \u2713' },
            jamaah: { ar: '\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 ' + prayerName + ' \u2014 \u062c\u0645\u0627\u0639\u0629 \u2713', en: prayerName + ' marked \u2014 Jamaah \u2713' },
            qada:   { ar: '\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 ' + prayerName + ' \u2014 \u0642\u0636\u0627\u0621 \u2713', en: prayerName + ' marked \u2014 Qada \u2713' }
        };
        if (window.App.UI && window.App.UI.showToast) {
            window.App.UI.showToast(msgs[markType][lang], 'success', 2000);
        }
    }

    // ==================== FEEDBACK ANIMATION ====================

    function _showFeedback(prayerId, markType) {
        var feedbackIcons = { alone: 'check_circle', jamaah: 'mosque', qada: 'schedule' };
        var feedbackClasses = { alone: 'missed-feedback-alone', jamaah: 'missed-feedback-jamaah', qada: 'missed-feedback-qada' };

        var banner = document.getElementById('missedBanner_' + prayerId);
        var card = document.getElementById('missedCard_' + prayerId);

        if (banner) {
            // Banner mode — overlay then collapse
            var overlay = document.createElement('div');
            overlay.className = 'missed-feedback-overlay ' + feedbackClasses[markType];
            overlay.innerHTML = '<span class="material-symbols-rounded" style="font-size:32px;">' + feedbackIcons[markType] + '</span>';
            banner.style.position = 'relative';
            banner.appendChild(overlay);

            setTimeout(function() {
                banner.classList.add('missed-banner-collapsing');
            }, 450);
            setTimeout(function() {
                var cont = document.getElementById('missedPrayerBar');
                if (cont) {
                    cont.style.display = 'none';
                    cont.innerHTML = '';
                }
                // Recheck — might be more missed prayers
                checkAndShow();
            }, 900);
        }

        if (card) {
            // Summary mode — replace buttons with feedback icon
            var actionsEl = document.getElementById('missedActions_' + prayerId);
            if (actionsEl) {
                actionsEl.innerHTML = '<div class="missed-card-feedback"><span class="material-symbols-rounded" style="font-size:22px;color:var(--primary);">' + feedbackIcons[markType] + '</span></div>';
            }
            card.classList.add('missed-prayer-card-marked');

            // Update badge count
            var badge = document.getElementById('missedBadgeCount');
            if (badge) {
                var newCount = (parseInt(badge.textContent) || 1) - 1;
                badge.textContent = newCount;
                if (newCount <= 0) {
                    setTimeout(function() {
                        var cont = document.getElementById('missedPrayerBar');
                        if (cont) {
                            cont.style.display = 'none';
                            cont.innerHTML = '';
                        }
                    }, 800);
                }
            }
        }
    }

    // ==================== DISMISS ====================

    function dismiss() {
        var container = document.getElementById('missedPrayerBar');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
        sessionStorage.setItem('missedPrayerDismissed', String(Date.now()));
    }

    // ==================== HELPERS ====================

    function _getPrayerName(prayerId) {
        if (window.App.I18n && window.App.I18n.getPrayerName) {
            return window.App.I18n.getPrayerName(prayerId);
        }
        var names = { fajr: '\u0627\u0644\u0641\u062c\u0631', dhuhr: '\u0627\u0644\u0638\u0647\u0631', asr: '\u0627\u0644\u0639\u0635\u0631', maghrib: '\u0627\u0644\u0645\u063a\u0631\u0628', isha: '\u0627\u0644\u0639\u0634\u0627\u0621' };
        return names[prayerId] || prayerId;
    }

    // ==================== PUBLIC API ====================

    return {
        checkAndShow: checkAndShow,
        mark: mark,
        dismiss: dismiss
    };

})();
