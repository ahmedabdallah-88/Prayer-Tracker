/* Prayer Tracker PWA — app.js (MUST load last) */
window.App = window.App || {};
window.App.Main = (function() {

    // ==================== MERGED INIT ====================
    // Combines: base init + _origInit (profile loading + migration)

    function init() {
        var Hijri = window.App.Hijri;
        var Storage = window.App.Storage;
        var Profiles = window.App.Profiles;
        var DataIO = window.App.DataIO;

        // --- Profile check (from _origInit) ---
        var profiles = Profiles.getProfiles();
        var activeId = Profiles.getActiveProfileId();

        if (profiles.length === 0) {
            Profiles.showProfileScreen();
            return;
        }

        var activeProfile = null;
        if (activeId) {
            activeProfile = profiles.find(function(p) { return p.id === activeId; });
        }
        if (!activeProfile && profiles.length > 0) {
            activeProfile = profiles[0];
            Profiles.setActiveProfileId(activeProfile.id);
        }

        if (activeProfile) {
            // Sync active profile to both Profiles and Storage modules
            Profiles.setActiveProfile(activeProfile);
            Storage.setActiveProfile(activeProfile);

            Profiles.hideProfileScreen();
            Profiles.applyProfileUI();
        }

        // --- Base init ---
        var todayH = Hijri.getTodayHijri();
        Hijri.setCurrentHijriMonth(todayH.month);
        Hijri.setCurrentHijriYear(todayH.year);
        Storage.setCurrentMonth(todayH.month);
        Storage.setCurrentYear(todayH.year);

        // Initialize all year/month inputs with Hijri values
        var el;
        el = document.getElementById('fardDashboardYear');    if (el) el.value = todayH.year;
        el = document.getElementById('fardYearlyYear');       if (el) el.value = todayH.year;
        el = document.getElementById('fardTrackerMonthSelect'); if (el) el.value = todayH.month;
        el = document.getElementById('fardTrackerYearInput');  if (el) el.value = todayH.year;

        el = document.getElementById('sunnahDashboardYear');   if (el) el.value = todayH.year;
        el = document.getElementById('sunnahYearlyYear');      if (el) el.value = todayH.year;
        el = document.getElementById('sunnahTrackerMonthSelect'); if (el) el.value = todayH.month;
        el = document.getElementById('sunnahTrackerYearInput'); if (el) el.value = todayH.year;

        el = document.getElementById('azkarTrackerMonth');     if (el) el.value = todayH.month;
        el = document.getElementById('azkarTrackerYear');      if (el) el.value = todayH.year;
        el = document.getElementById('azkarDashboardYear');    if (el) el.value = todayH.year;
        el = document.getElementById('azkarYearlyYear');       if (el) el.value = todayH.year;

        Storage.loadAllData('fard');
        Storage.loadAllData('sunnah');

        // Update shell bar date — show Hijri + Gregorian (language-aware)
        var shellDate = document.getElementById('shellDateText');
        if (shellDate) {
            var lang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
            var hijriMonthName = lang === 'en'
                ? (window.App.Config.hijriMonthNamesEn[todayH.month - 1] || '')
                : (window.App.Config.hijriMonthNamesAr[todayH.month - 1] || '');
            var now = new Date();
            var gregMonthName = lang === 'en'
                ? (window.App.Config.gregorianMonthNamesEn[now.getMonth()] || '')
                : (window.App.Config.gregorianMonthNamesAr[now.getMonth()] || '');
            var eraLabel = lang === 'en' ? 'AH' : '\u0647\u0640';
            shellDate.innerHTML = '<span class="material-symbols-rounded" style="font-size:12px;vertical-align:middle;">calendar_today</span> ' + hijriMonthName + ' ' + todayH.year + ' ' + eraLabel + ' \u2014 ' + gregMonthName + ' ' + now.getFullYear();
        }

        // Defer initial render to ensure DOM is fully ready
        setTimeout(function() {
            try {
                if (typeof window.updateTrackerView === 'function') {
                    window.updateTrackerView('fard');
                }
            } catch(e) {
                console.error('Initial render error:', e);
            }
        }, 0);

        // Prayer reminders (from _origInit)
        setTimeout(function() {
            if (window.App.UI && window.App.UI.checkPrayerReminders) {
                window.App.UI.checkPrayerReminders();
            }
        }, 1000);

        // Notification reminder banner (shows if neither before/after enabled)
        setTimeout(function() {
            if (window.App.Notifications && window.App.Notifications.updateReminderBanner) {
                window.App.Notifications.updateReminderBanner();
            }
        }, 2000);

        // Onboarding for returning users (profile already loaded via init)
        // Wait for splash (if first visit) + render to finish
        var splashDelay = document.getElementById('splashScreen') ? 11000 : 800;
        setTimeout(function() {
            if (window.App.Onboarding && window.App.Onboarding.shouldShow()) {
                window.App.Onboarding.start();
            }
        }, splashDelay);
    }

    // ==================== FIORI: switchTab ====================

    function switchTab(tab) {
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
        document.querySelectorAll('.tab-item').forEach(function(t) {
            t.classList.remove('active', 'tab-bounce');
            t.setAttribute('aria-selected', 'false');
        });
        var tabEl = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
        if (tabEl) {
            tabEl.classList.add('active', 'tab-bounce');
            tabEl.setAttribute('aria-selected', 'true');
            // Remove bounce class after animation completes
            setTimeout(function() { tabEl.classList.remove('tab-bounce'); }, 400);
        }
        if (typeof window.switchSection === 'function') {
            window.switchSection(tab);
        }
    }

    // ==================== FIORI: updateShellBar ====================

    function updateShellBar() {
        var activeProfile = window.App.Storage.getActiveProfile();
        var profileBtn = document.getElementById('shellProfileBtn');
        if (!activeProfile) {
            if (profileBtn) profileBtn.style.display = 'none';
            return;
        }
        if (profileBtn) profileBtn.style.display = 'flex';

        // Update profile settings card if visible
        var psName = document.getElementById('psName');
        var psDetails = document.getElementById('psDetails');
        if (psName) psName.textContent = activeProfile.name;
        if (psDetails) {
            var t = window.App.I18n ? window.App.I18n.t : function(k){return k;};
            var isChild = activeProfile.age < 12;
            var genderLabel = activeProfile.gender === 'female' ? (isChild ? t('child_f') : t('female')) : (isChild ? t('child_m') : t('male'));
            psDetails.textContent = genderLabel + ' \u00B7 ' + activeProfile.age + ' ' + t('years_old');
        }

        // Update shell bar date (language-aware)
        var shellDate = document.getElementById('shellDateText');
        if (shellDate && window.App.Hijri) {
            var todayH = window.App.Hijri.getTodayHijri();
            var lang = window.App.I18n ? window.App.I18n.getCurrentLang() : 'ar';
            var hijriMonthName = lang === 'en'
                ? (window.App.Config.hijriMonthNamesEn[todayH.month - 1] || '')
                : (window.App.Config.hijriMonthNamesAr[todayH.month - 1] || '');
            var now = new Date();
            var gregMonthName = lang === 'en'
                ? (window.App.Config.gregorianMonthNamesEn[now.getMonth()] || '')
                : (window.App.Config.gregorianMonthNamesAr[now.getMonth()] || '');
            var eraLabel = lang === 'en' ? 'AH' : '\u0647\u0640';
            shellDate.innerHTML = '<span class="material-symbols-rounded" style="font-size:12px;vertical-align:middle;">calendar_today</span> ' + hijriMonthName + ' ' + todayH.year + ' ' + eraLabel + ' \u2014 ' + gregMonthName + ' ' + now.getFullYear();
        }
    }

    function openProfileSettings() {
        var overlay = document.getElementById('profileSettingsOverlay');
        if (overlay) {
            overlay.classList.add('show');
            updateShellBar();
        }
    }

    function closeProfileSettings() {
        var overlay = document.getElementById('profileSettingsOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    // ==================== applyUpdate ====================

    function applyUpdate() {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(function(reg) {
                if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });
            setTimeout(function() { window.location.reload(); }, 500);
        } else {
            window.location.reload();
        }
    }

    // ==================== STARTUP SEQUENCE ====================

    function startup() {
        var DataIO = window.App.DataIO;

        // Run migrations before init
        if (DataIO && DataIO.migrateGregorianToHijri) {
            DataIO.migrateGregorianToHijri();
        }
        if (DataIO && DataIO.migrateExistingData) {
            DataIO.migrateExistingData();
        }

        // Load theme + language (always, even during splash)
        if (window.App.Themes && window.App.Themes.loadTheme) {
            window.App.Themes.loadTheme();
        }
        if (window.App.I18n && window.App.I18n.applyLang) {
            window.App.I18n.applyLang();
        }

        // If splash is active, defer init + monitors until splash finishes
        if (window._splashActive) {
            window._onSplashDone = function() {
                init();
                startPostInitTasks();
                // Fade in app content: add transition class, then remove hiding class
                document.body.classList.add('app-revealing');
                requestAnimationFrame(function() {
                    document.body.classList.remove('splash-active');
                    setTimeout(function() {
                        document.body.classList.remove('app-revealing');
                    }, 350);
                });
            };
        } else {
            // No splash (return visit) — init immediately
            init();
            startPostInitTasks();
        }

        // Clamp year inputs to valid Hijri range (1400-1500)
        document.addEventListener('input', function(e) {
            var el = e.target;
            if (el.type === 'number' && (el.id.indexOf('Year') !== -1 || el.id.indexOf('year') !== -1)) {
                var val = parseInt(el.value);
                if (isNaN(val)) return;
                var minVal = parseInt(el.min) || 1400;
                var maxVal = parseInt(el.max) || 1500;
                if (val > maxVal) { el.value = maxVal; }
                if (val < minVal && el.value.length >= 4) { el.value = minVal; }
            }
        });

        // PWA Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('./service-worker.js')
                    .then(function(reg) {

                        // Listen for notification clicks from SW
                        navigator.serviceWorker.addEventListener('message', function(event) {
                            if (event.data && event.data.type === 'notification-click') {
                                window.focus();
                                if (event.data.tag && event.data.tag.indexOf('prayer-after-') !== -1) {
                                    try { if (typeof window.scrollToUnmarkedPrayer === 'function') window.scrollToUnmarkedPrayer(); } catch(e) {}
                                }
                            }
                        });

                        // Auto-apply SW update immediately (no manual click needed)
                        reg.addEventListener('updatefound', function() {
                            var newWorker = reg.installing;
                            newWorker.addEventListener('statechange', function() {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                }
                            });
                        });

                        // Auto-reload when new SW takes control
                        var swRefreshing = false;
                        navigator.serviceWorker.addEventListener('controllerchange', function() {
                            if (!swRefreshing) {
                                swRefreshing = true;
                                window.location.reload();
                            }
                        });

                        // Force check for SW updates on every page load
                        reg.update();

                        // Register periodic background sync
                        if ('periodicSync' in reg) {
                            navigator.permissions.query({ name: 'periodic-background-sync' }).then(function(status) {
                                if (status.state === 'granted') {
                                    reg.periodicSync.register('prayer-check', {
                                        minInterval: 15 * 60 * 1000
                                    });
                                }
                            }).catch(function() {});
                        }
                    })
                    .catch(function(err) { console.error('SW registration failed:', err); });
            });
        }

        // Re-check prayer times when app becomes visible
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                var activeProfile = window.App.Storage.getActiveProfile();
                if (activeProfile) {
                    if (typeof window.renderPrayerTimes === 'function') window.renderPrayerTimes();
                    if (window.App.Notifications) {
                        window.App.Notifications.checkBeforeAthan();
                        window.App.Notifications.checkAfterAthan();
                    }
                }
            }
        });

        // Schedule SW notifications when app goes to background
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                if (window.App.Notifications) {
                    var N = window.App.Notifications;
                    if (N.isBeforeEnabled() || N.isAfterEnabled()) {
                        N.scheduleSWNotifications();
                    }
                }
            }
        });

        // PWA install banner
        if (window.App.UI && window.App.UI.initInstallBanner) {
            window.App.UI.initInstallBanner();
        }

        // Onboarding is triggered from selectProfile() in profiles.js
        // AFTER profile is loaded and main UI is fully rendered.
    }

    // ==================== POST-INIT TASKS (deferred if splash active) ====================

    function startPostInitTasks() {
        // Info tooltip buttons on static HTML cards
        setTimeout(function() {
            if (window.App.InfoTooltips && window.App.InfoTooltips.initStaticButtons) {
                window.App.InfoTooltips.initStaticButtons();
            }
        }, 500);

        // Prayer times display + notification monitor
        setTimeout(function() {
            var activeProfile = window.App.Storage.getActiveProfile();
            if (activeProfile) {
                if (window.App.PrayerTimes && window.App.PrayerTimes.startPrayerTimesMonitor) {
                    window.App.PrayerTimes.startPrayerTimesMonitor();
                }
                if (window.App.Notifications && window.App.Notifications.startMonitor) {
                    window.App.Notifications.startMonitor();
                }
            }
        }, 1500);
    }

    return {
        init: init,
        startup: startup,
        switchTab: switchTab,
        updateShellBar: updateShellBar,
        openProfileSettings: openProfileSettings,
        closeProfileSettings: closeProfileSettings,
        applyUpdate: applyUpdate
    };
})();

// Backward compat globals
window.switchTab = window.App.Main.switchTab;
window.updateShellBar = window.App.Main.updateShellBar;
window.openProfileSettings = window.App.Main.openProfileSettings;
window.closeProfileSettings = window.App.Main.closeProfileSettings;
window.applyUpdate = window.App.Main.applyUpdate;

// ==================== RUN STARTUP ====================
window.App.Main.startup();
