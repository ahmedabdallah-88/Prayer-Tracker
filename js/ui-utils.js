/* Prayer Tracker PWA — ui-utils.js */
window.App = window.App || {};
window.App.UI = (function() {

    // ==================== TOAST NOTIFICATIONS ====================

    function showToast(msg, type, duration) {
        type = type || 'info';
        duration = duration || 2500;
        var container = document.getElementById('toastContainer');
        if (!container) return;
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = msg;
        container.appendChild(toast);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() { toast.classList.add('show'); });
        });

        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 350);
        }, duration);
    }

    function showConfirm(msg, opts) {
        opts = opts || {};
        return new Promise(function(resolve) {
            // Prevent stacking
            var existing = document.querySelector('.confirm-overlay');
            if (existing) { resolve(false); return; }

            var tFunc = window.App.I18n ? window.App.I18n.t : function(k) { return k; };
            var overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', msg);

            var dangerClass = opts.danger ? ' danger' : '';
            overlay.innerHTML =
                '<div class="confirm-box' + dangerClass + '">' +
                    '<div class="confirm-msg">' + msg + '</div>' +
                    '<div class="confirm-buttons">' +
                        '<button class="confirm-btn yes' + dangerClass + '" id="_cfYes">' + tFunc('yes') + '</button>' +
                        '<button class="confirm-btn no" id="_cfNo">' + tFunc('no_word') + '</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(overlay);

            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    overlay.classList.add('show');
                    // Focus the No button by default for destructive actions
                    var focusBtn = opts.danger ? overlay.querySelector('#_cfNo') : overlay.querySelector('#_cfYes');
                    if (focusBtn) focusBtn.focus();
                });
            });

            var cleaned = false;
            var cleanup = function(result) {
                if (cleaned) return;
                cleaned = true;
                overlay.classList.remove('show');
                document.body.style.overflow = '';
                document.removeEventListener('keydown', keyHandler);
                setTimeout(function() { overlay.remove(); }, 250);
                resolve(result);
            };

            var keyHandler = function(e) {
                if (e.key === 'Escape') { cleanup(false); }
                else if (e.key === 'Enter') { cleanup(true); }
            };
            document.addEventListener('keydown', keyHandler);

            // Lock body scroll
            document.body.style.overflow = 'hidden';

            overlay.querySelector('#_cfYes').onclick = function() { cleanup(true); };
            overlay.querySelector('#_cfNo').onclick = function() { cleanup(false); };
            overlay.onclick = function(e) { if (e.target === overlay) cleanup(false); };
        });
    }

    // ==================== SMART PRAYER REMINDERS ====================

    var reminderDismissed = {};

    function checkPrayerReminders() {
        var Storage = window.App.Storage;
        var Hijri = window.App.Hijri;
        var I18n = window.App.I18n;
        if (!Storage || !Storage.getActiveProfile()) return;
        if (Storage.getCurrentSection() !== 'fard') return;

        var PRAYER_REMINDER_TIMES = window.App.Config.PRAYER_REMINDER_TIMES;
        var now = new Date();
        var hour = now.getHours();
        var todayH = Hijri.gregorianToHijri(now);
        var todayHDay = todayH.day;
        var todayHMonth = todayH.month;
        var todayHYear = todayH.year;

        var currentHijriMonth = Hijri.getCurrentHijriMonth();
        var currentHijriYear = Hijri.getCurrentHijriYear();

        // Only check if we're viewing the current Hijri month
        if (currentHijriMonth !== todayHMonth || currentHijriYear !== todayHYear) {
            hideReminder();
            return;
        }

        var dataObj = Storage.getDataObject('fard');
        if (!dataObj[todayHMonth]) return;

        // Find unmarked prayers that should have been done by now
        var unmarked = [];
        var ids = Object.keys(PRAYER_REMINDER_TIMES);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            var times = PRAYER_REMINDER_TIMES[id];
            if (hour >= times.end) {
                var isMarked = dataObj[todayHMonth][id] && dataObj[todayHMonth][id][todayHDay];
                if (!isMarked && !reminderDismissed[id + '_' + todayHDay]) {
                    unmarked.push({ id: id, name: I18n.t(times.name_key) });
                }
            }
        }

        var bar = document.getElementById('prayerReminder');
        var msgEl = document.getElementById('reminderMsg');

        if (unmarked.length > 0) {
            var names = unmarked.map(function(p) { return p.name; }).join('، ');
            var currentLang = I18n.getCurrentLang();
            var msg = currentLang === 'ar'
                ? 'لم تُسجّل بعد: ' + names
                : 'Not yet logged: ' + names;
            if (msgEl) msgEl.textContent = msg;
            if (bar) bar.style.display = 'flex';
        } else {
            hideReminder();
        }
    }

    function hideReminder() {
        var bar = document.getElementById('prayerReminder');
        if (bar) bar.style.display = 'none';
    }

    function dismissReminder() {
        var PRAYER_REMINDER_TIMES = window.App.Config.PRAYER_REMINDER_TIMES;
        var now = new Date();
        var todayDay = now.getDate();
        var ids = Object.keys(PRAYER_REMINDER_TIMES);
        for (var i = 0; i < ids.length; i++) {
            reminderDismissed[ids[i] + '_' + todayDay] = true;
        }
        hideReminder();
    }

    function scrollToUnmarkedPrayer() {
        var Storage = window.App.Storage;
        var PRAYER_REMINDER_TIMES = window.App.Config.PRAYER_REMINDER_TIMES;
        var now = new Date();
        var todayH = window.App.Hijri.gregorianToHijri(now);
        var dataObj = Storage.getDataObject('fard');

        var ids = Object.keys(PRAYER_REMINDER_TIMES);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            var times = PRAYER_REMINDER_TIMES[id];
            if (now.getHours() >= times.end) {
                var isMarked = dataObj[todayH.month] && dataObj[todayH.month][id] && dataObj[todayH.month][id][todayH.day];
                if (!isMarked) {
                    var sections = document.querySelectorAll('#fardTrackerPrayersContainer .prayer-section');
                    var prayers = Storage.getPrayersArray('fard');
                    var idx = -1;
                    for (var j = 0; j < prayers.length; j++) {
                        if (prayers[j].id === id) { idx = j; break; }
                    }
                    if (idx >= 0 && sections[idx]) {
                        sections[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        sections[idx].style.transition = 'box-shadow 0.3s';
                        sections[idx].style.boxShadow = '0 0 20px rgba(245,158,11,0.5)';
                        (function(el) {
                            setTimeout(function() { el.style.boxShadow = ''; }, 2000);
                        })(sections[idx]);
                        break;
                    }
                }
            }
        }
    }

    // Check reminders every 5 minutes
    setInterval(checkPrayerReminders, 5 * 60 * 1000);

    // ==================== SWIPE NAVIGATION ====================

    var touchStartX = 0;
    var touchEndX = 0;
    var SWIPE_THRESHOLD = 60;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        var diff = touchStartX - touchEndX;
        if (Math.abs(diff) < SWIPE_THRESHOLD) return;

        var active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) return;

        var currentSection = window.App.Storage ? window.App.Storage.getCurrentSection() : 'fard';

        if (currentSection === 'fard' || currentSection === 'sunnah') {
            var trackerView = document.getElementById(currentSection + 'TrackerView');
            if (trackerView && trackerView.classList.contains('active')) {
                if (diff > 0) {
                    swipeMonth(currentSection, 1);
                } else {
                    swipeMonth(currentSection, -1);
                }
            }
        } else if (currentSection === 'fasting') {
            var volView = document.getElementById('fastingVoluntaryView');
            if (volView && volView.classList.contains('active')) {
                if (diff > 0) {
                    if (typeof window.changeFastingMonth === 'function') window.changeFastingMonth(1);
                    animateSwipe('left');
                } else {
                    if (typeof window.changeFastingMonth === 'function') window.changeFastingMonth(-1);
                    animateSwipe('right');
                }
            }
        }
    }

    function swipeMonth(type, delta) {
        if (typeof window.changeTrackerMonth === 'function') window.changeTrackerMonth(type, delta);
        animateSwipe(delta > 0 ? 'left' : 'right');
    }

    function animateSwipe(direction) {
        var containers = document.querySelectorAll('.prayers-container, #voluntaryFastingGrid');
        containers.forEach(function(c) {
            if (c.offsetParent !== null) {
                c.classList.remove('swipe-slide-left', 'swipe-slide-right');
                void c.offsetWidth;
                c.classList.add(direction === 'left' ? 'swipe-slide-left' : 'swipe-slide-right');
                setTimeout(function() { c.classList.remove('swipe-slide-left', 'swipe-slide-right'); }, 300);
            }
        });
    }

    // ==================== OFFLINE DETECTION ====================

    // iOS Safari fix
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.addEventListener('touchend', function(e) {
            var target = e.target.closest('[role="button"], .profile-card, .gender-option, .day-box, .month-card, .theme-option, .add-profile-btn, .form-btn');
            if (target && !target.disabled) {
                target.style.cursor = 'pointer';
            }
        }, { passive: true });
    }

    function updateOnlineStatus() {
        var bar = document.getElementById('offlineBar');
        if (bar) {
            bar.classList.toggle('show', !navigator.onLine);
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // ==================== DAY-BOX CLICK ANIMATION ====================

    function animateDayBox(element) {
        element.classList.remove('pop', 'ripple');
        void element.offsetWidth;
        element.classList.add('pop', 'ripple');
        setTimeout(function() { element.classList.remove('pop', 'ripple'); }, 500);
    }

    document.addEventListener('click', function(e) {
        var dayBox = e.target.closest('.day-box:not(.disabled)');
        if (dayBox) {
            animateDayBox(dayBox);
        }
    });

    // Keyboard support: Enter/Space triggers day-box, month-card, and other role="button" elements
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            var target = e.target;
            if (target && target.getAttribute('role') === 'button' && target.tagName !== 'BUTTON') {
                e.preventDefault();
                target.click();
            }
        }
    });

    // ==================== HAPTIC FEEDBACK ====================

    function hapticFeedback(type) {
        try {
            if (navigator.vibrate) {
                if (type === 'light') navigator.vibrate([30]);
                else if (type === 'medium') navigator.vibrate([50]);
                else if (type === 'success') navigator.vibrate([40, 60, 40]);
                else navigator.vibrate([35]);
            }
        } catch(e) {
            console.error('Vibrate error:', e);
        }

        try {
            if (type === 'success' || type === 'medium') {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = type === 'success' ? 880 : 660;
                gain.gain.value = 0.05;
                osc.start();
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.stop(ctx.currentTime + 0.1);
                setTimeout(function() { ctx.close(); }, 200);
            }
        } catch(e) {}
    }

    // ==================== PWA INSTALL BANNER ====================

    var deferredPrompt = null;

    function initInstallBanner() {
        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            if (!localStorage.getItem('pwa_install_dismissed')) {
                var banner = document.createElement('div');
                banner.id = 'installBanner';
                banner.innerHTML =
                    '<div style="position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,var(--primary),var(--primary-mid));' +
                        'padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;' +
                        'z-index:10000;box-shadow:0 -4px 20px rgba(0,0,0,0.15);border-top:3px solid var(--accent);direction:rtl;">' +
                        '<div style="color:white;font-family:\'Noto Kufi Arabic\',sans-serif;flex:1;">' +
                            '<div style="font-size:1.1em;font-weight:700;color:var(--accent);"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">mosque</span> تثبيت التطبيق</div>' +
                            '<div style="font-size:0.85em;opacity:0.9;margin-top:4px;">أضف متتبع الصلاة إلى شاشتك الرئيسية</div>' +
                        '</div>' +
                        '<button onclick="window.App.UI.promptInstall()" ' +
                            'style="background:var(--accent);color:var(--primary);border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:1em;cursor:pointer;font-family:\'Noto Kufi Arabic\',sans-serif;">تثبيت</button>' +
                        '<button onclick="document.getElementById(\'installBanner\').remove();localStorage.setItem(\'pwa_install_dismissed\',\'true\');" ' +
                            'style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:1.5em;cursor:pointer;padding:5px 8px;"><span class="material-symbols-rounded">close</span></button>' +
                    '</div>';
                document.body.appendChild(banner);
            }
        });
    }

    function promptInstall() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function() {
                deferredPrompt = null;
                var banner = document.getElementById('installBanner');
                if (banner) banner.remove();
            });
        }
    }

    return {
        showToast: showToast,
        showConfirm: showConfirm,
        checkPrayerReminders: checkPrayerReminders,
        hideReminder: hideReminder,
        dismissReminder: dismissReminder,
        scrollToUnmarkedPrayer: scrollToUnmarkedPrayer,
        handleSwipe: handleSwipe,
        swipeMonth: swipeMonth,
        animateSwipe: animateSwipe,
        updateOnlineStatus: updateOnlineStatus,
        animateDayBox: animateDayBox,
        hapticFeedback: hapticFeedback,
        initInstallBanner: initInstallBanner,
        promptInstall: promptInstall,
        getDeferredPrompt: function() { return deferredPrompt; }
    };
})();

// Backward compat globals
window.showToast = window.App.UI.showToast;
window.showConfirm = window.App.UI.showConfirm;
window.scrollToUnmarkedPrayer = window.App.UI.scrollToUnmarkedPrayer;
window.dismissReminder = window.App.UI.dismissReminder;
window.hapticFeedback = window.App.UI.hapticFeedback;
