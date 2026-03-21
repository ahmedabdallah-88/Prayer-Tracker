// ==================== EXPORT / IMPORT MODULE ====================
import { state } from './state.js';
import { gregorianToHijri, getTodayHijri } from './hijri-calendar.js';
import { getProfilePrefix } from './profiles.js';
import { showToast, showConfirm } from './ui-utils.js';
import { t } from './i18n.js';
import { loadAllData } from './prayer-data.js';
import { updateTrackerView } from './tracker.js';
import { loadTheme } from './theme.js';

// ==================== EXPORT ====================

export function exportData() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('salah_')) {
            try { allData[key] = JSON.parse(localStorage.getItem(key)); }
            catch(e) { allData[key] = localStorage.getItem(key); }
        }
    }

    if (Object.keys(allData).length === 0) {
        showToast(t('no_data'), 'warning');
        return;
    }

    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    a.download = `salah_backup_${dateStr}_${timeStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('export_success'), 'success');
}

export function exportOldData() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('salah_')) {
            try { allData[key] = JSON.parse(localStorage.getItem(key)); }
            catch(e) { allData[key] = localStorage.getItem(key); }
        }
    }

    if (Object.keys(allData).length === 0) {
        showToast(t('no_data'), 'warning');
        return;
    }

    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    a.download = `نسخة_احتياطية_${dateStr}_${timeStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('export_success'), 'success');
}

// ==================== IMPORT ====================

export function importData() {
    document.getElementById('importFile').click();
}

export function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            if (!state.activeProfile) {
                showToast(t('select_profile_first'), 'warning');
                return;
            }

            if (await showConfirm(t('import_replace'))) {
                const currentId = state.activeProfile.id;

                // Use the full day-by-day converter
                var importCount = importAndConvertToHijri(imported, currentId);

                // Apply theme if present
                if (imported['_theme']) {
                    localStorage.setItem('salah_tracker_theme', imported['_theme']);
                    loadTheme();
                }

                // Reload everything
                var todayH = getTodayHijri();
                state.currentHijriMonth = todayH.month;
                state.currentHijriYear = todayH.year;
                state.currentMonth = state.currentHijriMonth;
                state.currentYear = state.currentHijriYear;
                loadAllData('fard');
                loadAllData('sunnah');

                // Always update the tracker view
                updateTrackerView(state.currentSection || 'fard');

                showToast(`${t('import_success')} (${importCount})`, 'success');
            }
        } catch (error) {
            showToast(t('file_error'), 'error');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Import data directly from profile screen (before profile exists)
export function handleImportOnProfile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            // Store pending import data
            {
                // Store temporarily — will be remapped when profile is created
                localStorage.setItem('_pending_import', e.target.result);
                showToast(t('pending_import_saved'), 'success');
            }
        } catch (error) {
            showToast(t('file_error'), 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==================== GREGORIAN -> HIJRI IMPORT CONVERTER ====================
// Converts imported Gregorian data to Hijri, day by day

export function isGregorianKey(key) {
    if (/_h\d{4}/.test(key)) return false; // already Hijri
    // Match year_month pattern with Gregorian year range
    var m = key.match(/(\d{4})_(\d{1,2})$/);
    if (m && parseInt(m[1]) >= 2000 && parseInt(m[1]) <= 2100) return true;
    // Match year-only pattern
    var m2 = key.match(/(\d{4})$/);
    if (m2 && !m && parseInt(m2[1]) >= 2000 && parseInt(m2[1]) <= 2100) return true;
    return false;
}

// Import all Gregorian-keyed data, converting to Hijri day-by-day
export function importAndConvertToHijri(imported, profileId) {
    // Collect all converted Hijri data in memory first, then write
    var hijriTrackers = {};  // key -> {prayerId: {hijriDay: value}}
    var hijriQada = {};
    var hijriCong = {};
    var hijriExempt = {};
    var hijriVolFast = {};
    var directKeys = {};     // keys that don't need day conversion (fasting, periods, non-data)

    var importCount = 0;

    Object.keys(imported).forEach(function(key) {
        if (key === '_profile' || key === '_theme') return;
        var value = imported[key];

        // ---- TRACKER DATA (prayer -> day -> value) ----
        // Pattern: salah_tracker_PROFILEID_TYPE_YEAR_MONTH
        var trackerMatch = key.match(/^(salah_tracker_(?:p_[a-z0-9_]+_|))(\w+)_(\d{4})_(\d{1,2})$/);
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

        // ---- QADA / CONG / EXEMPT DATA (prayerId -> day -> value) ----
        var auxPatterns = [
            { regex: /^(salah_qada_(?:p_[a-z0-9_]+_|))(\d{4})_(\d{1,2})$/, store: hijriQada, prefix: 'salah_qada_' },
            { regex: /^(salah_cong_(?:p_[a-z0-9_]+_|))(\d{4})_(\d{1,2})$/, store: hijriCong, prefix: 'salah_cong_' },
            { regex: /^(salah_exempt_(?:p_[a-z0-9_]+_|))(\d{4})_(\d{1,2})$/, store: hijriExempt, prefix: 'salah_exempt_' }
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

        // ---- VOL FASTING (day -> true/false) ----
        var volMatch = key.match(/^(salah_volfasting_(?:p_[a-z0-9_]+_|))(\d{4})_(\d{1,2})$/);
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
        var yearOnlyMatch = key.match(/^(salah_(?:fasting|periods)_(?:p_[a-z0-9_]+_|))(\d{4})$/);
        if (yearOnlyMatch && !/_h\d{4}/.test(key)) {
            var fY = parseInt(yearOnlyMatch[2]);
            if (fY >= 2000 && fY <= 2100) {
                try {
                    var midDate = new Date(fY, 5, 15);
                    var hh = gregorianToHijri(midDate);
                    var newKey = yearOnlyMatch[1].replace(/p_[a-z0-9_]+_/, profileId + '_');
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

        // ---- NON-DATA KEYS (theme, settings, profiles) — store as-is ----
        if (key === 'salah_tracker_theme' || key === 'salah_profiles' || key === 'salah_active_profile' || !key.match(/_\d{1,2}$/)) {
            directKeys[key] = value;
            return;
        }

        // ---- ALREADY HIJRI or OTHER KEYS — store directly with profile remap ----
        var remappedKey = key;
        // Remap profile ID if needed (profile IDs look like p_1234567890_abc12)
        var oldPMatch = key.match(/_(p_\d+_[a-z0-9]+)_/);
        if (oldPMatch && oldPMatch[1] !== profileId) {
            remappedKey = key.replace(oldPMatch[1], profileId);
        } else if (!key.includes('p_') && key.startsWith('salah_') && typeof value === 'object') {
            // Old format without profile prefix — only remap actual data objects
            remappedKey = key.replace(/^(salah_\w+_)/, '$1' + profileId + '_');
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

// ==================== WINDOW EXPORTS ====================
window.exportData = exportData;
window.exportOldData = exportOldData;
window.importData = importData;
window.handleImport = handleImport;
window.handleImportOnProfile = handleImportOnProfile;
window.isGregorianKey = isGregorianKey;
window.importAndConvertToHijri = importAndConvertToHijri;
