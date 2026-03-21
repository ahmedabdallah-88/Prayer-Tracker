// ==================== STREAKS MODULE ====================
// Streak calculation and rendering for prayer tracking
import { state, fardPrayers, sunnahPrayers } from './state.js';
import { gregorianToHijri, hijriToGregorianDay1 } from './hijri-calendar.js';

// ==================== STREAK CALCULATION ====================

export function calculateStreak(type, prayerId) {
    const today = new Date();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // For fard: streak is based on CONGREGATION only
    // For sunnah: streak is based on prayer completion
    const isCongStreak = (type === 'fard');

    // Use noon to avoid DST boundary issues
    let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);

    var todayH = gregorianToHijri(checkDate);
    var todayHMonth = todayH.month;
    var todayHDay = todayH.day;
    var todayHYear = todayH.year;

    // Helper: check if a Hijri date has data
    function isDayChecked(hYear, hMonth, hDay) {
        if (isCongStreak) {
            var congKey = getCongregationKey(hYear, hMonth);
            var stored = localStorage.getItem(congKey);
            if (stored) {
                var parsed = JSON.parse(stored);
                if (parsed[prayerId] && parsed[prayerId][String(hDay)]) return true;
                if (parsed[prayerId] && parsed[prayerId][hDay]) return true;
            }
            return false;
        } else {
            var key = getStorageKey(type, hMonth, hYear);
            var stored = localStorage.getItem(key);
            if (stored) {
                var parsed = JSON.parse(stored);
                if (parsed[prayerId] && parsed[prayerId][String(hDay)]) return true;
                if (parsed[prayerId] && parsed[prayerId][hDay]) return true;
            }
            return false;
        }
    }

    // Check if today is already marked
    let startFromToday = isDayChecked(todayHYear, todayHMonth, todayHDay);

    if (!startFromToday) {
        // Go back one day
        checkDate = new Date(checkDate.getTime() - 86400000);
    }

    // Calculate current streak (going backwards)
    for (let i = 0; i < 730; i++) {
        var hDate = gregorianToHijri(checkDate);

        if (isDayChecked(hDate.year, hDate.month, hDate.day)) {
            currentStreak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
            break;
        }
    }

    // Calculate best streak (scan from Muharram 1 of current Hijri year)
    var scanStartG = hijriToGregorianDay1(state.currentHijriYear, 1);
    var todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    let scanDate = new Date(scanStartG.getFullYear(), scanStartG.getMonth(), scanStartG.getDate(), 12, 0, 0);

    while (scanDate <= todayNoon) {
        var hScan = gregorianToHijri(scanDate);

        if (isDayChecked(hScan.year, hScan.month, hScan.day)) {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
        } else {
            tempStreak = 0;
        }

        scanDate = new Date(scanDate.getTime() + 86400000);
    }

    return { current: currentStreak, best: bestStreak };
}

// ==================== STREAK RENDERING ====================

export function renderStreaks(type) {
    const grid = document.getElementById(`${type}StreakGrid`);
    if (!grid) return;
    grid.innerHTML = '';

    const prayers = getPrayersArray(type);

    prayers.forEach(prayer => {
        const streak = calculateStreak(type, prayer.id);

        const card = document.createElement('div');
        card.className = 'streak-card' + (streak.current >= 7 ? ' high-streak' : '');

        const fireEmoji = streak.current >= 7 ? '🔥' :
                          streak.current >= 3 ? '⚡' :
                          streak.current >= 1 ? '✨' : '💤';

        const isOnFire = streak.current >= 3;

        card.innerHTML = `
            <div class="streak-prayer-name">
                <span>${prayer.icon}</span>
                <span>${getPrayerName(prayer.id)}</span>
            </div>
            <div class="streak-value ${isOnFire ? 'fire' : ''}">${fireEmoji} ${streak.current}</div>
            <div class="streak-label">${t("consecutive_days")}</div>
            <div class="streak-best">${t("best_streak")} ${streak.best} ${t("days_word")}</div>
        `;

        grid.appendChild(card);
    });
}

// ==================== WINDOW EXPORTS ====================
// Expose all functions on window for inline event handlers

window.calculateStreak = calculateStreak;
window.renderStreaks = renderStreaks;
