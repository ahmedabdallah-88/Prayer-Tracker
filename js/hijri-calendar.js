/**
 * hijri-calendar.js — Hijri Calendar Engine
 * Extracted from index.html
 */
window.App = window.App || {};
window.App.Hijri = (function() {
    var _hijriDay1Cache = {};
    var currentHijriYear, currentHijriMonth;

    // Initialize from today's date
    // (will be set properly during app init)

    // Convert a Gregorian Date object to Hijri {year, month, day}
    function gregorianToHijri(gDate) {
        try {
            var fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
                year: 'numeric', month: 'numeric', day: 'numeric'
            });
            var parts = fmt.formatToParts(gDate);
            var hYear = 0, hMonth = 0, hDay = 0;
            parts.forEach(function(p) {
                if (p.type === 'year') hYear = parseInt(p.value);
                if (p.type === 'month') hMonth = parseInt(p.value);
                if (p.type === 'day') hDay = parseInt(p.value);
            });
            return { year: hYear, month: hMonth, day: hDay };
        } catch(e) {
            console.error('Hijri conversion error:', e);
            return { year: 1446, month: 1, day: 1 };
        }
    }

    // Get today's Hijri date
    function getTodayHijri() {
        return gregorianToHijri(new Date());
    }

    // Get Hijri overrides from localStorage
    function getHijriOverrides() {
        try {
            var stored = localStorage.getItem('salah_hijri_overrides');
            return stored ? JSON.parse(stored) : {};
        } catch(e) { return {}; }
    }

    function saveHijriOverrides(overrides) {
        try { localStorage.setItem('salah_hijri_overrides', JSON.stringify(overrides)); }
        catch(e) { console.error('Save hijri overrides error:', e); }
    }

    // Get the number of days in a Hijri month
    // Strategy: find Gregorian dates for day 1 of this month and day 1 of next month, count difference
    function getHijriDaysInMonth(hYear, hMonth) {
        // Check direct days-count override first (user said 29 or 30)
        var daysOverrideKey = 'salah_hijri_days_' + hYear + '_' + hMonth;
        var daysOverride = localStorage.getItem(daysOverrideKey);
        if (daysOverride) {
            return parseInt(daysOverride);
        }

        var overrides = getHijriOverrides();
        var key = hYear + '_' + hMonth;
        var nextMonth = hMonth === 12 ? 1 : hMonth + 1;
        var nextYear = hMonth === 12 ? hYear + 1 : hYear;
        var nextKey = nextYear + '_' + nextMonth;

        // If we have overrides for both this and next month, use those
        if (overrides[key] && overrides[nextKey]) {
            var d1 = new Date(overrides[key]);
            var d2 = new Date(overrides[nextKey]);
            return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        }

        // Direct check: does day 30 exist in this Hijri month?
        // Get Gregorian date for day 1, then check day 30
        try {
            var day1G = hijriToGregorianDay1(hYear, hMonth);
            // Day 30 would be 29 days after day 1
            var day30G = new Date(day1G.getTime() + 29 * 86400000);
            var h30 = gregorianToHijri(day30G);

            // If day 30's Hijri month is still the same → 30 days
            // If day 30's Hijri month changed → 29 days
            if (h30.year === hYear && h30.month === hMonth) {
                return 30;
            } else {
                return 29;
            }
        } catch(e) {
            // Fallback to difference method
            var startG = hijriToGregorianDay1(hYear, hMonth);
            var endG = hijriToGregorianDay1(nextYear, nextMonth);
            var diff = Math.round((endG - startG) / (1000 * 60 * 60 * 24));
            return diff > 0 ? diff : 30;
        }
    }

    // Convert Hijri year/month/day=1 to approximate Gregorian Date
    // Uses binary search with Intl as the oracle
    function hijriToGregorianDay1(hYear, hMonth) {
        var overrides = getHijriOverrides();
        var key = hYear + '_' + hMonth;
        if (overrides[key]) return new Date(overrides[key]);
        if (_hijriDay1Cache[key]) return new Date(_hijriDay1Cache[key]);

        // Approximate: Hijri year ≈ Gregorian year - 579 (rough)
        // More precise: each Hijri year ≈ 354.37 days
        var approxDays = ((hYear - 1) * 354.36667) + ((hMonth - 1) * 29.53056);
        var epochGreg = new Date(622, 6, 19); // Hijri epoch approximate
        var guess = new Date(epochGreg.getTime() + approxDays * 86400000);

        // Binary search: find the Gregorian date where Hijri = hYear/hMonth/1
        var low = new Date(guess.getTime() - 45 * 86400000);
        var high = new Date(guess.getTime() + 45 * 86400000);

        for (var i = 0; i < 60; i++) {
            var mid = new Date((low.getTime() + high.getTime()) / 2);
            var h = gregorianToHijri(mid);
            var midVal = h.year * 10000 + h.month * 100 + h.day;
            var targetVal = hYear * 10000 + hMonth * 100 + 1;

            if (midVal < targetVal) {
                low = new Date(mid.getTime() + 86400000);
            } else if (midVal > targetVal) {
                high = new Date(mid.getTime() - 86400000);
            } else {
                _hijriDay1Cache[key] = mid.getTime();
                return mid;
            }
        }

        // Fallback: walk from low
        for (var d = new Date(low); d <= high; d = new Date(d.getTime() + 86400000)) {
            var hh = gregorianToHijri(d);
            if (hh.year === hYear && hh.month === hMonth && hh.day === 1) {
                _hijriDay1Cache[key] = d.getTime();
                return d;
            }
        }
        _hijriDay1Cache[key] = guess.getTime();
        return guess;
    }

    // Convert Hijri date to Gregorian
    function hijriToGregorian(hYear, hMonth, hDay) {
        var day1 = hijriToGregorianDay1(hYear, hMonth);
        return new Date(day1.getTime() + (hDay - 1) * 86400000);
    }

    // Check if a Hijri date is in the future
    function isFutureDateHijri(hDay, hMonth, hYear) {
        var today = getTodayHijri();
        if (hYear > today.year) return true;
        if (hYear < today.year) return false;
        if (hMonth > today.month) return true;
        if (hMonth < today.month) return false;
        return hDay > today.day;
    }

    // Get Gregorian months that a Hijri month spans
    function getGregorianSpanForHijriMonth(hYear, hMonth) {
        var day1 = hijriToGregorianDay1(hYear, hMonth);
        var daysInMonth = getHijriDaysInMonth(hYear, hMonth);
        var lastDay = new Date(day1.getTime() + (daysInMonth - 1) * 86400000);

        var lang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
        var gMonthNames = lang === 'ar' ? window.App.Config.gregorianMonthNamesAr : window.App.Config.gregorianMonthNamesEn;

        var m1 = gMonthNames[day1.getMonth()];
        var m2 = gMonthNames[lastDay.getMonth()];
        var y1 = day1.getFullYear();
        var y2 = lastDay.getFullYear();

        if (day1.getMonth() === lastDay.getMonth() && y1 === y2) {
            return m1 + ' ' + y1;
        } else if (y1 === y2) {
            return m1 + '-' + m2 + ' ' + y1;
        } else {
            return m1 + ' ' + y1 + ' - ' + m2 + ' ' + y2;
        }
    }

    // Get the Gregorian day number for a given Hijri day in a month
    function getGregorianDayForHijri(hYear, hMonth, hDay) {
        var gDate = hijriToGregorian(hYear, hMonth, hDay);
        return gDate.getDate();
    }

    // Format display header: "رمضان ١٤٤٧ (فبراير-مارس ٢٠٢٦)"
    function formatHijriMonthHeader(hYear, hMonth) {
        var monthName = getHijriMonthName(hMonth - 1);
        var gregSpan = getGregorianSpanForHijriMonth(hYear, hMonth);
        return monthName + ' ' + hYear + ' (' + gregSpan + ')';
    }

    function getHijriMonthName(index) {
        // index: 0-11
        var lang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
        var names = lang === 'ar' ? window.App.Config.hijriMonthNamesAr : window.App.Config.hijriMonthNamesEn;
        return names[index];
    }

    function createDualDayNum(hijriDay, hYear, hMonth) {
        var frag = document.createDocumentFragment();
        var dayNum = document.createElement('span');
        dayNum.className = 'day-number';
        dayNum.textContent = hijriDay;
        frag.appendChild(dayNum);

        try {
            var gDate = hijriToGregorian(hYear, hMonth, hijriDay);
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
        iconSpan.textContent = 'mosque'; // default, overridden by CSS context
        frag.appendChild(iconSpan);

        return frag;
    }

    // ==================== MONTH DAYS TOGGLE (29/30) ====================
    function toggleMonthDays() {
        var hYear = currentHijriYear;
        var hMonth = currentHijriMonth;
        var daysKey = 'salah_hijri_days_' + hYear + '_' + hMonth;

        var currentDays = getHijriDaysInMonth(hYear, hMonth);
        var newDays = currentDays === 30 ? 29 : 30;

        localStorage.setItem(daysKey, String(newDays));

        // Clear day 30 and 31 data if switching to 29
        if (newDays === 29) {
            cleanGhostDaysForMonth(hYear, hMonth, 29);
        }

        // Refresh views
        _hijriDay1Cache = {};
        updateMonthDaysButton();
        var currentSection = window.App.Storage ? window.App.Storage.getCurrentSection() : 'fard';
        window.updateTrackerView(currentSection === 'sunnah' ? 'sunnah' : 'fard');

        var monthName = getHijriMonthName(hMonth - 1);
        var currentLang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
        window.App.UI.showToast(monthName + ' ' + hYear + ': ' + newDays + ' ' + (currentLang === 'ar' ? 'يوم' : 'days'), 'success');
    }

    // Clean ghost day entries (day 30/31) from ALL data types for a specific month
    function cleanGhostDaysForMonth(hYear, hMonth, maxDay) {
        var ghostDays = ['30', '31'];
        if (maxDay >= 30) ghostDays = ['31'];

        // Clean tracker data (fard + sunnah)
        ['fard', 'sunnah'].forEach(function(type) {
            var key = window.App.Storage.getStorageKey(type, hMonth, hYear);
            var stored = localStorage.getItem(key);
            if (stored) {
                var data = JSON.parse(stored);
                var changed = false;
                Object.keys(data).forEach(function(prayerId) {
                    if (data[prayerId] && typeof data[prayerId] === 'object') {
                        ghostDays.forEach(function(d) {
                            if (data[prayerId][d] !== undefined) {
                                delete data[prayerId][d];
                                changed = true;
                            }
                        });
                    }
                });
                if (changed) localStorage.setItem(key, JSON.stringify(data));
            }
        });

        // Clean congregation data
        var congKey = window.App.Storage.getCongregationKey(hYear, hMonth);
        var congStored = localStorage.getItem(congKey);
        if (congStored) {
            var congData = JSON.parse(congStored);
            var changed = false;
            Object.keys(congData).forEach(function(prayerId) {
                if (congData[prayerId] && typeof congData[prayerId] === 'object') {
                    ghostDays.forEach(function(d) {
                        if (congData[prayerId][d] !== undefined) { delete congData[prayerId][d]; changed = true; }
                    });
                }
            });
            if (changed) localStorage.setItem(congKey, JSON.stringify(congData));
        }

        // Clean qada data
        var qadaKey = window.App.Storage.getQadaKey(hYear, hMonth);
        var qadaStored = localStorage.getItem(qadaKey);
        if (qadaStored) {
            var qadaData = JSON.parse(qadaStored);
            var changed = false;
            Object.keys(qadaData).forEach(function(prayerId) {
                if (qadaData[prayerId] && typeof qadaData[prayerId] === 'object') {
                    ghostDays.forEach(function(d) {
                        if (qadaData[prayerId][d] !== undefined) { delete qadaData[prayerId][d]; changed = true; }
                    });
                }
            });
            if (changed) localStorage.setItem(qadaKey, JSON.stringify(qadaData));
        }

        // Clean exempt data
        var exemptKey = window.App.Storage.getExemptKey(hYear, hMonth);
        var exemptStored = localStorage.getItem(exemptKey);
        if (exemptStored) {
            var exemptData = JSON.parse(exemptStored);
            var changed = false;
            ghostDays.forEach(function(d) {
                if (exemptData[d]) { delete exemptData[d]; changed = true; }
            });
            if (changed) localStorage.setItem(exemptKey, JSON.stringify(exemptData));
        }
    }

    // Clean ALL ghost days across all months for the current profile
    function cleanAllGhostDays() {
        if (!window.activeProfile) return;
        var cleaned = 0;
        for (var hMonth = 1; hMonth <= 12; hMonth++) {
            var actualDays = getHijriDaysInMonth(currentHijriYear, hMonth);
            if (actualDays <= 29) {
                // 29-day month: remove day 30 and 31
                cleanGhostDaysForMonth(currentHijriYear, hMonth, 29);
                cleaned++;
            } else {
                // 30-day month: remove day 31
                cleanGhostDaysForMonth(currentHijriYear, hMonth, 30);
            }
        }
        return cleaned;
    }

    function updateMonthDaysButton() {
        var btn = document.getElementById('monthDaysToggleBtn');
        if (!btn) return;
        var days = getHijriDaysInMonth(currentHijriYear, currentHijriMonth);
        btn.textContent = days;
        btn.style.background = localStorage.getItem('salah_hijri_days_' + currentHijriYear + '_' + currentHijriMonth)
            ? 'rgba(201,162,39,0.25)' : 'var(--primary-light)';
    }

    // ==================== HIJRI OVERRIDE DIALOG ====================
    function showHijriOverrideDialog() {
        var hYear = currentHijriYear;
        var hMonth = currentHijriMonth;
        var key = hYear + '_' + hMonth;
        var overrides = getHijriOverrides();
        var currentOverride = overrides[key] || '';
        var currentDay1 = hijriToGregorianDay1(hYear, hMonth);
        var isoStr = currentDay1.getFullYear() + '-' + String(currentDay1.getMonth()+1).padStart(2,'0') + '-' + String(currentDay1.getDate()).padStart(2,'0');

        var currentLang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';

        // Build overlay
        var overlay = document.createElement('div');
        overlay.id = 'hijriOverrideOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';

        var monthLabel = getHijriMonthName(hMonth - 1) + ' ' + hYear;

        overlay.innerHTML = '\
            <div style="background:var(--card-bg);border-radius:20px;padding:24px;max-width:360px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);font-family:\'Noto Kufi Arabic\',sans-serif;direction:rtl;">\
                <h3 style="margin:0 0 12px;color:var(--primary);font-size:1.1em;"><span class="material-symbols-rounded" style="font-size:18px;vertical-align:middle;">settings</span> تعديل بداية الشهر الهجري</h3>\
                <p style="color:var(--text-muted);font-size:0.85em;margin:0 0 16px;">\
                    ' + (currentLang === 'ar' ? 'حدد التاريخ الميلادي لأول يوم من' : 'Set the Gregorian date for the 1st of') + ' <strong>' + monthLabel + '</strong>\
                </p>\
                <div style="margin-bottom:16px;">\
                    <label style="display:block;margin-bottom:6px;font-size:0.85em;color:var(--text-secondary);">' + (currentLang === 'ar' ? 'أول يوم ميلادي:' : 'First Gregorian day:') + '</label>\
                    <input type="date" id="hijriOverrideDateInput" value="' + isoStr + '" style="width:100%;padding:10px;border:1px solid var(--border, rgba(0,0,0,0.1));border-radius:10px;font-size:16px;font-family:\'Cairo\',sans-serif;box-sizing:border-box;">\
                </div>\
                ' + (currentOverride ? '<p style="font-size:0.75em;color:var(--primary);"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">edit</span> ' + (currentLang === 'ar' ? 'تم تعديل هذا الشهر مسبقاً' : 'This month has a manual override') + '</p>' : '') + '\
                <div style="display:flex;gap:8px;margin-top:8px;">\
                    <button type="button" id="hijriOverrideSaveBtn" style="flex:1;padding:10px;background:var(--primary);color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:\'Cairo\',sans-serif;">' + (currentLang === 'ar' ? 'حفظ' : 'Save') + '</button>\
                    ' + (currentOverride ? '<button type="button" id="hijriOverrideResetBtn" style="padding:10px 16px;background:#fee2e2;color:#dc2626;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:\'Cairo\',sans-serif;">' + (currentLang === 'ar' ? 'إعادة تعيين' : 'Reset') + '</button>' : '') + '\
                    <button type="button" id="hijriOverrideCancelBtn" style="padding:10px 16px;background:#f3f4f6;color:var(--text-secondary);border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:\'Cairo\',sans-serif;">' + (currentLang === 'ar' ? 'إلغاء' : 'Cancel') + '</button>\
                </div>\
            </div>\
        ';

        document.body.appendChild(overlay);

        document.getElementById('hijriOverrideSaveBtn').onclick = function() {
            var dateVal = document.getElementById('hijriOverrideDateInput').value;
            if (!dateVal) return;
            overrides[key] = dateVal;
            saveHijriOverrides(overrides);
            _hijriDay1Cache = {}; // Clear cache
            document.body.removeChild(overlay);
            var currentSection = window.App.Storage ? window.App.Storage.getCurrentSection() : 'fard';
            window.updateTrackerView(currentSection === 'sunnah' ? 'sunnah' : 'fard');
            window.App.UI.showToast(currentLang === 'ar' ? 'تم تعديل بداية الشهر الهجري \u2713' : 'Hijri month start updated \u2713', 'success');
        };

        var resetBtn = document.getElementById('hijriOverrideResetBtn');
        if (resetBtn) {
            resetBtn.onclick = function() {
                delete overrides[key];
                saveHijriOverrides(overrides);
                _hijriDay1Cache = {};
                document.body.removeChild(overlay);
                var currentSection = window.App.Storage ? window.App.Storage.getCurrentSection() : 'fard';
                window.updateTrackerView(currentSection === 'sunnah' ? 'sunnah' : 'fard');
                window.App.UI.showToast(currentLang === 'ar' ? 'تم إعادة التعيين \u2713' : 'Reset to default \u2713', 'info');
            };
        }

        document.getElementById('hijriOverrideCancelBtn').onclick = function() {
            document.body.removeChild(overlay);
        };

        overlay.onclick = function(e) {
            if (e.target === overlay) document.body.removeChild(overlay);
        };
    }

    return {
        gregorianToHijri: gregorianToHijri,
        getTodayHijri: getTodayHijri,
        getHijriOverrides: getHijriOverrides,
        saveHijriOverrides: saveHijriOverrides,
        getHijriDaysInMonth: getHijriDaysInMonth,
        hijriToGregorianDay1: hijriToGregorianDay1,
        hijriToGregorian: hijriToGregorian,
        isFutureDateHijri: isFutureDateHijri,
        getGregorianSpanForHijriMonth: getGregorianSpanForHijriMonth,
        getGregorianDayForHijri: getGregorianDayForHijri,
        formatHijriMonthHeader: formatHijriMonthHeader,
        getHijriMonthName: getHijriMonthName,
        createDualDayNum: createDualDayNum,
        toggleMonthDays: toggleMonthDays,
        cleanGhostDaysForMonth: cleanGhostDaysForMonth,
        cleanAllGhostDays: cleanAllGhostDays,
        updateMonthDaysButton: updateMonthDaysButton,
        showHijriOverrideDialog: showHijriOverrideDialog,
        clearCache: function() { _hijriDay1Cache = {}; },
        getCurrentHijriYear: function() { return currentHijriYear; },
        setCurrentHijriYear: function(y) { currentHijriYear = y; },
        getCurrentHijriMonth: function() { return currentHijriMonth; },
        setCurrentHijriMonth: function(m) { currentHijriMonth = m; }
    };
})();

// Backward compat
window.toggleMonthDays = window.App.Hijri.toggleMonthDays;
window.showHijriOverrideDialog = window.App.Hijri.showHijriOverrideDialog;
