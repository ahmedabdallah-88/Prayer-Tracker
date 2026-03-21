// ==================== APP ENTRY POINT ====================
// Main entry module - imports all modules and initializes the app

import { state, fardPrayers, sunnahPrayers, monthNames } from './state.js';
import { gregorianToHijri, getTodayHijri, getHijriDaysInMonth, getHijriMonthName } from './hijri-calendar.js';
import { getPrayersArray, getDataObject, loadAllData, saveMonthData, getStorageKey, getPrayerName, getDaysInMonth, isFutureDate } from './prayer-data.js';
import { switchSection, switchView } from './navigation.js';
import { updateTrackerView, renderTrackerMonth, toggleDay, handleDayClick, updateTrackerStats, changeTrackerMonth, resetTrackerMonth, resetMonth, batchMarkPrayer } from './tracker.js';
import { updateDashboard, updateCharts, updateYearlyView, backToYearly } from './dashboard.js';
import { calculateStreak, renderStreaks } from './streaks.js';
import { switchFastingView, updateFastingView, updateVoluntaryFasting, changeFastingMonth, resetFasting, resetVoluntaryFasting, updateFastingDashboard } from './fasting.js';
import { toggleCongregation, updateCongregationStats } from './congregation.js';
import { toggleExemptMode } from './exempt-days.js';
import { showProfileScreen, selectProfile, editProfile, deleteProfile, saveProfile, showProfileForm, hideProfileForm, selectGender } from './profiles.js';
import { exportData, importData, handleImport, exportOldData, handleImportOnProfile } from './export-import.js';
import { t, applyLang, toggleLang } from './i18n.js';
import { setTheme, toggleThemeMenu, loadTheme } from './theme.js';
import { fetchPrayerTimes, refreshPrayerTimes, startPrayerTimesMonitor } from './prayer-times.js';
import { togglePrayerNotifications } from './notifications.js';
import { renderQadaReport } from './qada.js';
import { showToast, showConfirm, hapticFeedback, toggleMonthDays, showHijriOverrideDialog, scrollToUnmarkedPrayer, dismissReminder, initSwipeHandlers, initDayBoxAnimation } from './ui-utils.js';
import { switchTab, updateShellBar, initFiori } from './fiori.js';
import { registerServiceWorker, applyUpdate } from './pwa.js';

// ==================== INIT ====================

function init() {
    // Set Hijri state
    var todayH = getTodayHijri();
    state.currentHijriMonth = todayH.month;
    state.currentHijriYear = todayH.year;
    state.currentMonth = state.currentHijriMonth;
    state.currentYear = state.currentHijriYear;

    // Initialize all year/month inputs with Hijri values
    var inputs = [
        ['fardDashboardYear', state.currentHijriYear],
        ['fardYearlyYear', state.currentHijriYear],
        ['fardTrackerMonthSelect', state.currentHijriMonth],
        ['fardTrackerYearInput', state.currentHijriYear],
        ['sunnahDashboardYear', state.currentHijriYear],
        ['sunnahYearlyYear', state.currentHijriYear],
        ['sunnahTrackerMonthSelect', state.currentHijriMonth],
        ['sunnahTrackerYearInput', state.currentHijriYear]
    ];
    inputs.forEach(function(pair) {
        var el = document.getElementById(pair[0]);
        if (el) el.value = pair[1];
    });

    loadAllData('fard');
    loadAllData('sunnah');

    // Load theme
    loadTheme();

    // Apply language
    applyLang();

    // Initialize Fiori shell overrides
    initFiori();

    // Auto-load last profile
    var lastProfileId = localStorage.getItem('salah_active_profile');
    if (lastProfileId) {
        var profiles = JSON.parse(localStorage.getItem('salah_profiles') || '[]');
        var profile = profiles.find(function(p) { return p.id === lastProfileId; });
        if (profile) {
            state.activeProfile = profile;
            // Apply profile UI and update shell bar
            import('./profiles.js').then(function(mod) {
                if (mod.applyProfileUI) mod.applyProfileUI();
                updateShellBar();
            });
            loadAllData('fard');
            loadAllData('sunnah');
            updateTrackerView('fard');
        } else {
            showProfileScreen();
        }
    } else {
        showProfileScreen();
    }

    updateTrackerView('fard');
}

