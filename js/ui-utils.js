/* Prayer Tracker PWA — ui-utils.js */
window.App = window.App || {};
window.App.UI = (function() {

    // ==================== HTML ESCAPING ====================

    function escapeHTML(str) {
        if (typeof str !== 'string') return String(str);
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

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

    // ==================== DAY-BOX CLICK GLOW ====================

    function animateDayBox(element) {
        // Haptic only — no visual animation
        if (element.classList.contains('checked')) {
            haptic('double');
        } else if (element.classList.contains('congregation')) {
            haptic('heavy');
        } else {
            haptic('tap');
        }
    }

    // Border glow after state change — color matches NEW state
    function applyGlow(el) {
        var glow;
        if (el.classList.contains('congregation')) {
            glow = '0 0 0 3px rgba(212,160,60,0.35)';
        } else if (el.classList.contains('qada')) {
            glow = '0 0 0 3px rgba(193,87,78,0.35)';
        } else if (el.classList.contains('checked') || el.classList.contains('fasted')) {
            glow = '0 0 0 3px rgba(45,106,79,0.35)';
        } else {
            glow = '0 0 0 3px rgba(0,0,0,0.08)';
        }
        el.style.boxShadow = glow;
        setTimeout(function() { el.style.boxShadow = ''; }, 300);
    }

    document.addEventListener('click', function(e) {
        var dayBox = e.target.closest('.day-box:not(.disabled), .fasting-day-box:not(.disabled)');
        if (dayBox) {
            animateDayBox(dayBox);
            // Defer glow to next frame so state classes are applied first
            requestAnimationFrame(function() { applyGlow(dayBox); });
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

    var _sharedAudioCtx = null;
    function _getAudioContext() {
        if (_sharedAudioCtx && _sharedAudioCtx.state !== 'closed') return _sharedAudioCtx;
        try {
            _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { _sharedAudioCtx = null; }
        return _sharedAudioCtx;
    }

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
                var ctx = _getAudioContext();
                if (!ctx) return;
                if (ctx.state === 'suspended') ctx.resume();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = type === 'success' ? 880 : 660;
                gain.gain.value = 0.05;
                osc.start();
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.stop(ctx.currentTime + 0.1);
            }
        } catch(e) {}
    }

    // State-specific haptic patterns
    function haptic(pattern) {
        try {
            if (!navigator.vibrate) return;
            if (pattern === 'tap') navigator.vibrate(10);
            else if (pattern === 'double') navigator.vibrate([10, 50, 10]);
            else if (pattern === 'heavy') navigator.vibrate(30);
            else if (pattern === 'soft') navigator.vibrate(5);
            else navigator.vibrate(10);
        } catch(e) {}
    }

    // ==================== MONTH/YEAR PICKER ====================

    function showMonthYearPicker() {
        var Hijri = window.App.Hijri;
        var Storage = window.App.Storage;
        var I18n = window.App.I18n;
        var Config = window.App.Config;
        if (!Hijri || !Storage || !I18n) return;

        // Remove any existing picker
        var existing = document.getElementById('monthYearPickerOverlay');
        if (existing) existing.remove();

        var todayH = Hijri.getTodayHijri();
        var currentSection = Storage.getCurrentSection();
        var lang = I18n.getCurrentLang();
        var isAr = lang === 'ar';

        // Start with currently displayed month/year
        var selectedYear = Hijri.getCurrentHijriYear();
        var selectedMonth = Hijri.getCurrentHijriMonth();
        var pickerYear = selectedYear;

        var monthNamesAr = [
            '\u0645\u062d\u0631\u0645', '\u0635\u0641\u0631', '\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644', '\u0631\u0628\u064a\u0639 \u0627\u0644\u0622\u062e\u0631',
            '\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649', '\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629',
            '\u0631\u062c\u0628', '\u0634\u0639\u0628\u0627\u0646', '\u0631\u0645\u0636\u0627\u0646', '\u0634\u0648\u0627\u0644',
            '\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629', '\u0630\u0648 \u0627\u0644\u062d\u062c\u0629'
        ];
        var monthNamesEn = Config.hijriMonthNamesEn;

        // Build overlay
        var overlay = document.createElement('div');
        overlay.id = 'monthYearPickerOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;';

        var popup = document.createElement('div');
        popup.style.cssText = 'width:320px;background:var(--popup-bg, #fff);border-radius:24px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,0.15);font-family:Rubik,\'Noto Kufi Arabic\',sans-serif;direction:' + (isAr ? 'rtl' : 'ltr') + ';transform:scale(0.9);opacity:0;transition:transform 0.25s ease,opacity 0.25s ease;';
        overlay.appendChild(popup);

        // Animate in
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                popup.style.transform = 'scale(1)';
                popup.style.opacity = '1';
            });
        });

        function hasDataForMonth(year, month) {
            var prefix = Storage.getProfilePrefix();
            // Check fard data
            var fardKey = 'salah_tracker_' + prefix + 'fard_h' + year + '_' + month;
            if (localStorage.getItem(fardKey)) return true;
            // Check sunnah data
            var sunnahKey = 'salah_tracker_' + prefix + 'sunnah_h' + year + '_' + month;
            if (localStorage.getItem(sunnahKey)) return true;
            // Check azkar data
            var azkarKey = 'salah_azkar_' + prefix + 'h' + year + '_' + month;
            if (localStorage.getItem(azkarKey)) return true;
            // Check voluntary fasting
            var volKey = 'salah_volfasting_' + prefix + 'h' + year + '_' + month;
            if (localStorage.getItem(volKey)) return true;
            return false;
        }

        function renderPicker() {
            var monthNames = isAr ? monthNamesAr : monthNamesEn;
            var html = '';

            // Section 1: Year selector
            html += '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px;">';
            html += '<button id="myp_prevYear" style="width:36px;height:36px;border-radius:10px;background:rgba(128,128,128,0.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                '<span class="material-symbols-rounded" style="font-size:18px;color:var(--text-primary);">' + (isAr ? 'chevron_right' : 'chevron_left') + '</span></button>';
            html += '<span id="myp_yearLabel" style="font-size:24px;font-weight:800;color:var(--text-primary);font-family:Rubik,sans-serif;min-width:60px;text-align:center;">' + pickerYear + '</span>';
            html += '<button id="myp_nextYear" style="width:36px;height:36px;border-radius:10px;background:rgba(128,128,128,0.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                '<span class="material-symbols-rounded" style="font-size:18px;color:var(--text-primary);">' + (isAr ? 'chevron_left' : 'chevron_right') + '</span></button>';
            html += '</div>';

            // Section 2: Month grid
            html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">';
            for (var m = 1; m <= 12; m++) {
                var isCurrent = (pickerYear === todayH.year && m === todayH.month);
                var isSelected = (pickerYear === selectedYear && m === selectedMonth);
                var isFuture = (pickerYear === todayH.year && m > todayH.month) || (pickerYear > todayH.year);
                var hasData = hasDataForMonth(pickerYear, m);

                var bg = 'rgba(128,128,128,0.06)';
                var color = 'var(--text-primary)';
                var fontW = '600';
                var border = 'none';
                var opacity = '1';
                var cursor = 'pointer';

                if (isCurrent) {
                    bg = 'var(--primary)';
                    color = '#fff';
                    fontW = '800';
                } else if (isSelected && !isCurrent) {
                    bg = 'rgba(var(--primary-rgb),0.125)';
                    border = '2px solid var(--primary)';
                    color = 'var(--primary)';
                }
                if (isFuture) {
                    opacity = '0.3';
                    cursor = 'default';
                }

                html += '<div class="myp-month-cell" data-month="' + m + '" style="' +
                    'padding:10px 6px;border-radius:12px;text-align:center;font-size:13px;font-weight:' + fontW + ';' +
                    'background:' + bg + ';color:' + color + ';border:' + border + ';opacity:' + opacity + ';' +
                    'cursor:' + cursor + ';position:relative;user-select:none;transition:background 0.15s;' +
                    (isFuture ? 'pointer-events:none;' : '') + '">';
                html += monthNames[m - 1];
                if (hasData && !isCurrent) {
                    html += '<div style="width:4px;height:4px;border-radius:50%;background:var(--primary);margin:4px auto 0;"></div>';
                }
                html += '</div>';
            }
            html += '</div>';

            // Section 3: Quick actions
            html += '<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">';
            html += '<button id="myp_today" style="font-size:13px;font-weight:700;color:var(--primary);background:rgba(var(--primary-rgb),0.08);border:none;border-radius:10px;padding:8px 20px;cursor:pointer;font-family:Rubik,\'Noto Kufi Arabic\',sans-serif;">' +
                (isAr ? '\u0627\u0644\u064a\u0648\u0645' : 'Today') + '</button>';
            html += '<button id="myp_cancel" style="font-size:13px;font-weight:600;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:8px 12px;font-family:Rubik,\'Noto Kufi Arabic\',sans-serif;">' +
                (isAr ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel') + '</button>';
            html += '</div>';

            // Section 4: Info text
            html += '<p style="font-size:10px;color:var(--text-muted);text-align:center;margin:8px 0 0;">' +
                (isAr ? '\u064a\u0645\u0643\u0646\u0643 \u0627\u062e\u062a\u064a\u0627\u0631 \u0623\u064a \u0634\u0647\u0631 \u0648\u0633\u0646\u0629 \u0644\u062a\u0633\u062c\u064a\u0644 \u0635\u0644\u0648\u0627\u062a \u0627\u0644\u0642\u0636\u0627\u0621'
                     : 'Select any month and year to log Qada prayers') + '</p>';

            popup.innerHTML = html;

            // Attach events
            popup.querySelector('#myp_prevYear').onclick = function(e) {
                e.stopPropagation();
                if (pickerYear > 1400) { pickerYear--; renderPicker(); }
            };
            popup.querySelector('#myp_nextYear').onclick = function(e) {
                e.stopPropagation();
                if (pickerYear < 1500) { pickerYear++; renderPicker(); }
            };
            popup.querySelector('#myp_today').onclick = function(e) {
                e.stopPropagation();
                navigateToMonth(todayH.year, todayH.month);
                closePopup();
            };
            popup.querySelector('#myp_cancel').onclick = function(e) {
                e.stopPropagation();
                closePopup();
            };

            // Month cell clicks
            var cells = popup.querySelectorAll('.myp-month-cell');
            cells.forEach(function(cell) {
                cell.onclick = function(e) {
                    e.stopPropagation();
                    var m = parseInt(cell.getAttribute('data-month'));
                    navigateToMonth(pickerYear, m);
                    closePopup();
                };
            });
        }

        function navigateToMonth(year, month) {
            var section = Storage.getCurrentSection();

            if (section === 'fard' || section === 'sunnah') {
                Hijri.setCurrentHijriMonth(month);
                Hijri.setCurrentHijriYear(year);
                Storage.setCurrentMonth(month);
                Storage.setCurrentYear(year);
                var elMonth = document.getElementById(section + 'TrackerMonthSelect');
                var elYear = document.getElementById(section + 'TrackerYearInput');
                if (elMonth) elMonth.value = month;
                if (elYear) elYear.value = year;
                Storage.loadAllData(section);
                if (typeof window.updateTrackerView === 'function') window.updateTrackerView(section);
            } else if (section === 'fasting') {
                var fmEl = document.getElementById('fastingMonthSelect');
                var fyEl = document.getElementById('fastingYearVoluntary');
                if (fmEl) fmEl.value = month;
                if (fyEl) fyEl.value = year;
                if (typeof window.updateVoluntaryFasting === 'function') window.updateVoluntaryFasting();
            } else if (section === 'azkar') {
                var amEl = document.getElementById('azkarTrackerMonth');
                var ayEl = document.getElementById('azkarTrackerYear');
                if (amEl) amEl.value = month;
                if (ayEl) ayEl.value = year;
                if (typeof window.updateAzkarTracker === 'function') window.updateAzkarTracker();
            }
        }

        function closePopup() {
            popup.style.transform = 'scale(0.9)';
            popup.style.opacity = '0';
            setTimeout(function() { overlay.remove(); }, 200);
        }

        // Close on outside click
        overlay.onclick = function(e) {
            if (e.target === overlay) closePopup();
        };

        // Close on Escape
        var escHandler = function(e) {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        document.body.appendChild(overlay);
        renderPicker();
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
        updateOnlineStatus: updateOnlineStatus,
        animateDayBox: animateDayBox,
        applyGlow: applyGlow,
        hapticFeedback: hapticFeedback,
        haptic: haptic,
        initInstallBanner: initInstallBanner,
        promptInstall: promptInstall,
        showMonthYearPicker: showMonthYearPicker,
        getDeferredPrompt: function() { return deferredPrompt; },
        escapeHTML: escapeHTML
    };
})();

// Backward compat globals
window.showToast = window.App.UI.showToast;
window.showConfirm = window.App.UI.showConfirm;
window.scrollToUnmarkedPrayer = window.App.UI.scrollToUnmarkedPrayer;
window.dismissReminder = window.App.UI.dismissReminder;
window.hapticFeedback = window.App.UI.hapticFeedback;
window.haptic = window.App.UI.haptic;
window.showMonthYearPicker = window.App.UI.showMonthYearPicker;
