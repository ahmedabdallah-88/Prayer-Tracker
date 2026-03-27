/**
 * qada-calculator.js — Qada Prayer Calculator & Plan Wizard
 * Prayer Tracker PWA — Phase 1
 *
 * 3-step wizard: Data Entry → Plan → Confirmation
 * Calculates missed prayers using Hijri calendar, creates daily makeup plan.
 *
 * Depends on:
 *   window.App.Hijri     — gregorianToHijri
 *   window.App.I18n      — t, getCurrentLang
 *   window.App.UI        — showToast, showConfirm
 *   window.App.Profiles  — getActiveProfile, getActiveProfileId
 *   window.App.Config    — fardPrayers
 */
window.App = window.App || {};
window.App.QadaCalc = (function() {
    'use strict';

    // ---- helpers ----
    function t(key) { return window.App.I18n ? window.App.I18n.t(key) : key; }
    function lang() { return window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar'; }
    function showToast(m, tp) { if (window.App.UI && window.App.UI.showToast) window.App.UI.showToast(m, tp); }

    var PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    var PRAYER_KEYS = {
        fajr: 'prayer_fajr', dhuhr: 'prayer_dhuhr', asr: 'prayer_asr',
        maghrib: 'prayer_maghrib', isha: 'prayer_isha'
    };

    // ---- state ----
    var currentStep = 1;
    var wizardData = {};
    var additionalPeriods = [];
    var isEditing = false;

    // ==================== STORAGE ====================

    function getStorageKey() {
        var pid = window.App.Profiles.getActiveProfileId();
        return pid ? 'salah_qada_plan_' + pid : null;
    }

    function loadPlan() {
        var key = getStorageKey();
        if (!key) return null;
        try { return JSON.parse(localStorage.getItem(key)); }
        catch(e) { return null; }
    }

    function savePlan(plan) {
        var key = getStorageKey();
        if (!key) return;
        localStorage.setItem(key, JSON.stringify(plan));
    }

    function deletePlanData() {
        var key = getStorageKey();
        if (key) localStorage.removeItem(key);
    }

    // ==================== HIJRI HELPERS ====================

    function gToH(dateStr) {
        var parts = dateStr.split('-');
        var gDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return window.App.Hijri.gregorianToHijri(gDate);
    }

    function hijriToAbsDays(h) {
        return (h.year * 12 + (h.month - 1)) * 29.5 + h.day;
    }

    function hijriDaysDiff(h1, h2) {
        // Approximate difference in days between two Hijri dates
        // More accurate: convert both to Gregorian, diff in real days, then that IS the Hijri day count
        var parts1 = [h1.year, h1.month, h1.day];
        var parts2 = [h2.year, h2.month, h2.day];
        var g1 = window.App.Hijri.hijriToGregorian(parts1[0], parts1[1], parts1[2]);
        var g2 = window.App.Hijri.hijriToGregorian(parts2[0], parts2[1], parts2[2]);
        return Math.round((g2 - g1) / (1000 * 60 * 60 * 24));
    }

    function formatHijriDate(h) {
        var monthName = window.App.I18n.getHijriMonthName(h.month - 1);
        return h.day + ' ' + monthName + ' ' + h.year;
    }

    function formatDualDate(h) {
        var hijriText = formatHijriDate(h) + ' \u0647\u0640';
        var gDate = window.App.Hijri.hijriToGregorian(h.year, h.month, h.day);
        var isAr = lang() === 'ar';
        var gMonths = isAr ? window.App.Config.gregorianMonthNamesAr : window.App.Config.gregorianMonthNamesEn;
        var gregText = gMonths[gDate.getMonth()] + ' ' + gDate.getFullYear() + ' \u0645';
        return hijriText + ' \u2014 ' + gregText;
    }

    function addHijriDays(startHijri, days) {
        var gStart = window.App.Hijri.hijriToGregorian(startHijri.year, startHijri.month, startHijri.day);
        var gEnd = new Date(gStart.getTime() + days * 86400000);
        return window.App.Hijri.gregorianToHijri(gEnd);
    }

    // ==================== CALCULATIONS ====================

    function calculateBase() {
        var pubDate = document.getElementById('qadaPubertyDate').value;
        var regDate = document.getElementById('qadaRegularDate').value;
        if (!pubDate || !regDate) return null;

        var hPub = gToH(pubDate);
        var hReg = gToH(regDate);
        var totalDays = hijriDaysDiff(hPub, hReg);
        if (totalDays <= 0) return null;

        var result = {
            pubertyDateGregorian: pubDate,
            regularDateGregorian: regDate,
            pubertyDateHijri: hPub.year + '-' + String(hPub.month).padStart(2, '0') + '-' + String(hPub.day).padStart(2, '0'),
            regularDateHijri: hReg.year + '-' + String(hReg.month).padStart(2, '0') + '-' + String(hReg.day).padStart(2, '0'),
            totalHijriDays: totalDays,
            menstrualDaysPerCycle: 0,
            menstrualTotalDays: 0,
            basePrayers: totalDays
        };

        // Female menstrual deduction
        var profile = window.App.Profiles.getActiveProfile();
        if (profile && profile.gender === 'female') {
            var avgInput = document.getElementById('qadaMenstrualDays');
            var avg = avgInput ? parseInt(avgInput.value) || 7 : 0;
            if (avg > 0) {
                var hijriMonths = totalDays / 29.5;
                var menstrualDays = Math.round(hijriMonths * avg);
                result.menstrualDaysPerCycle = avg;
                result.menstrualTotalDays = menstrualDays;
                result.basePrayers = totalDays - menstrualDays;
            }
        }

        return result;
    }

    function calculateTotals(base) {
        if (!base) return null;

        var byPrayer = {};
        PRAYER_IDS.forEach(function(id) { byPrayer[id] = base.basePrayers; });

        // Add additional periods
        additionalPeriods.forEach(function(p) {
            if (p.type === 'A') {
                byPrayer[p.prayerId] = (byPrayer[p.prayerId] || 0) + p.count;
            } else if (p.type === 'B') {
                PRAYER_IDS.forEach(function(id) {
                    byPrayer[id] = (byPrayer[id] || 0) + p.count;
                });
            } else if (p.type === 'C') {
                if (p.prayerId && p.prayerId !== 'all') {
                    byPrayer[p.prayerId] = (byPrayer[p.prayerId] || 0) + p.count;
                } else {
                    var each = Math.ceil(p.count / 5);
                    PRAYER_IDS.forEach(function(id) {
                        byPrayer[id] = (byPrayer[id] || 0) + each;
                    });
                }
            }
        });

        // Ensure no negatives
        PRAYER_IDS.forEach(function(id) {
            if (byPrayer[id] < 0) byPrayer[id] = 0;
        });

        var totalAll = 0;
        PRAYER_IDS.forEach(function(id) { totalAll += byPrayer[id]; });

        return { totalByPrayer: byPrayer, totalAll: totalAll };
    }

    function calculateCompletion(totalAll, dailyTarget) {
        if (!dailyTarget || dailyTarget <= 0) return null;
        var totalDaysNeeded = Math.ceil(totalAll / dailyTarget);
        var hijriMonthsNeeded = totalDaysNeeded / 29.5;
        var years = Math.floor(hijriMonthsNeeded / 12);
        var months = Math.round(hijriMonthsNeeded % 12);
        var todayH = window.App.Hijri.getTodayHijri();
        var endH = addHijriDays(todayH, totalDaysNeeded);
        return {
            totalDays: totalDaysNeeded,
            years: years,
            months: months,
            endHijri: endH
        };
    }

    // ==================== RENDER WIZARD ====================

    function open() {
        var plan = loadPlan();
        isEditing = !!plan;
        currentStep = 1;
        additionalPeriods = [];
        wizardData = {};

        if (plan) {
            wizardData = JSON.parse(JSON.stringify(plan));
            additionalPeriods = plan.additionalPeriods ? JSON.parse(JSON.stringify(plan.additionalPeriods)) : [];
        }

        renderOverlay();
    }

    function close() {
        var overlay = document.getElementById('qadaCalcOverlay');
        if (overlay) overlay.remove();
    }

    function renderOverlay() {
        var existing = document.getElementById('qadaCalcOverlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'qadaCalcOverlay';
        overlay.className = 'profile-settings-overlay show';
        overlay.style.cssText = 'z-index:10002;';

        var html = '<div style="max-width:480px;width:100%;margin:0 auto;">';
        html += renderHeader();

        if (currentStep === 1) html += renderStep1();
        else if (currentStep === 2) html += renderStep2();
        else if (currentStep === 3) html += renderStep3();

        html += '</div>';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        // Restore values if editing
        if (currentStep === 1) restoreStep1Values();

        // Bind events
        bindStepEvents();
    }

    function renderHeader() {
        var stepTitle = t('qada_step' + currentStep + '_title');
        return '<div class="ps-header">' +
            '<span style="font-size:1.1em;font-weight:700;color:var(--text-primary);">' +
                '<span style="font-size:0.75em;color:var(--text-muted);font-weight:500;">' +
                    t('qada_step') + ' ' + currentStep + ' ' + t('qada_of') + ' 3' +
                '</span><br>' + stepTitle +
            '</span>' +
            '<button class="ps-close-btn" id="qadaCloseBtn">' +
                '<span class="material-symbols-rounded" style="font-size:20px;">close</span>' +
            '</button>' +
        '</div>' +
        '<div style="display:flex;gap:4px;padding:0 16px 12px;">' +
            '<div style="flex:1;height:3px;border-radius:2px;background:' + (currentStep >= 1 ? 'var(--primary)' : 'var(--border,rgba(0,0,0,0.1))') + ';"></div>' +
            '<div style="flex:1;height:3px;border-radius:2px;background:' + (currentStep >= 2 ? 'var(--primary)' : 'var(--border,rgba(0,0,0,0.1))') + ';"></div>' +
            '<div style="flex:1;height:3px;border-radius:2px;background:' + (currentStep >= 3 ? 'var(--primary)' : 'var(--border,rgba(0,0,0,0.1))') + ';"></div>' +
        '</div>';
    }

    // ==================== STEP 1 ====================

    function renderStep1() {
        var profile = window.App.Profiles.getActiveProfile();
        var isFemale = profile && profile.gender === 'female';

        var html = '<div style="padding:0 16px 16px;">';

        // Puberty date
        html += '<div class="ps-section" style="margin-bottom:12px;">' +
            '<label style="display:block;font-size:0.85em;font-weight:600;color:var(--text-secondary);margin-bottom:6px;padding:0 4px;">' +
                t('qada_puberty_date') +
            '</label>' +
            '<input type="date" id="qadaPubertyDate" class="qada-date-input" style="width:100%;padding:12px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:12px;font-size:16px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);box-sizing:border-box;">' +
        '</div>';

        // Regular date
        html += '<div class="ps-section" style="margin-bottom:12px;">' +
            '<label style="display:block;font-size:0.85em;font-weight:600;color:var(--text-secondary);margin-bottom:6px;padding:0 4px;">' +
                t('qada_regular_date') +
            '</label>' +
            '<input type="date" id="qadaRegularDate" class="qada-date-input" style="width:100%;padding:12px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:12px;font-size:16px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);box-sizing:border-box;">' +
        '</div>';

        // Hijri conversion preview
        html += '<div id="qadaHijriPreview" style="padding:8px 12px;font-size:0.8em;color:var(--text-primary);background:rgba(var(--accent-rgb,45,106,79),0.1);border-radius:10px;margin-bottom:12px;display:none;"></div>';

        // Female: menstrual days
        if (isFemale) {
            html += '<div class="ps-section" style="margin-bottom:12px;">' +
                '<label style="display:block;font-size:0.85em;font-weight:600;color:var(--text-secondary);margin-bottom:6px;padding:0 4px;">' +
                    t('qada_menstrual_avg') +
                '</label>' +
                '<input type="number" id="qadaMenstrualDays" min="3" max="15" value="7" style="width:100%;padding:12px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:12px;font-size:16px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);box-sizing:border-box;">' +
            '</div>';
        }

        // Additional periods question
        html += '<div class="ps-section" style="margin-bottom:12px;">' +
            '<div style="font-size:0.85em;font-weight:600;color:var(--text-secondary);margin-bottom:8px;padding:0 4px;">' +
                t('qada_additional_q') +
            '</div>' +
            '<div style="display:flex;gap:8px;">' +
                '<button class="qada-pill-btn" id="qadaAddYes" data-val="yes">' + t('qada_yes') + '</button>' +
                '<button class="qada-pill-btn" id="qadaAddNo" data-val="no">' + t('qada_no') + '</button>' +
            '</div>' +
        '</div>';

        // Additional periods container (hidden initially)
        html += '<div id="qadaPeriodsContainer" style="display:none;">';
        html += '<div id="qadaPeriodsList"></div>';
        html += '<button id="qadaAddPeriodBtn" style="width:100%;padding:10px;border:2px dashed var(--primary);border-radius:12px;background:transparent;color:var(--primary);font-weight:600;font-family:inherit;font-size:0.9em;cursor:pointer;margin-bottom:12px;">' +
            '<span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">add</span> ' + t('qada_add_period') +
        '</button>';
        html += '</div>';

        // Running total
        html += '<div id="qadaRunningTotal" style="padding:14px 16px;background:rgba(var(--accent-rgb,45,106,79),0.1);border-radius:14px;margin-bottom:16px;display:none;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<span style="font-weight:700;color:var(--primary);font-size:0.95em;">' + t('qada_running_total') + '</span>' +
                '<span id="qadaTotalNum" style="font-weight:800;color:var(--primary);font-size:1.2em;">0</span>' +
            '</div>' +
            '<div style="font-size:0.75em;color:var(--text-muted);margin-top:2px;">' + t('qada_period_prayers') + '</div>' +
        '</div>';

        // Next button
        html += '<button id="qadaNextBtn1" class="qada-primary-btn">' + t('qada_next') + '</button>';

        html += '</div>';
        return html;
    }

    function restoreStep1Values() {
        if (!wizardData.pubertyDateGregorian) return;
        var pub = document.getElementById('qadaPubertyDate');
        var reg = document.getElementById('qadaRegularDate');
        if (pub) pub.value = wizardData.pubertyDateGregorian;
        if (reg) reg.value = wizardData.regularDateGregorian;

        var mens = document.getElementById('qadaMenstrualDays');
        if (mens && wizardData.menstrualDaysPerCycle) mens.value = wizardData.menstrualDaysPerCycle;

        if (additionalPeriods.length > 0) {
            var yesBtn = document.getElementById('qadaAddYes');
            if (yesBtn) yesBtn.classList.add('active');
            var container = document.getElementById('qadaPeriodsContainer');
            if (container) container.style.display = '';
            renderPeriodsList();
        }

        updateHijriPreview();
        updateRunningTotal();
    }

    // ==================== STEP 2 ====================

    function renderStep2() {
        // wizardData was populated by Step 1 Next handler (before DOM was destroyed)
        if (!wizardData.totalByPrayer || !wizardData.totalAll) {
            return '<div style="padding:16px;text-align:center;color:var(--text-muted);">Error</div>';
        }
        var totals = { totalByPrayer: wizardData.totalByPrayer, totalAll: wizardData.totalAll };

        var html = '<div style="padding:0 16px 16px;">';

        // Breakdown card
        html += '<div class="ps-section" style="margin-bottom:16px;">' +
            '<div style="font-size:0.85em;font-weight:700;color:var(--text-secondary);margin-bottom:10px;padding:0 4px;">' +
                t('qada_breakdown') +
            '</div>';

        PRAYER_IDS.forEach(function(id) {
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border,rgba(0,0,0,0.06));">' +
                '<span style="font-weight:600;color:var(--text-primary);font-size:0.9em;">' + t(PRAYER_KEYS[id]) + '</span>' +
                '<span style="font-weight:700;color:var(--primary);font-size:1em;">' + totals.totalByPrayer[id] + ' <small style="font-weight:400;color:var(--text-muted);">' + t('qada_period_prayers') + '</small></span>' +
            '</div>';
        });

        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(var(--accent-rgb,45,106,79),0.1);border-radius:0 0 14px 14px;">' +
            '<span style="font-weight:800;color:var(--primary);">' + t('qada_total') + '</span>' +
            '<span style="font-weight:800;color:var(--primary);font-size:1.15em;">' + totals.totalAll + '</span>' +
        '</div>';
        html += '</div>';

        // Daily target
        html += '<div class="ps-section" style="margin-bottom:16px;">' +
            '<div style="font-size:0.85em;font-weight:700;color:var(--text-secondary);margin-bottom:10px;padding:0 4px;">' +
                t('qada_daily_target') +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 4px;">' +
                '<button class="qada-pill-btn qada-target-pill" data-target="5">' + t('qada_1_per') + '</button>' +
                '<button class="qada-pill-btn qada-target-pill" data-target="10">' + t('qada_2_per') + '</button>' +
                '<button class="qada-pill-btn qada-target-pill" data-target="15">' + t('qada_3_per') + '</button>' +
                '<button class="qada-pill-btn qada-target-pill" data-target="custom">' + t('qada_custom') + '</button>' +
            '</div>' +
            '<div id="qadaCustomTargetWrap" style="display:none;margin-top:8px;padding:0 4px;">' +
                '<input type="number" id="qadaCustomTarget" min="1" max="100" placeholder="..." style="width:100%;padding:10px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:10px;font-size:16px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);box-sizing:border-box;">' +
            '</div>' +
        '</div>';

        // Completion estimate
        html += '<div id="qadaCompletionCard" style="display:none;padding:14px 16px;background:rgba(var(--accent-rgb,45,106,79),0.1);border-radius:14px;margin-bottom:16px;">';
        html += '<div id="qadaCompletionContent"></div>';
        html += '</div>';

        // Navigation
        html += '<div style="display:flex;gap:8px;">' +
            '<button id="qadaBackBtn2" class="qada-secondary-btn" style="flex:0.4;">' + t('qada_back') + '</button>' +
            '<button id="qadaNextBtn2" class="qada-primary-btn" style="flex:0.6;opacity:0.5;pointer-events:none;">' + t('qada_next') + '</button>' +
        '</div>';

        html += '</div>';

        // Pre-select target if editing
        if (wizardData.dailyTarget) {
            setTimeout(function() {
                var target = wizardData.dailyTarget;
                var pill = document.querySelector('.qada-target-pill[data-target="' + target + '"]');
                if (pill) {
                    pill.click();
                } else {
                    var customPill = document.querySelector('.qada-target-pill[data-target="custom"]');
                    if (customPill) customPill.click();
                    setTimeout(function() {
                        var input = document.getElementById('qadaCustomTarget');
                        if (input) { input.value = target; input.dispatchEvent(new Event('input')); }
                    }, 50);
                }
            }, 50);
        }

        return html;
    }

    function updateCompletionEstimate(dailyTarget) {
        var card = document.getElementById('qadaCompletionCard');
        var content = document.getElementById('qadaCompletionContent');
        var nextBtn = document.getElementById('qadaNextBtn2');
        if (!card || !content) return;

        if (!dailyTarget || dailyTarget <= 0) {
            card.style.display = 'none';
            if (nextBtn) { nextBtn.style.opacity = '0.5'; nextBtn.style.pointerEvents = 'none'; }
            return;
        }

        wizardData.dailyTarget = dailyTarget;
        var est = calculateCompletion(wizardData.totalAll, dailyTarget);
        if (!est) return;

        wizardData.expectedCompletionHijri = est.endHijri.year + '-' + String(est.endHijri.month).padStart(2, '0');

        var durationText = '';
        if (est.years > 0) durationText += est.years + ' ' + t('qada_years');
        if (est.years > 0 && est.months > 0) durationText += ' ' + t('qada_and') + ' ';
        if (est.months > 0) durationText += est.months + ' ' + t('qada_months');
        if (!durationText) durationText = '< 1 ' + t('qada_months');

        var endText = formatDualDate(est.endHijri);

        content.innerHTML =
            '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
                '<span style="font-size:0.85em;color:var(--text-secondary);">' + t('qada_expected_duration') + '</span>' +
                '<span style="font-weight:700;color:var(--primary);">' + durationText + '</span>' +
            '</div>' +
            '<div style="margin-bottom:8px;">' +
                '<div style="font-size:0.85em;color:var(--text-secondary);margin-bottom:2px;">' + t('qada_expected_end') + '</div>' +
                '<div style="font-weight:700;color:var(--primary);font-size:0.95em;">' + endText + '</div>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;">' +
                '<span style="font-size:0.85em;color:var(--text-secondary);">' + t('qada_daily_count') + '</span>' +
                '<span style="font-weight:700;color:var(--primary);">' + dailyTarget + '</span>' +
            '</div>';

        card.style.display = '';
        if (nextBtn) { nextBtn.style.opacity = '1'; nextBtn.style.pointerEvents = ''; }
    }

    // ==================== STEP 3 ====================

    function renderStep3() {
        var html = '<div style="padding:0 16px 16px;">';

        // Summary card
        html += '<div class="ps-section" style="margin-bottom:16px;">' +
            '<div style="font-size:0.85em;font-weight:700;color:var(--text-secondary);margin-bottom:10px;padding:0 4px;">' +
                t('qada_summary') +
            '</div>';

        // Base period
        var hPub = wizardData.pubertyDateHijri || '';
        var hReg = wizardData.regularDateHijri || '';
        html += '<div style="padding:10px 12px;border-bottom:1px solid var(--border,rgba(0,0,0,0.06));font-size:0.85em;">' +
            '<div style="color:var(--text-muted);margin-bottom:4px;">' + t('qada_base_period') + '</div>' +
            '<div style="color:var(--text-primary);font-weight:600;">' + wizardData.totalHijriDays + ' ' + t('qada_period_days') +
            ' (' + wizardData.pubertyDateGregorian + ' → ' + wizardData.regularDateGregorian + ')</div>' +
        '</div>';

        // Menstrual deduction (female)
        if (wizardData.menstrualTotalDays > 0) {
            html += '<div style="padding:10px 12px;border-bottom:1px solid var(--border,rgba(0,0,0,0.06));font-size:0.85em;">' +
                '<div style="color:var(--text-muted);margin-bottom:4px;">' + t('qada_menstrual_deduction') + '</div>' +
                '<div style="color:#dc2626;font-weight:600;">-' + wizardData.menstrualTotalDays + ' ' + t('qada_period_days') +
                ' (' + wizardData.menstrualDaysPerCycle + ' ' + t('qada_period_days') + '/' + t('qada_months') + ')</div>' +
            '</div>';
        }

        // Additional periods
        if (additionalPeriods.length > 0) {
            html += '<div style="padding:10px 12px;border-bottom:1px solid var(--border,rgba(0,0,0,0.06));font-size:0.85em;">' +
                '<div style="color:var(--text-muted);margin-bottom:4px;">' + t('qada_additional_periods') + ' (' + additionalPeriods.length + ')</div>';
            additionalPeriods.forEach(function(p, i) {
                var label = '';
                if (p.type === 'A') label = t(PRAYER_KEYS[p.prayerId]) + ': +' + p.count;
                else if (p.type === 'B') label = t('qada_all_prayers') + ': +' + (p.count * 5);
                else if (p.type === 'C') label = t('qada_type_estimate') + ': +' + p.count;
                html += '<div style="color:var(--text-primary);font-weight:500;margin-top:2px;">' + label + ' ' + t('qada_period_prayers') + '</div>';
            });
            html += '</div>';
        }

        html += '</div>';

        // Prayer breakdown
        html += '<div class="ps-section" style="margin-bottom:16px;">' +
            '<div style="font-size:0.85em;font-weight:700;color:var(--text-secondary);margin-bottom:10px;padding:0 4px;">' +
                t('qada_breakdown') +
            '</div>';

        PRAYER_IDS.forEach(function(id) {
            var existing = isEditing && wizardData.completedByPrayer ? (wizardData.completedByPrayer[id] || 0) : 0;
            var total = wizardData.totalByPrayer[id];
            var remaining = total - existing;
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border,rgba(0,0,0,0.06));">' +
                '<span style="font-weight:600;color:var(--text-primary);font-size:0.9em;">' + t(PRAYER_KEYS[id]) + '</span>' +
                '<span style="font-weight:700;color:var(--primary);">' + total + '</span>' +
            '</div>';
        });

        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(var(--accent-rgb,45,106,79),0.1);border-radius:0 0 14px 14px;">' +
            '<span style="font-weight:800;color:var(--primary);">' + t('qada_total') + '</span>' +
            '<span style="font-weight:800;color:var(--primary);font-size:1.15em;">' + wizardData.totalAll + '</span>' +
        '</div>';
        html += '</div>';

        // Daily target info
        html += '<div style="padding:14px 16px;background:rgba(var(--accent-rgb,45,106,79),0.1);border-radius:14px;margin-bottom:16px;font-size:0.9em;">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
                '<span style="color:var(--text-secondary);">' + t('qada_daily_count') + '</span>' +
                '<span style="font-weight:700;color:var(--primary);">' + wizardData.dailyTarget + '</span>' +
            '</div>';

        var est = calculateCompletion(wizardData.totalAll, wizardData.dailyTarget);
        if (est) {
            var durationText = '';
            if (est.years > 0) durationText += est.years + ' ' + t('qada_years');
            if (est.years > 0 && est.months > 0) durationText += ' ' + t('qada_and') + ' ';
            if (est.months > 0) durationText += est.months + ' ' + t('qada_months');
            if (!durationText) durationText = '< 1 ' + t('qada_months');
            html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
                '<span style="color:var(--text-secondary);">' + t('qada_expected_duration') + '</span>' +
                '<span style="font-weight:700;color:var(--primary);">' + durationText + '</span>' +
            '</div>';
            var endText3 = formatDualDate(est.endHijri);
            html += '<div style="margin-top:4px;">' +
                '<div style="color:var(--text-secondary);margin-bottom:2px;">' + t('qada_expected_end') + '</div>' +
                '<div style="font-weight:700;color:var(--primary);">' + endText3 + '</div>' +
            '</div>';
        }
        html += '</div>';

        // Action buttons
        html += '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
            '<button id="qadaBackBtn3" class="qada-secondary-btn" style="flex:0.4;">' + t('qada_back') + '</button>' +
            '<button id="qadaSaveBtn" class="qada-primary-btn" style="flex:0.6;">' +
                (isEditing ? t('qada_save_changes') : t('qada_start_plan')) +
            '</button>' +
        '</div>';

        // Delete button (edit mode only)
        if (isEditing) {
            html += '<button id="qadaDeleteBtn" style="width:100%;padding:12px;border:none;border-radius:12px;background:rgba(220,38,38,0.08);color:#dc2626;font-weight:700;font-family:inherit;font-size:0.9em;cursor:pointer;">' +
                t('qada_delete_plan') +
            '</button>';
        }

        html += '</div>';
        return html;
    }

    // ==================== ADDITIONAL PERIODS ====================

    function renderPeriodsList() {
        var list = document.getElementById('qadaPeriodsList');
        if (!list) return;
        list.innerHTML = '';

        additionalPeriods.forEach(function(p, idx) {
            var card = document.createElement('div');
            card.style.cssText = 'background:var(--card-bg);border:1px solid var(--border,rgba(0,0,0,0.08));border-radius:12px;padding:12px;margin-bottom:8px;position:relative;';

            var typeLabel = p.type === 'A' ? t('qada_type_specific') : (p.type === 'B' ? t('qada_type_all') : t('qada_type_estimate'));
            var detailHtml = '';

            if (p.type === 'A') {
                detailHtml = '<span style="font-weight:600;">' + t(PRAYER_KEYS[p.prayerId]) + '</span> — ' + p.count + ' ' + t('qada_period_days');
            } else if (p.type === 'B') {
                detailHtml = p.count + ' ' + t('qada_period_days') + ' × 5 = ' + (p.count * 5) + ' ' + t('qada_period_prayers');
            } else if (p.type === 'C') {
                var target = p.prayerId && p.prayerId !== 'all' ? t(PRAYER_KEYS[p.prayerId]) : t('qada_all_prayers');
                detailHtml = p.count + ' ' + t('qada_period_prayers') + ' — ' + target;
            }

            card.innerHTML =
                '<div style="display:flex;justify-content:space-between;align-items:start;">' +
                    '<div>' +
                        '<div style="font-size:0.75em;color:var(--text-muted);margin-bottom:2px;">' + typeLabel + '</div>' +
                        '<div style="font-size:0.85em;color:var(--text-primary);">' + detailHtml + '</div>' +
                    '</div>' +
                    '<button class="qada-del-period" data-idx="' + idx + '" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:4px;">' +
                        '<span class="material-symbols-rounded" style="font-size:18px;">delete</span>' +
                    '</button>' +
                '</div>';

            list.appendChild(card);
        });

        // Bind delete buttons
        list.querySelectorAll('.qada-del-period').forEach(function(btn) {
            btn.onclick = function() {
                var idx = parseInt(btn.dataset.idx);
                additionalPeriods.splice(idx, 1);
                renderPeriodsList();
                updateRunningTotal();
            };
        });
    }

    function showAddPeriodDialog() {
        var dialog = document.createElement('div');
        dialog.id = 'qadaPeriodDialog';
        dialog.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10003;display:flex;align-items:center;justify-content:center;padding:20px;';

        var prayerOpts = '';
        PRAYER_IDS.forEach(function(id) {
            prayerOpts += '<option value="' + id + '">' + t(PRAYER_KEYS[id]) + '</option>';
        });

        dialog.innerHTML =
            '<div style="background:var(--card-bg);border-radius:20px;padding:20px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;font-family:inherit;">' +
                '<div style="font-weight:700;font-size:1em;color:var(--text-primary);margin-bottom:12px;">' + t('qada_add_period') + '</div>' +

                // Type selection
                '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">' +
                    '<button class="qada-pill-btn qada-period-type active" data-type="A" style="text-align:start;padding:10px 12px;">' + t('qada_type_specific') + '</button>' +
                    '<button class="qada-pill-btn qada-period-type" data-type="B" style="text-align:start;padding:10px 12px;">' + t('qada_type_all') + '</button>' +
                    '<button class="qada-pill-btn qada-period-type" data-type="C" style="text-align:start;padding:10px 12px;">' + t('qada_type_estimate') + '</button>' +
                '</div>' +

                // Type A/B fields: dates
                '<div id="qadaPeriodDates">' +
                    '<div id="qadaPeriodPrayerSelect" style="margin-bottom:8px;">' +
                        '<label style="font-size:0.8em;color:var(--text-muted);display:block;margin-bottom:4px;">' + t('qada_select_prayer') + '</label>' +
                        '<select id="qadaPeriodPrayer" style="width:100%;padding:10px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:10px;font-size:14px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);">' +
                            prayerOpts +
                        '</select>' +
                    '</div>' +
                    '<label style="font-size:0.8em;color:var(--text-muted);display:block;margin-bottom:4px;">' + t('qada_from_date') + '</label>' +
                    '<input type="date" id="qadaPeriodFrom" style="width:100%;padding:10px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:10px;font-size:14px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);box-sizing:border-box;margin-bottom:8px;">' +
                    '<label style="font-size:0.8em;color:var(--text-muted);display:block;margin-bottom:4px;">' + t('qada_to_date') + '</label>' +
                    '<input type="date" id="qadaPeriodTo" style="width:100%;padding:10px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:10px;font-size:14px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);box-sizing:border-box;margin-bottom:8px;">' +
                    '<div id="qadaPeriodDaysPreview" style="font-size:0.8em;color:var(--text-muted);margin-bottom:8px;"></div>' +
                '</div>' +

                // Type C fields: estimate
                '<div id="qadaPeriodEstimate" style="display:none;">' +
                    '<label style="font-size:0.8em;color:var(--text-muted);display:block;margin-bottom:4px;">' + t('qada_estimated_num') + '</label>' +
                    '<input type="number" id="qadaPeriodCount" min="1" style="width:100%;padding:10px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:10px;font-size:14px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);box-sizing:border-box;margin-bottom:8px;">' +
                    '<label style="font-size:0.8em;color:var(--text-muted);display:block;margin-bottom:4px;">' + t('qada_select_prayer') + '</label>' +
                    '<select id="qadaPeriodEstPrayer" style="width:100%;padding:10px;border:1px solid var(--border,rgba(0,0,0,0.1));border-radius:10px;font-size:14px;font-family:inherit;background:var(--card-bg);color:var(--text-primary);margin-bottom:8px;">' +
                        '<option value="all">' + t('qada_all_prayers') + '</option>' +
                        prayerOpts +
                    '</select>' +
                '</div>' +

                // Buttons
                '<div style="display:flex;gap:8px;margin-top:8px;">' +
                    '<button id="qadaPeriodSave" style="flex:1;padding:10px;background:var(--primary);color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">' + t('qada_next') + '</button>' +
                    '<button id="qadaPeriodCancel" style="padding:10px 20px;background:var(--bg,#f3f4f6);color:var(--text-secondary);border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;">' + t('qada_back') + '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(dialog);

        // Type switching
        var selectedType = 'A';
        dialog.querySelectorAll('.qada-period-type').forEach(function(btn) {
            btn.onclick = function() {
                selectedType = btn.dataset.type;
                dialog.querySelectorAll('.qada-period-type').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');

                var dates = document.getElementById('qadaPeriodDates');
                var estimate = document.getElementById('qadaPeriodEstimate');
                var prayerSelect = document.getElementById('qadaPeriodPrayerSelect');

                if (selectedType === 'C') {
                    dates.style.display = 'none';
                    estimate.style.display = '';
                } else {
                    dates.style.display = '';
                    estimate.style.display = 'none';
                    prayerSelect.style.display = selectedType === 'A' ? '' : 'none';
                }
            };
        });

        // Date change → preview days
        var fromEl = document.getElementById('qadaPeriodFrom');
        var toEl = document.getElementById('qadaPeriodTo');
        function updateDaysPreview() {
            var prev = document.getElementById('qadaPeriodDaysPreview');
            if (!fromEl.value || !toEl.value || !prev) return;
            var hFrom = gToH(fromEl.value);
            var hTo = gToH(toEl.value);
            var days = hijriDaysDiff(hFrom, hTo);
            if (days > 0) {
                prev.textContent = days + ' ' + t('qada_period_days') + ' (' + formatHijriDate(hFrom) + ' → ' + formatHijriDate(hTo) + ')';
            } else {
                prev.textContent = t('qada_invalid_dates');
            }
        }
        fromEl.onchange = updateDaysPreview;
        toEl.onchange = updateDaysPreview;

        // Save
        document.getElementById('qadaPeriodSave').onclick = function() {
            var period = { type: selectedType };

            if (selectedType === 'A' || selectedType === 'B') {
                if (!fromEl.value || !toEl.value) return;
                var hFrom = gToH(fromEl.value);
                var hTo = gToH(toEl.value);
                var days = hijriDaysDiff(hFrom, hTo);
                if (days <= 0) return;
                period.fromGregorian = fromEl.value;
                period.toGregorian = toEl.value;
                period.count = days;
                if (selectedType === 'A') {
                    period.prayerId = document.getElementById('qadaPeriodPrayer').value;
                }
            } else {
                var countInput = document.getElementById('qadaPeriodCount');
                var count = parseInt(countInput.value);
                if (!count || count <= 0) return;
                period.count = count;
                period.prayerId = document.getElementById('qadaPeriodEstPrayer').value;
            }

            additionalPeriods.push(period);
            renderPeriodsList();
            updateRunningTotal();
            dialog.remove();
        };

        // Cancel
        document.getElementById('qadaPeriodCancel').onclick = function() { dialog.remove(); };
        dialog.onclick = function(e) { if (e.target === dialog) dialog.remove(); };
    }

    // ==================== RUNNING TOTAL ====================

    function updateRunningTotal() {
        var base = calculateBase();
        var totalEl = document.getElementById('qadaRunningTotal');
        var numEl = document.getElementById('qadaTotalNum');
        if (!totalEl || !numEl) return;

        if (!base) {
            totalEl.style.display = 'none';
            return;
        }

        var totals = calculateTotals(base);
        numEl.textContent = totals.totalAll;
        totalEl.style.display = '';
    }

    function updateHijriPreview() {
        var pubEl = document.getElementById('qadaPubertyDate');
        var regEl = document.getElementById('qadaRegularDate');
        var preview = document.getElementById('qadaHijriPreview');
        if (!pubEl || !regEl || !preview) return;

        if (!pubEl.value || !regEl.value) {
            preview.style.display = 'none';
            return;
        }

        var hPub = gToH(pubEl.value);
        var hReg = gToH(regEl.value);
        var days = hijriDaysDiff(hPub, hReg);

        if (days <= 0) {
            preview.style.display = '';
            preview.innerHTML = '<span style="color:#dc2626;">' + t('qada_invalid_dates') + '</span>';
            return;
        }

        preview.style.display = '';
        preview.innerHTML =
            formatHijriDate(hPub) + ' → ' + formatHijriDate(hReg) +
            '<br><strong>' + days + ' ' + t('qada_period_days') + '</strong>';
    }

    // ==================== EVENT BINDING ====================

    function bindStepEvents() {
        // Close button
        var closeBtn = document.getElementById('qadaCloseBtn');
        if (closeBtn) closeBtn.onclick = close;

        if (currentStep === 1) {
            // Date change listeners
            var pubEl = document.getElementById('qadaPubertyDate');
            var regEl = document.getElementById('qadaRegularDate');
            if (pubEl) pubEl.onchange = function() { updateHijriPreview(); updateRunningTotal(); };
            if (regEl) regEl.onchange = function() { updateHijriPreview(); updateRunningTotal(); };

            var mensEl = document.getElementById('qadaMenstrualDays');
            if (mensEl) mensEl.oninput = function() { updateRunningTotal(); };

            // Yes/No additional
            var yesBtn = document.getElementById('qadaAddYes');
            var noBtn = document.getElementById('qadaAddNo');
            var container = document.getElementById('qadaPeriodsContainer');
            if (yesBtn) yesBtn.onclick = function() {
                yesBtn.classList.add('active');
                if (noBtn) noBtn.classList.remove('active');
                if (container) container.style.display = '';
            };
            if (noBtn) noBtn.onclick = function() {
                noBtn.classList.add('active');
                if (yesBtn) yesBtn.classList.remove('active');
                if (container) container.style.display = 'none';
            };

            // Add period button
            var addBtn = document.getElementById('qadaAddPeriodBtn');
            if (addBtn) addBtn.onclick = showAddPeriodDialog;

            // Next
            var nextBtn = document.getElementById('qadaNextBtn1');
            if (nextBtn) nextBtn.onclick = function() {
                var base = calculateBase();
                if (!base) {
                    showToast(t('qada_fill_dates'), 'warning');
                    return;
                }
                if (base.basePrayers <= 0 && additionalPeriods.length === 0) {
                    showToast(t('qada_invalid_dates'), 'warning');
                    return;
                }
                // Save Step 1 data BEFORE re-render destroys DOM inputs
                var totals = calculateTotals(base);
                wizardData = Object.assign({}, wizardData, base);
                wizardData.additionalPeriods = JSON.parse(JSON.stringify(additionalPeriods));
                wizardData.totalByPrayer = totals.totalByPrayer;
                wizardData.totalAll = totals.totalAll;
                currentStep = 2;
                renderOverlay();
            };
        }

        if (currentStep === 2) {
            // Target pills
            var pills = document.querySelectorAll('.qada-target-pill');
            pills.forEach(function(pill) {
                pill.onclick = function() {
                    pills.forEach(function(p) { p.classList.remove('active'); });
                    pill.classList.add('active');

                    var customWrap = document.getElementById('qadaCustomTargetWrap');
                    if (pill.dataset.target === 'custom') {
                        if (customWrap) customWrap.style.display = '';
                        var customInput = document.getElementById('qadaCustomTarget');
                        if (customInput && customInput.value) {
                            updateCompletionEstimate(parseInt(customInput.value));
                        }
                    } else {
                        if (customWrap) customWrap.style.display = 'none';
                        updateCompletionEstimate(parseInt(pill.dataset.target));
                    }
                };
            });

            var customInput = document.getElementById('qadaCustomTarget');
            if (customInput) customInput.oninput = function() {
                var v = parseInt(customInput.value);
                if (v > 0) updateCompletionEstimate(v);
            };

            // Back
            var backBtn = document.getElementById('qadaBackBtn2');
            if (backBtn) backBtn.onclick = function() { currentStep = 1; renderOverlay(); };

            // Next
            var nextBtn = document.getElementById('qadaNextBtn2');
            if (nextBtn) nextBtn.onclick = function() {
                if (!wizardData.dailyTarget) return;
                currentStep = 3;
                renderOverlay();
            };
        }

        if (currentStep === 3) {
            // Back
            var backBtn = document.getElementById('qadaBackBtn3');
            if (backBtn) backBtn.onclick = function() { currentStep = 2; renderOverlay(); };

            // Save
            var saveBtn = document.getElementById('qadaSaveBtn');
            if (saveBtn) saveBtn.onclick = function() {
                var plan = {
                    planId: isEditing && wizardData.planId ? wizardData.planId : 'qada_' + Date.now(),
                    createdDate: isEditing && wizardData.createdDate ? wizardData.createdDate : new Date().toISOString().split('T')[0],
                    pubertyDateGregorian: wizardData.pubertyDateGregorian,
                    regularDateGregorian: wizardData.regularDateGregorian,
                    pubertyDateHijri: wizardData.pubertyDateHijri,
                    regularDateHijri: wizardData.regularDateHijri,
                    totalHijriDays: wizardData.totalHijriDays,
                    menstrualDaysPerCycle: wizardData.menstrualDaysPerCycle || 0,
                    menstrualTotalDays: wizardData.menstrualTotalDays || 0,
                    additionalPeriods: JSON.parse(JSON.stringify(additionalPeriods)),
                    totalByPrayer: wizardData.totalByPrayer,
                    totalAll: wizardData.totalAll,
                    dailyTarget: wizardData.dailyTarget,
                    expectedCompletionHijri: wizardData.expectedCompletionHijri || '',
                    completedByPrayer: isEditing && wizardData.completedByPrayer ? wizardData.completedByPrayer : { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
                    completedAll: isEditing && wizardData.completedAll ? wizardData.completedAll : 0
                };

                savePlan(plan);
                showToast(isEditing ? t('qada_plan_updated') : t('qada_plan_saved'), 'success');
                close();
                updateSettingsLabel();
            };

            // Delete
            var delBtn = document.getElementById('qadaDeleteBtn');
            if (delBtn) delBtn.onclick = function() {
                if (window.App.UI && window.App.UI.showConfirm) {
                    window.App.UI.showConfirm(t('qada_delete_confirm')).then(function(ok) {
                        if (!ok) return;
                        deletePlanData();
                        // Also delete all qada log and tracking data
                        if (window.App.QadaTracker && window.App.QadaTracker.deleteAllData) {
                            window.App.QadaTracker.deleteAllData();
                        }
                        showToast(t('qada_plan_deleted'), 'info');
                        close();
                        updateSettingsLabel();
                        // Remove qada tab and switch to fard tracker
                        if (window.App.QadaTracker && window.App.QadaTracker.removeTab) {
                            window.App.QadaTracker.removeTab();
                        }
                        if (window.switchView) window.switchView('fard', 'tracker');
                    });
                }
            };
        }
    }

    // ==================== SETTINGS ENTRY POINT ====================

    function updateSettingsLabel() {
        var titleEl = document.getElementById('qadaSettingsTitle');
        var subEl = document.getElementById('qadaSettingsSub');
        if (!titleEl) return;
        var plan = loadPlan();
        if (plan) {
            titleEl.textContent = t('qada_edit_plan');
            if (subEl) {
                var remaining = plan.totalAll - (plan.completedAll || 0);
                subEl.textContent = remaining + ' ' + t('qada_remaining');
            }
        } else {
            titleEl.textContent = t('qada_calculator');
            if (subEl) subEl.textContent = t('qada_calculator_sub');
        }
    }

    // ==================== PUBLIC API ====================

    return {
        open: open,
        close: close,
        loadPlan: loadPlan,
        savePlan: savePlan,
        deletePlanData: deletePlanData,
        updateSettingsLabel: updateSettingsLabel,
        getStorageKey: getStorageKey
    };
})();

// Backward compat
window.openQadaCalculator = window.App.QadaCalc.open;