// ==================== DOM READY ====================

// Initialize swipe handlers
initSwipeHandlers();

// Initialize day-box click animation
initDayBoxAnimation();

// iOS Safari fix
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    document.addEventListener('touchend', function(e) {
        var target = e.target.closest('[role="button"], .profile-card, .gender-option, .day-box, .month-card, .theme-option, .add-profile-btn, .form-btn');
        if (target && !target.disabled) {
            target.style.cursor = 'pointer';
        }
    }, { passive: true });
}

// Offline detection
function updateOnlineStatus() {
    var bar = document.getElementById('offlineBar');
    if (bar) {
        bar.classList.toggle('show', !navigator.onLine);
    }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Check reminders every 5 minutes
setInterval(function() {
    import('./ui-utils.js').then(function(mod) {
        if (mod.checkPrayerReminders) mod.checkPrayerReminders();
    });
}, 5 * 60 * 1000);

// Init app
init();

// Start prayer times monitor after brief delay
setTimeout(function() {
    if (state.activeProfile) startPrayerTimesMonitor();
}, 1500);

// Register service worker
registerServiceWorker();

// Re-check prayer times when app becomes visible
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && state.activeProfile) {
        import('./prayer-times.js').then(function(mod) {
            mod.renderPrayerTimes();
        });
        import('./notifications.js').then(function(mod) {
            mod.checkPrayerTimeNotifications();
        });
    }
});

// Schedule SW notifications when app goes to background
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden' && state.notificationsEnabled) {
        import('./notifications.js').then(function(mod) {
            mod.scheduleSWNotifications();
        });
    }
});

// PWA install prompt
window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    state.deferredPrompt = e;
    window._pwaInstallPrompt = e;
    // Always show install banner (clear previous dismiss)
    {
        var banner = document.createElement('div');
        banner.id = 'installBanner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,var(--primary-dark),var(--primary-medium));padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:10000;box-shadow:0 -4px 20px rgba(0,0,0,0.3);border-top:3px solid var(--accent);direction:rtl;';

        var textDiv = document.createElement('div');
        textDiv.style.cssText = 'color:white;font-family:Cairo,sans-serif;flex:1;';
        textDiv.innerHTML = '<div style="font-size:1.1em;font-weight:700;color:var(--accent);">🕌 تثبيت التطبيق</div>' +
            '<div style="font-size:0.85em;opacity:0.9;margin-top:4px;">أضف متتبع الصلاة إلى شاشتك الرئيسية</div>';

        var installBtn = document.createElement('button');
        installBtn.textContent = 'تثبيت';
        installBtn.style.cssText = 'background:var(--accent);color:var(--primary-dark);border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:1em;cursor:pointer;font-family:Cairo,sans-serif;';
        installBtn.addEventListener('click', function() {
            if (state.deferredPrompt) {
                state.deferredPrompt.prompt();
                state.deferredPrompt.userChoice.then(function() {
                    state.deferredPrompt = null;
                    var b = document.getElementById('installBanner');
                    if (b) b.remove();
                });
            }
        });

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2715';
        closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.7);font-size:1.5em;cursor:pointer;padding:5px 8px;';
        closeBtn.addEventListener('click', function() {
            var b = document.getElementById('installBanner');
            if (b) b.remove();
            localStorage.setItem('pwa_install_dismissed', 'true');
        });

        banner.appendChild(textDiv);
        banner.appendChild(installBtn);
        banner.appendChild(closeBtn);
        document.body.appendChild(banner);
    }
});

// Expose remaining globals for inline onclick handlers
window.selectGender = selectGender;
window.saveProfile = saveProfile;
window.showProfileForm = showProfileForm;
window.hideProfileForm = hideProfileForm;
window.applyUpdate = applyUpdate;
window.switchTab = switchTab;
