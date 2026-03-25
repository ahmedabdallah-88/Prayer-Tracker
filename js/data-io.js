/**
 * data-io.js — Data Export/Import Module
 * Prayer Tracker PWA
 *
 * Provides: exportData, importData, handleImport, importAndConvertToHijri,
 *           isGregorianKey, migrateGregorianToHijri, migrateExistingData,
 *           exportOldData, handleImportOnProfile, downloadFallback
 *
 * Depends on:
 *   window.App.Storage   — getProfilePrefix, getActiveProfile, loadAllData
 *   window.App.Hijri     — gregorianToHijri, getTodayHijri, cleanAllGhostDays,
 *                           getCurrentHijriYear/Month, setCurrentHijriYear/Month
 *   window.App.I18n      — t, getCurrentLang
 *   window.App.UI        — showToast, showConfirm
 *   window.App.Profiles  — getProfiles, saveProfiles, getActiveProfileId,
 *                           setActiveProfileId, selectProfile, showProfileScreen,
 *                           hideProfileScreen, applyProfileUI
 *   window.App.Themes    — loadTheme
 *   window.updateTrackerView, window.renderStreaks, window.updateDashboard,
 *   window.switchSection  (from tracker)
 */
(function() {
    'use strict';

    var App = window.App = window.App || {};

    // ---- Module-local aliases (resolved at call time) ----
    function getActiveProfile()     { return App.Profiles.getActiveProfile(); }
    function getProfiles()          { return App.Profiles.getProfiles(); }
    function saveProfiles(p)        { return App.Profiles.saveProfiles(p); }
    function setActiveProfileId(id) { return App.Profiles.setActiveProfileId(id); }
    function selectProfile(id)      { return App.Profiles.selectProfile(id); }
    function hideProfileScreen()    { return App.Profiles.hideProfileScreen(); }
    function applyProfileUI()       { return App.Profiles.applyProfileUI(); }

    function loadAllData(type)      { return App.Storage.loadAllData(type); }

    function gregorianToHijri(d)    { return App.Hijri.gregorianToHijri(d); }
    function getTodayHijri()        { return App.Hijri.getTodayHijri(); }
    function cleanAllGhostDays()    { return App.Hijri.cleanAllGhostDays(); }
    function getCurrentHijriYear()  { return App.Hijri.getCurrentHijriYear(); }
    function getCurrentHijriMonth() { return App.Hijri.getCurrentHijriMonth(); }
    function setCurrentHijriYear(v) { return App.Hijri.setCurrentHijriYear(v); }
    function setCurrentHijriMonth(v){ return App.Hijri.setCurrentHijriMonth(v); }

    function t(key)                 { return App.I18n.t(key); }
    function getCurrentLang()       { return App.I18n.getCurrentLang(); }

    function showToast(msg, type, dur) { return App.UI.showToast(msg, type, dur); }
    function showConfirm(msg)       { return App.UI.showConfirm(msg); }

    function loadTheme()            { return App.Themes.loadTheme(); }

    // ================================================================
    // downloadFallback — anchor-click download with delayed cleanup
    // ================================================================
    function downloadFallback(blob, fileName) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Delay cleanup to let download start
        setTimeout(function() {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 3000);

        showToast(t('export_success'), 'success');
    }

    // ================================================================
    // restoreHijriOverrides — import global Hijri calendar overrides
    // ================================================================
    function restoreHijriOverrides(imported) {
        // Restore salah_hijri_days_* keys (29/30 day overrides per month)
        var keys = Object.keys(imported);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].startsWith('salah_hijri_days_')) {
                localStorage.setItem(keys[i], JSON.stringify(imported[keys[i]]));
            }
        }
        // Restore salah_hijri_overrides (custom month start dates)
        if (imported['salah_hijri_overrides'] !== undefined) {
            localStorage.setItem('salah_hijri_overrides', JSON.stringify(imported['salah_hijri_overrides']));
        }
    }

    // ================================================================
    // exportData — merged version (profile-aware, Web Share + fallback)
    // ================================================================
    function exportData() {
        var allData = {};
        var now = new Date();
        var dateStr = now.toISOString().split('T')[0];
        var timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        var fileName;
        var activeProfile = getActiveProfile();

        if (activeProfile) {
            // Export only active profile data
            var profileId = activeProfile.id;
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.includes(profileId)) {
                    try { allData[key] = JSON.parse(localStorage.getItem(key)); }
                    catch(e) { allData[key] = localStorage.getItem(key); }
                }
            }
            allData['_profile'] = activeProfile;
            fileName = activeProfile.name + '_' + dateStr + '_' + timeStr + '.json';
        } else {
            // No profile yet — export ALL data (old format)
            for (var i2 = 0; i2 < localStorage.length; i2++) {
                var key2 = localStorage.key(i2);
                if (key2 && key2.startsWith('salah_')) {
                    try { allData[key2] = JSON.parse(localStorage.getItem(key2)); }
                    catch(e) { allData[key2] = localStorage.getItem(key2); }
                }
            }
            fileName = '\u0646\u0633\u062e\u0629_\u0627\u062d\u062a\u064a\u0627\u0637\u064a\u0629_' + dateStr + '_' + timeStr + '.json';
        }

        var theme = localStorage.getItem('salah_tracker_theme');
        if (theme) allData['_theme'] = theme;

        // Hijri calendar overrides (global, not profile-specific)
        for (var ih = 0; ih < localStorage.length; ih++) {
            var hKey = localStorage.key(ih);
            if (hKey && hKey.startsWith('salah_hijri_days_')) {
                try { allData[hKey] = JSON.parse(localStorage.getItem(hKey)); }
                catch(e) { allData[hKey] = localStorage.getItem(hKey); }
            }
        }
        var hijriOverrides = localStorage.getItem('salah_hijri_overrides');
        if (hijriOverrides) {
            try { allData['salah_hijri_overrides'] = JSON.parse(hijriOverrides); }
            catch(e) { allData['salah_hijri_overrides'] = hijriOverrides; }
        }

        if (Object.keys(allData).length <= 1) {
            showToast(t('no_data'), 'warning');
            return;
        }

        var dataStr = JSON.stringify(allData, null, 2);
        var blob = new Blob([dataStr], { type: 'application/json' });

        // Method 1: Try Web Share API (best for mobile)
        if (navigator.share && navigator.canShare) {
            var file = new File([blob], fileName, { type: 'application/json' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: getCurrentLang() === 'ar' ? '\u0646\u0633\u062e\u0629 \u0627\u062d\u062a\u064a\u0627\u0637\u064a\u0629 \u2014 \u0645\u062a\u062a\u0628\u0639 \u0627\u0644\u0635\u0644\u0627\u0629' : 'Prayer Tracker Backup'
                }).then(function() {
                    showToast(t('export_success'), 'success');
                }).catch(function(err) {
                    if (err.name !== 'AbortError') {
                        // Share failed — fallback to download
                        downloadFallback(blob, fileName);
                    }
                });
                return;
            }
        }

        // Method 2: Download link fallback
        downloadFallback(blob, fileName);
    }

    // ================================================================
    // importData — triggers hidden file picker
    // ================================================================
    function importData() {
        document.getElementById('importFile').click();
    }

    // ================================================================
    // isGregorianKey — detect Gregorian-era localStorage keys
    // ================================================================
    function isGregorianKey(key) {
        if (/_h\d{4}/.test(key)) return false; // already Hijri
        // Match year_month pattern with Gregorian year range
        var m = key.match(/(\d{4})_(\d{1,2})$/);
        if (m && parseInt(m[1]) >= 2000 && parseInt(m[1]) <= 2100) return true;
        // Match year-only pattern
        var m2 = key.match(/(\d{4})$/);
        if (m2 && !m && parseInt(m2[1]) >= 2000 && parseInt(m2[1]) <= 2100) return true;
        return false;
    }

    // ================================================================
    // importAndConvertToHijri — full Gregorian→Hijri converter
    // ================================================================
    function importAndConvertToHijri(imported, profileId) {
        // Collect all converted Hijri data in memory first, then write
        var hijriTrackers = {};  // key → {prayerId: {hijriDay: value}}
        var hijriQada = {};
        var hijriCong = {};
        var hijriExempt = {};
        var hijriVolFast = {};
        var directKeys = {};     // keys that don't need day conversion (fasting, periods, non-data)

        var importCount = 0;

        // Extract old profile ID from imported data for exact matching
        var oldProfileId = imported['_profile'] ? imported['_profile'].id : null;

        Object.keys(imported).forEach(function(key) {
            if (key === '_profile' || key === '_theme') return;
            var value = imported[key];

            // ---- TRACKER DATA (prayer → day → value) ----
            // Pattern: salah_tracker_PROFILEID_TYPE_YEAR_MONTH
            var trackerMatch = key.match(/^(salah_tracker_(?:p_[a-z0-9]+_|))(\w+)_(\d{4})_(\d{1,2})$/);
            if (trackerMatch && !/_h\d{4}/.test(key)) {
                var tPrefix = 'salah_tracker_' + profileId + '_';
                var tType = trackerMatch[2];
                var gYear = parseInt(trackerMatch[3]);
                var gMonth = parseInt(trackerMatch[4]);

                if (gYear >= 2000 && gYear <= 2100 && typeof value === 'object') {
                    // Iterate each prayer
                    Object.keys(value).forEach(function(prayerId) {
                        if (!value[prayerId] || typeof value[prayerId] !== 'object') return;
                        Object.keys(value[prayerId]).forEach(function(dayStr) {
                            if (!value[prayerId][dayStr]) return;
                            var gDay = parseInt(dayStr);
                            if (isNaN(gDay) || gDay < 1 || gDay > 31) return;

                            try {
                                var gDate = new Date(gYear, gMonth - 1, gDay);
                                var h = gregorianToHijri(gDate);
                                var hKey = tPrefix + tType + '_h' + h.year + '_' + h.month;

                                if (!hijriTrackers[hKey]) hijriTrackers[hKey] = {};
                                if (!hijriTrackers[hKey][prayerId]) hijriTrackers[hKey][prayerId] = {};
                                hijriTrackers[hKey][prayerId][h.day] = value[prayerId][dayStr];
                            } catch(e) {}
                        });
                    });
                    importCount++;
                    return;
                }
            }

            // ---- QADA / CONG / EXEMPT DATA (prayerId → day → value) ----
            var auxPatterns = [
                { regex: /^(salah_qada_(?:p_[a-z0-9]+_|))(\d{4})_(\d{1,2})$/, store: hijriQada, prefix: 'salah_qada_' },
                { regex: /^(salah_cong_(?:p_[a-z0-9]+_|))(\d{4})_(\d{1,2})$/, store: hijriCong, prefix: 'salah_cong_' },
                { regex: /^(salah_exempt_(?:p_[a-z0-9]+_|))(\d{4})_(\d{1,2})$/, store: hijriExempt, prefix: 'salah_exempt_' }
            ];

            var handled = false;
            auxPatterns.forEach(function(pat) {
                var m = key.match(pat.regex);
                if (m && !/_h\d{4}/.test(key)) {
                    var gY = parseInt(m[2]);
                    var gM = parseInt(m[3]);
                    if (gY >= 2000 && gY <= 2100 && typeof value === 'object') {
                        Object.keys(value).forEach(function(prayerOrDay) {
                            var inner = value[prayerOrDay];
                            if (typeof inner === 'object' && inner !== null) {
                                // Structure: {prayerId: {day: true}} or {day: {prayerId: true}}
                                Object.keys(inner).forEach(function(subKey) {
                                    if (!inner[subKey]) return;
                                    // Try to determine which is the day key
                                    var dayNum = parseInt(prayerOrDay);
                                    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
                                        // Structure: {day: {prayerId: value}} (exempt format)
                                        try {
                                            var gDate = new Date(gY, gM - 1, dayNum);
                                            var h = gregorianToHijri(gDate);
                                            var hKey = pat.prefix + profileId + '_h' + h.year + '_' + h.month;
                                            if (!pat.store[hKey]) pat.store[hKey] = {};
                                            if (!pat.store[hKey][h.day]) pat.store[hKey][h.day] = {};
                                            pat.store[hKey][h.day][subKey] = inner[subKey];
                                        } catch(e) {}
                                    } else {
                                        // Structure: {prayerId: {day: value}} (qada/cong format)
                                        var d = parseInt(subKey);
                                        if (!isNaN(d) && d >= 1 && d <= 31) {
                                            try {
                                                var gDate2 = new Date(gY, gM - 1, d);
                                                var h2 = gregorianToHijri(gDate2);
                                                var hKey2 = pat.prefix + profileId + '_h' + h2.year + '_' + h2.month;
                                                if (!pat.store[hKey2]) pat.store[hKey2] = {};
                                                if (!pat.store[hKey2][prayerOrDay]) pat.store[hKey2][prayerOrDay] = {};
                                                pat.store[hKey2][prayerOrDay][h2.day] = inner[subKey];
                                            } catch(e) {}
                                        }
                                    }
                                });
                            }
                        });
                        handled = true;
                        importCount++;
                    }
                }
            });
            if (handled) return;

            // ---- VOL FASTING (day → true/false) ----
            var volMatch = key.match(/^(salah_volfasting_(?:p_[a-z0-9]+_|))(\d{4})_(\d{1,2})$/);
            if (volMatch && !/_h\d{4}/.test(key)) {
                var vY = parseInt(volMatch[2]);
                var vM = parseInt(volMatch[3]);
                if (vY >= 2000 && vY <= 2100 && typeof value === 'object') {
                    Object.keys(value).forEach(function(dayStr) {
                        if (!value[dayStr]) return;
                        var d = parseInt(dayStr);
                        if (isNaN(d) || d < 1 || d > 31) return;
                        try {
                            var gDate = new Date(vY, vM - 1, d);
                            var h = gregorianToHijri(gDate);
                            var hKey = 'salah_volfasting_' + profileId + '_h' + h.year + '_' + h.month;
                            if (!hijriVolFast[hKey]) hijriVolFast[hKey] = {};
                            hijriVolFast[hKey][h.day] = value[dayStr];
                        } catch(e) {}
                    });
                    importCount++;
                    return;
                }
            }

            // ---- FASTING / PERIODS (year-only, day numbers are Ramadan-relative, keep as-is) ----
            var yearOnlyMatch = key.match(/^(salah_(?:fasting|periods)_(?:p_[a-z0-9]+_|))(\d{4})$/);
            if (yearOnlyMatch && !/_h\d{4}/.test(key)) {
                var fY = parseInt(yearOnlyMatch[2]);
                if (fY >= 2000 && fY <= 2100) {
                    try {
                        var midDate = new Date(fY, 5, 15);
                        var hh = gregorianToHijri(midDate);
                        var newKey = yearOnlyMatch[1].replace(/p_[a-z0-9]+_/, profileId + '_');
                        if (!newKey.includes(profileId)) newKey = yearOnlyMatch[1] + profileId + '_';
                        // Rebuild prefix properly
                        var basePrefix = key.match(/^(salah_(?:fasting|periods)_)/)[1];
                        newKey = basePrefix + profileId + '_h' + hh.year;
                        directKeys[newKey] = value;
                        importCount++;
                    } catch(e) {}
                    return;
                }
            }

            // ---- ALREADY HIJRI or OTHER KEYS — store directly with profile remap ----
            var remappedKey = key;
            // Remap profile ID using exact match from _profile data
            if (oldProfileId && oldProfileId !== profileId && key.includes(oldProfileId)) {
                remappedKey = key.replace(oldProfileId, profileId);
            } else if (!oldProfileId) {
                // Fallback: try regex for unknown profile ID format
                var oldPMatch = key.match(/_p_(\d+_[a-z0-9]+)_/);
                if (oldPMatch) {
                    var detectedOldId = 'p_' + oldPMatch[1];
                    if (detectedOldId !== profileId) {
                        remappedKey = key.replace(detectedOldId, profileId);
                    }
                } else if (!key.includes('p_') && key.startsWith('salah_')) {
                    // Old format without profile prefix
                    remappedKey = key.replace(/^(salah_\w+_)/, '$1' + profileId + '_');
                }
            }
            directKeys[remappedKey] = value;
            importCount++;
        });

        // Write all collected Hijri data to localStorage
        function mergeAndSave(store) {
            Object.keys(store).forEach(function(hKey) {
                var existing = {};
                try { var s = localStorage.getItem(hKey); if (s) existing = JSON.parse(s); } catch(e) {}
                // Deep merge
                var data = store[hKey];
                Object.keys(data).forEach(function(k1) {
                    if (!existing[k1]) existing[k1] = {};
                    if (typeof data[k1] === 'object' && data[k1] !== null) {
                        Object.keys(data[k1]).forEach(function(k2) {
                            existing[k1][k2] = data[k1][k2];
                        });
                    } else {
                        existing[k1] = data[k1];
                    }
                });
                try { localStorage.setItem(hKey, JSON.stringify(existing)); } catch(e) {}
            });
        }

        mergeAndSave(hijriTrackers);
        mergeAndSave(hijriQada);
        mergeAndSave(hijriCong);
        mergeAndSave(hijriExempt);

        // Vol fasting is simple {day: val}
        Object.keys(hijriVolFast).forEach(function(hKey) {
            var existing = {};
            try { var s = localStorage.getItem(hKey); if (s) existing = JSON.parse(s); } catch(e) {}
            var data = hijriVolFast[hKey];
            Object.keys(data).forEach(function(d) { existing[d] = data[d]; });
            try { localStorage.setItem(hKey, JSON.stringify(existing)); } catch(e) {}
        });

        // Direct keys
        Object.keys(directKeys).forEach(function(k) {
            try { localStorage.setItem(k, JSON.stringify(directKeys[k])); } catch(e) {}
        });

        return importCount;
    }

    // ================================================================
    // handleImport — FileReader handler for main import flow
    // ================================================================
    function handleImport(event) {
        var file = event.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var imported = JSON.parse(e.target.result);
                var activeProfile = getActiveProfile();
                var currentLang = getCurrentLang();

                if (!activeProfile) {
                    // Check if imported data contains a profile — offer to adopt it
                    if (imported['_profile']) {
                        var ip = imported['_profile'];
                        if (await showConfirm(
                            (currentLang === 'ar'
                                ? '\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u0641 \u0634\u062e\u0635\u064a \u0641\u064a \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a:\n\n' + ip.name + ' (' + (ip.gender === 'female' ? '\u0623\u0646\u062b\u0649' : '\u0630\u0643\u0631') + ', ' + ip.age + ' \u0633\u0646\u0629)\n\n\u0647\u0644 \u062a\u0631\u064a\u062f \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a\u061f'
                                : 'Profile found in data:\n\n' + ip.name + ' (' + ip.gender + ', ' + ip.age + ' yrs)\n\nAdopt this profile?')
                        )) {
                            // Create and adopt the profile
                            var newId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                            var newProfile = { id: newId, name: ip.name, age: ip.age, gender: ip.gender };
                            var profiles = getProfiles();
                            profiles.push(newProfile);
                            saveProfiles(profiles);

                            // Activate profile on BOTH modules before importing
                            setActiveProfileId(newId);
                            App.Profiles.setActiveProfile(newProfile);
                            App.Storage.setActiveProfile(newProfile);

                            // Import data under new profile ID
                            var importCount = importAndConvertToHijri(imported, newId);

                            if (imported['_theme']) {
                                localStorage.setItem('salah_tracker_theme', imported['_theme']);
                                loadTheme();
                            }

                            // Restore Hijri calendar overrides (global)
                            restoreHijriOverrides(imported);

                            // Hide profile screen
                            hideProfileScreen();
                            applyProfileUI();

                            // Same proven refresh logic as the working path below
                            var todayH = getTodayHijri();
                            setCurrentHijriMonth(todayH.month);
                            setCurrentHijriYear(todayH.year);
                            App.Storage.setCurrentMonth(todayH.month);
                            App.Storage.setCurrentYear(todayH.year);

                            ['fardTrackerMonthSelect','sunnahTrackerMonthSelect'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = todayH.month; });
                            ['fardTrackerYearInput','sunnahTrackerYearInput','fardDashboardYear','fardYearlyYear','sunnahDashboardYear','sunnahYearlyYear'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = todayH.year; });

                            loadAllData('fard');
                            loadAllData('sunnah');

                            cleanAllGhostDays();

                            loadAllData('fard');
                            loadAllData('sunnah');

                            if (window.updateTrackerView) {
                                window.updateTrackerView('fard');
                                window.updateTrackerView('sunnah');
                            }
                            if (window.renderStreaks) {
                                window.renderStreaks('fard');
                                window.renderStreaks('sunnah');
                            }
                            if (window.updateShellBar) window.updateShellBar();
                            if (window.switchSection) window.switchSection('fard');

                            showToast(t('import_success') + ' (' + importCount + ')', 'success');
                            return;
                        }
                    }

                    // No profile to adopt — store as pending
                    localStorage.setItem('_pending_import', e.target.result);
                    showToast(t('select_profile_first'), 'warning');
                    return;
                }

                if (await showConfirm(t('import_replace'))) {
                    var currentId = activeProfile.id;

                    // Use the full day-by-day converter
                    var importCount = importAndConvertToHijri(imported, currentId);

                    // Apply theme if present
                    if (imported['_theme']) {
                        localStorage.setItem('salah_tracker_theme', imported['_theme']);
                        loadTheme();
                    }

                    // Restore Hijri calendar overrides (global)
                    restoreHijriOverrides(imported);

                    // Full reload: reset state to today's Hijri date
                    var todayH = getTodayHijri();
                    setCurrentHijriMonth(todayH.month);
                    setCurrentHijriYear(todayH.year);
                    App.Storage.setCurrentMonth(todayH.month);
                    App.Storage.setCurrentYear(todayH.year);

                    // Update ALL month/year selects (null-safe)
                    var _ids = ['fardTrackerMonthSelect','sunnahTrackerMonthSelect'];
                    _ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = todayH.month; });
                    var _yids = ['fardTrackerYearInput','sunnahTrackerYearInput','fardDashboardYear','fardYearlyYear','sunnahDashboardYear','sunnahYearlyYear'];
                    _yids.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = todayH.year; });

                    // Reload data
                    loadAllData('fard');
                    loadAllData('sunnah');

                    // Clean ghost days (day 30/31 in 29-day months)
                    cleanAllGhostDays();

                    // Reload again after cleanup
                    loadAllData('fard');
                    loadAllData('sunnah');

                    // Force re-render of ALL views
                    if (window.updateTrackerView) {
                        window.updateTrackerView('fard');
                        window.updateTrackerView('sunnah');
                    }
                    if (window.renderStreaks) {
                        window.renderStreaks('fard');
                        window.renderStreaks('sunnah');
                    }

                    // If dashboard is visible, update it
                    var fardDash = document.getElementById('fardDashboardView');
                    if (fardDash && fardDash.classList.contains('active') && window.updateDashboard) {
                        window.updateDashboard('fard');
                    }
                    var sunnahDash = document.getElementById('sunnahDashboardView');
                    if (sunnahDash && sunnahDash.classList.contains('active') && window.updateDashboard) {
                        window.updateDashboard('sunnah');
                    }

                    showToast(t('import_success') + ' (' + importCount + ')', 'success');
                }
            } catch (error) {
                console.error('Import error:', error);
                showToast(t('file_error'), 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // ================================================================
    // migrateGregorianToHijri — one-time auto-migration on startup
    // ================================================================
    function migrateGregorianToHijri() {
        if (localStorage.getItem('salah_hijri_migrated_v2')) return;

        // Collect all Gregorian-keyed data from localStorage
        var gregData = {};
        var hasGregorianData = false;

        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (!key || !key.startsWith('salah_')) continue;
            if (/_h\d{4}/.test(key)) continue; // already Hijri

            // Check if it has a Gregorian year (2000-2100)
            var yearMatch = key.match(/(\d{4})/);
            if (yearMatch && parseInt(yearMatch[1]) >= 2000 && parseInt(yearMatch[1]) <= 2100) {
                try {
                    gregData[key] = JSON.parse(localStorage.getItem(key));
                    hasGregorianData = true;
                } catch(e) {
                    gregData[key] = localStorage.getItem(key);
                }
            }
        }

        if (!hasGregorianData) {
            localStorage.setItem('salah_hijri_migrated_v2', 'true');
            return;
        }

        // Detect profile ID from keys
        var profileId = '';
        for (var k in gregData) {
            var pm = k.match(/(p_[a-z0-9]+)/);
            if (pm) { profileId = pm[1]; break; }
        }

        if (profileId) {
            importAndConvertToHijri(gregData, profileId);
        }

        localStorage.setItem('salah_hijri_migrated_v2', 'true');
    }

    // ================================================================
    // migrateExistingData — detect old unprefixed data, show warning
    // ================================================================
    function migrateExistingData() {
        var profiles = getProfiles();
        if (profiles.length > 0) return;

        // Check if there's existing data without profile prefix
        var hasOldData = false;
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.startsWith('salah_tracker_') && !key.includes('p_')) {
                hasOldData = true;
                break;
            }
        }

        if (hasOldData) {
            // Show warning and export button
            var warning = document.getElementById('oldDataWarning');
            var exportBtn = document.getElementById('exportOldBtn');
            if (warning) warning.style.display = 'block';
            if (exportBtn) exportBtn.style.display = '';
        }
    }

    // ================================================================
    // exportOldData — export ALL old data (no profile prefix)
    // ================================================================
    function exportOldData() {
        var allData = {};
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.startsWith('salah_')) {
                try { allData[key] = JSON.parse(localStorage.getItem(key)); }
                catch(e) { allData[key] = localStorage.getItem(key); }
            }
        }

        if (Object.keys(allData).length === 0) {
            showToast(t('no_data'), 'warning');
            return;
        }

        var dataStr = JSON.stringify(allData, null, 2);
        var blob = new Blob([dataStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var now = new Date();
        var dateStr = now.toISOString().split('T')[0];
        var timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        a.download = '\u0646\u0633\u062e\u0629_\u0627\u062d\u062a\u064a\u0627\u0637\u064a\u0629_' + dateStr + '_' + timeStr + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast(t('export_success'), 'success');
    }

    // ================================================================
    // handleImportOnProfile — import from profile screen (before profile exists)
    // ================================================================
    function handleImportOnProfile(event) {
        var file = event.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var imported = JSON.parse(e.target.result);
                var currentLang = getCurrentLang();

                if (imported['_profile']) {
                    var ip = imported['_profile'];

                    // Create the profile
                    var newId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                    var newProfile = { id: newId, name: ip.name, age: ip.age, gender: ip.gender };
                    var profiles = getProfiles();
                    profiles.push(newProfile);
                    saveProfiles(profiles);

                    // Import data under new profile ID
                    importAndConvertToHijri(imported, newId);

                    if (imported['_theme']) {
                        localStorage.setItem('salah_tracker_theme', imported['_theme']);
                        loadTheme();
                    }

                    // Use the same proven path as handleImport: selectProfile does everything
                    selectProfile(newId);
                    showToast(t('import_success'), 'success');
                    return;
                }

                // No profile found — store as pending import
                localStorage.setItem('_pending_import', e.target.result);
                showToast(t('pending_import_saved'), 'success');
                if (window.renderProfilesList) window.renderProfilesList();
            } catch (error) {
                showToast(t('file_error'), 'error');
                console.error('Import on profile error:', error);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // ================================================================
    // Public API
    // ================================================================
    App.DataIO = {
        exportData:              exportData,
        importData:              importData,
        handleImport:            handleImport,
        isGregorianKey:          isGregorianKey,
        importAndConvertToHijri: importAndConvertToHijri,
        migrateGregorianToHijri: migrateGregorianToHijri,
        migrateExistingData:     migrateExistingData,
        exportOldData:           exportOldData,
        handleImportOnProfile:   handleImportOnProfile,
        downloadFallback:        downloadFallback
    };

    // ================================================================
    // Backward compatibility — global aliases
    // ================================================================
    window.exportData              = exportData;
    window.importData              = importData;
    window.handleImport            = handleImport;
    window.exportOldData           = exportOldData;
    window.handleImportOnProfile   = handleImportOnProfile;
    window.importAndConvertToHijri = importAndConvertToHijri;
    window.migrateExistingData     = migrateExistingData;

})();
