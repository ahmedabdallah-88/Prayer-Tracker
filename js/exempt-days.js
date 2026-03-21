// ==================== EXEMPT DAY MANAGEMENT MODULE ====================
import { state, fardPrayers, sunnahPrayers } from './state.js';
import { getHijriMonthName } from './hijri-calendar.js';
import { getProfilePrefix } from './prayer-data.js';
import { showToast } from './ui-utils.js';
import { t } from './i18n.js';

// ==================== EXEMPT STORAGE ====================

export function getExemptKey(year, month) {
    return `salah_exempt_${getProfilePrefix()}h${year}_${month}`;
}

export function getExemptDays(year, month) {
    const stored = localStorage.getItem(getExemptKey(year, month));
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    // Migration: if old format {day: true}, convert to new {day: {allPrayers: true}}
    const firstVal = Object.values(parsed)[0];
    if (typeof firstVal === 'boolean') {
        // Old format - migrate
        const newData = {};
        Object.keys(parsed).forEach(day => {
            if (parsed[day]) {
                newData[day] = {};
                fardPrayers.forEach(p => { newData[day][p.id] = true; });
                sunnahPrayers.forEach(p => { newData[day][p.id] = true; });
            }
        });
        return newData;
    }
    return parsed;
}

export function saveExemptDays(year, month, data) {
    try { localStorage.setItem(getExemptKey(year, month), JSON.stringify(data)); }
    catch(e) { showToast(t('storage_full'), 'error'); }
}

// ==================== EXEMPT MODE TOGGLE ====================

export function toggleExemptMode(type) {
    state.exemptMode[type] = document.getElementById(`${type}ExemptMode`).checked;
    if (window.renderTrackerMonth) window.renderTrackerMonth(type);
}

// ==================== EXEMPT PRAYER TOGGLING ====================

export function toggleExemptPrayer(prayerId, day) {
    const exemptData = getExemptDays(state.currentYear, state.currentMonth);
    if (!exemptData[day]) exemptData[day] = {};

    exemptData[day][prayerId] = !exemptData[day][prayerId];

    // Clean up: remove day entry if no prayers are exempt
    if (!Object.values(exemptData[day]).some(v => v)) {
        delete exemptData[day];
    }

    saveExemptDays(state.currentYear, state.currentMonth, exemptData);
    if (window.renderTrackerMonth) { window.renderTrackerMonth('fard'); window.renderTrackerMonth('sunnah'); }
    if (window.updateTrackerStats) { window.updateTrackerStats('fard'); window.updateTrackerStats('sunnah'); }
    if (window.renderStreaks) { window.renderStreaks('fard'); window.renderStreaks('sunnah'); }
    updateExemptInfo('fard');
    updateExemptInfo('sunnah');
    savePeriodHistory();
}

// ==================== EXEMPT QUERY HELPERS ====================

export function isPrayerExempt(exemptData, prayerId, day) {
    return exemptData[day] && exemptData[day][prayerId];
}

export function getExemptCountForPrayer(year, month, prayerId) {
    const exempt = getExemptDays(year, month);
    let count = 0;
    Object.keys(exempt).forEach(day => {
        if (exempt[day] && exempt[day][prayerId]) count++;
    });
    return count;
}

export function updateExemptInfo(type) {
    const info = document.getElementById(`${type}ExemptInfo`);
    if (!info) return;
    if (!state.activeProfile || state.activeProfile.gender !== 'female' || state.activeProfile.age < 12) { info.textContent = ''; return; }

    const exempt = getExemptDays(state.currentYear, state.currentMonth);
    // Count total exempt prayer-slots
    let count = 0;
    Object.keys(exempt).forEach(day => {
        count += Object.values(exempt[day]).filter(v => v).length;
    });
    // Count unique days that have any exempt
    const uniqueDays = Object.keys(exempt).filter(day =>
        Object.values(exempt[day]).some(v => v)
    ).length;
    info.textContent = count > 0 ? `صلوات معفاة: ${count} · أيام متأثرة: ${uniqueDays}` : '';
}

export function getExemptCountForMonth(year, month) {
    const exempt = getExemptDays(year, month);
    return Object.keys(exempt).filter(day =>
        Object.values(exempt[day]).some(v => v)
    ).length;
}

// ==================== PERIOD HISTORY ====================

export function savePeriodHistory() {
    // Auto-detect periods from exempt days (any day with at least one exempt prayer)
    const periods = [];

    for (let month = 1; month <= 12; month++) {
        const exempt = getExemptDays(state.currentYear, month);
        const days = Object.keys(exempt).filter(d =>
            Object.values(exempt[d]).some(v => v)
        ).map(Number).sort((a, b) => a - b);

        if (days.length === 0) continue;

        // Group consecutive days
        let start = days[0];
        let end = days[0];

        for (let i = 1; i < days.length; i++) {
            if (days[i] === end + 1) {
                end = days[i];
            } else {
                periods.push({ month, start, end, duration: end - start + 1 });
                start = days[i];
                end = days[i];
            }
        }
        periods.push({ month, start, end, duration: end - start + 1 });
    }

    localStorage.setItem(`salah_periods_${getProfilePrefix()}h${state.currentYear}`, JSON.stringify(periods));
}

export function renderPeriodHistory() {
    const container = document.getElementById('periodHistoryContainer');
    if (!container) return;

    const year = parseInt(document.getElementById('fastingYearInput').value) || state.currentYear;
    const stored = localStorage.getItem(`salah_periods_${getProfilePrefix()}h${year}`);
    const periods = stored ? JSON.parse(stored) : [];

    if (periods.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">لا توجد بيانات مسجلة لهذه السنة.<br>حددي أيام الإعفاء من المتتبع الشهري وستظهر هنا تلقائياً.</p>';
        return;
    }

    container.innerHTML = '';
    periods.forEach(p => {
        const entry = document.createElement('div');
        entry.className = 'period-entry';
        entry.innerHTML = `
            <div class="dates">🗓️ ${p.start} ${getHijriMonthName(p.month - 1)} → ${p.end} ${getHijriMonthName(p.month - 1)} ${year}</div>
            <div class="duration">${p.duration} يوم</div>
        `;
        container.appendChild(entry);
    });
}

// ==================== WINDOW EXPORTS ====================
window.getExemptKey = getExemptKey;
window.getExemptDays = getExemptDays;
window.saveExemptDays = saveExemptDays;
window.toggleExemptMode = toggleExemptMode;
window.toggleExemptPrayer = toggleExemptPrayer;
window.isPrayerExempt = isPrayerExempt;
window.getExemptCountForPrayer = getExemptCountForPrayer;
window.updateExemptInfo = updateExemptInfo;
window.getExemptCountForMonth = getExemptCountForMonth;
window.savePeriodHistory = savePeriodHistory;
window.renderPeriodHistory = renderPeriodHistory;
