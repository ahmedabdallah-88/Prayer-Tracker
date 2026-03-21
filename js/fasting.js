// ==================== FASTING MODULE ====================
// Ramadan fasting, voluntary fasting, and fasting dashboard
import { state, fardPrayers, sunnahPrayers } from './state.js';
import { getHijriMonthNames, getHijriMonthName, getHijriDaysInMonth, gregorianToHijri, getTodayHijri, hijriToGregorian, getGregorianSpanForHijriMonth } from './hijri-calendar.js';
import { getProfilePrefix, getDaysInMonth, isFutureDate } from './prayer-data.js';
import { showToast, showConfirm, hapticFeedback } from './ui-utils.js';
import { t } from './i18n.js';
import { getExemptDays } from './exempt-days.js';

// ==================== RAMADAN FASTING ====================

export function getFastingKey(year) {
    return `salah_fasting_${getProfilePrefix()}h${year}`;
}

export function getFastingData(year) {
    const stored = localStorage.getItem(getFastingKey(year));
    return stored ? JSON.parse(stored) : {};
}

export function saveFastingData(year, data) {
    try { localStorage.setItem(getFastingKey(year), JSON.stringify(data)); }
    catch(e) { showToast(t('storage_full'), 'error'); }
}

export function switchFastingView(view) {
    document.querySelectorAll('#fastingSection .view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('#fastingSection .toggle-btn').forEach(b => b.classList.remove('active'));

    if (view === 'voluntary') {
        document.getElementById('fastingVoluntaryView').classList.add('active');
        try { document.querySelector('#fastingSection .toggle-btn:nth-child(1)').classList.add('active'); } catch(e) {}
        updateVoluntaryFasting();
    } else if (view === 'ramadan') {
        document.getElementById('fastingRamadanView').classList.add('active');
        try { document.querySelector('#fastingSection .toggle-btn:nth-child(2)').classList.add('active'); } catch(e) {}
        updateFastingView();
    } else if (view === 'dashboard') {
        document.getElementById('fastingDashboardView').classList.add('active');
        try { document.querySelector('#fastingSection .toggle-btn:nth-child(3)').classList.add('active'); } catch(e) {}
        document.getElementById('fastingDashboardYear').value = state.currentYear;
        updateFastingDashboard();
    }
}

// ==================== VOLUNTARY FASTING ====================

export function getVolFastingKey(year, month) {
    return `salah_volfasting_${getProfilePrefix()}h${year}_${month}`;
}

export function getVolFastingData(year, month) {
    const stored = localStorage.getItem(getVolFastingKey(year, month));
    return stored ? JSON.parse(stored) : {};
}

export function saveVolFastingData(year, month, data) {
    try { localStorage.setItem(getVolFastingKey(year, month), JSON.stringify(data)); }
    catch(e) { showToast(t('storage_full'), 'error'); }
}

export function updateVoluntaryFasting() {
    state.fastingMonth = parseInt(document.getElementById('fastingMonthSelect').value);
    state.fastingYear = parseInt(document.getElementById('fastingYearVoluntary').value);
    const daysInMonth = getHijriDaysInMonth(state.fastingYear, state.fastingMonth);
    const data = getVolFastingData(state.fastingYear, state.fastingMonth);
    const isFemale = state.activeProfile && state.activeProfile.gender === 'female' && state.activeProfile.age >= 12;
    const exemptData = isFemale ? getExemptDays(state.fastingYear, state.fastingMonth) : {};

    const grid = document.getElementById('voluntaryFastingGrid');
    grid.innerHTML = '';

    let fasted = 0, exemptCount = 0;
    var createDualDayNum = window.createDualDayNum;

    for (let day = 1; day <= daysInMonth; day++) {
        const dayBox = document.createElement('div');
        dayBox.className = 'day-box';

        if (isFutureDate(day, state.fastingMonth, state.fastingYear)) {
            if (createDualDayNum) dayBox.appendChild(createDualDayNum(day, state.fastingYear, state.fastingMonth));
            dayBox.classList.add('disabled');
            dayBox.style.opacity = '0.3';
        } else if (isFemale && state.fastingExemptModeOn) {
            if (createDualDayNum) dayBox.appendChild(createDualDayNum(day, state.fastingYear, state.fastingMonth));

            // Check if any prayer is exempt on this day (reuse prayer exempt data)
            const dayExempt = exemptData[day] && Object.values(exemptData[day]).some(v => v);
            if (dayExempt) {
                dayBox.classList.add('exempt');
                exemptCount++;
            }
            dayBox.style.cursor = 'default';
            dayBox.title = t('exempt_linked_prayer');
        } else {
            if (createDualDayNum) dayBox.appendChild(createDualDayNum(day, state.fastingYear, state.fastingMonth));

            // Check if exempt day for female
            const dayExempt = isFemale && exemptData[day] && Object.values(exemptData[day]).some(v => v);
            if (dayExempt) {
                dayBox.classList.add('exempt');
                exemptCount++;
            } else if (data[day]) {
                dayBox.classList.add('checked');
                fasted++;
            }

            if (!dayExempt) {
                dayBox.onclick = () => {
                    const d = getVolFastingData(state.fastingYear, state.fastingMonth);
                    d[day] = !d[day];
                    hapticFeedback(d[day] ? 'success' : 'light');
                    if (!d[day]) delete d[day];
                    saveVolFastingData(state.fastingYear, state.fastingMonth, d);
                    updateVoluntaryFasting();
                };
            }
        }

        grid.appendChild(dayBox);
    }

    document.getElementById('volFastedCount').textContent = fasted;
    document.getElementById('volExemptCount').textContent = exemptCount;
    const possible = daysInMonth - exemptCount;
    const rate = possible > 0 ? Math.round((fasted / possible) * 100) : 0;
    document.getElementById('volFastRate').textContent = rate + '%';
    document.getElementById('volFastingCounter').textContent = `${fasted} / ${daysInMonth}`;
}

export function changeFastingMonth(delta) {
    state.fastingMonth = parseInt(document.getElementById('fastingMonthSelect').value);
    state.fastingYear = parseInt(document.getElementById('fastingYearVoluntary').value);
    state.fastingMonth += delta;
    if (state.fastingMonth > 12) { state.fastingMonth = 1; state.fastingYear++; }
    else if (state.fastingMonth < 1) { state.fastingMonth = 12; state.fastingYear--; }
    document.getElementById('fastingMonthSelect').value = state.fastingMonth;
    document.getElementById('fastingYearVoluntary').value = state.fastingYear;
    updateVoluntaryFasting();
}

export async function resetVoluntaryFasting() {
    if (!await showConfirm(t('confirm_clear'))) return;
    state.fastingMonth = parseInt(document.getElementById('fastingMonthSelect').value);
    state.fastingYear = parseInt(document.getElementById('fastingYearVoluntary').value);
    localStorage.removeItem(getVolFastingKey(state.fastingYear, state.fastingMonth));
    updateVoluntaryFasting();
}

// ==================== FASTING DASHBOARD ====================

export function updateFastingDashboard() {
    const year = parseInt(document.getElementById('fastingDashboardYear').value) || state.currentHijriYear;

    let totalVol = 0;
    let bestMonth = { month: 0, days: 0 };
    const monthlyVol = [];

    for (let month = 1; month <= 12; month++) {
        const data = getVolFastingData(year, month);
        const count = Object.values(data).filter(v => v).length;
        totalVol += count;
        monthlyVol.push(count);
        if (count > bestMonth.days) {
            bestMonth = { month, days: count };
        }
    }

    document.getElementById('fastDashVolTotal').textContent = totalVol;
    document.getElementById('fastDashBestMonth').textContent = bestMonth.month > 0 ? getHijriMonthName(bestMonth.month - 1) : '-';
    document.getElementById('fastDashBestMonthDays').textContent = bestMonth.days + ' يوم';
    document.getElementById('fastDashAvg').textContent = Math.round(totalVol / 12);

    // Ramadan stats
    const ramadanData = getFastingData(year);
    const ramadanDays = getHijriDaysInMonth(year, 9);
    let ramadanFasted = 0;
    Object.values(ramadanData).forEach(v => { if (v === 'fasted') ramadanFasted++; });
    document.getElementById('fastDashRamadan').textContent = `${ramadanFasted}/${ramadanDays}`;
    document.getElementById('fastDashRamadanRate').textContent = Math.round((ramadanFasted / ramadanDays) * 100) + '%';

    // Monthly chart
    if (state.charts.fasting) state.charts.fasting.destroy();
    const ctx = document.getElementById('fastingMonthlyChart');
    if (ctx) {
        state.charts.fasting = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: getHijriMonthNames(),
                datasets: [{
                    label: t('fasting_days_chart'),
                    data: monthlyVol,
                    backgroundColor: 'rgba(5, 150, 105, 0.7)',
                    borderColor: '#059669',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

// ==================== RAMADAN VIEW ====================

export function updateFastingView() {
    const year = parseInt(document.getElementById('fastingYearInput').value) || state.currentHijriYear;
    const data = getFastingData(year);
    const grid = document.getElementById('fastingGrid');
    grid.innerHTML = '';

    // Ramadan is always Hijri month 9 - get its days
    const ramadanDays = getHijriDaysInMonth(year, 9);

    // Show Gregorian reference
    var refEl = document.getElementById('ramadanHijriRef');
    if (refEl) {
        refEl.textContent = '🌙 ' + getHijriMonthName(8) + ' ' + year + ' (' + getGregorianSpanForHijriMonth(year, 9) + ')';
    }

    let fasted = 0, exempt = 0, missed = 0;
    var createDualDayNum = window.createDualDayNum;

    for (let day = 1; day <= ramadanDays; day++) {
        const box = document.createElement('div');
        box.className = 'fasting-day-box';

        if (createDualDayNum) box.appendChild(createDualDayNum(day, year, 9));

        const status = data[day] || '';

        if (status === 'fasted') { box.classList.add('fasted'); fasted++; }
        else if (status === 'exempt') { box.classList.add('exempt-fast'); exempt++; }
        else if (status === 'missed') { box.classList.add('missed'); missed++; }

        box.onclick = () => cycleFastingDay(year, day);
        grid.appendChild(box);
    }

    document.getElementById('fastingDaysFasted').textContent = fasted;
    document.getElementById('fastingDaysExempt').textContent = exempt;
    document.getElementById('fastingDaysMissed').textContent = missed;
    const isFemaleRamadan = state.activeProfile && state.activeProfile.gender === 'female' && state.activeProfile.age >= 12;
    document.getElementById('fastingDaysOwed').textContent = isFemaleRamadan ? (exempt + missed) : missed;
    document.getElementById('fastingCounter').textContent = `${fasted} / ${ramadanDays}`;
}

export function cycleFastingDay(year, day) {
    const data = getFastingData(year);
    const current = data[day] || '';
    const isFemale = state.activeProfile && state.activeProfile.gender === 'female' && state.activeProfile.age >= 12;

    const cycle = isFemale
        ? { '': 'fasted', 'fasted': 'exempt', 'exempt': 'missed', 'missed': '' }
        : { '': 'fasted', 'fasted': 'missed', 'missed': '' };
    data[day] = cycle[current];

    hapticFeedback(data[day] === 'fasted' ? 'success' : 'light');

    if (!data[day]) delete data[day];

    saveFastingData(year, data);
    updateFastingView();
}

export async function resetFasting() {
    if (!await showConfirm(t('confirm_clear_fasting'))) return;
    const year = parseInt(document.getElementById('fastingYearInput').value) || state.currentYear;
    localStorage.removeItem(getFastingKey(year));
    updateFastingView();
}

// ==================== WINDOW EXPORTS ====================
// Expose all functions on window for inline event handlers

window.switchFastingView = switchFastingView;
window.updateVoluntaryFasting = updateVoluntaryFasting;
window.changeFastingMonth = changeFastingMonth;
window.resetVoluntaryFasting = resetVoluntaryFasting;
window.updateFastingView = updateFastingView;
window.updateFastingDashboard = updateFastingDashboard;
window.resetFasting = resetFasting;
window.cycleFastingDay = cycleFastingDay;
window.getFastingData = getFastingData;
window.saveFastingData = saveFastingData;
window.getFastingKey = getFastingKey;
window.getVolFastingData = getVolFastingData;
window.saveVolFastingData = saveVolFastingData;
window.getVolFastingKey = getVolFastingKey;
