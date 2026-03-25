/* Prayer Tracker PWA — notifications.js */
window.App = window.App || {};
window.App.Notifications = (function() {

    // ==================== STATE ====================

    var notificationsEnabled = localStorage.getItem('salah_notif_enabled') === 'true';
    var notifSentToday = {};
    var prayerTimesCheckInterval = null;

    // ==================== CROSS-MODULE HELPERS ====================

    function t(key) {
        return window.App.I18n && window.App.I18n.t ? window.App.I18n.t(key) : key;
    }

    function getCurrentLang() {
        return (window.App.I18n && window.App.I18n.getCurrentLang)
            ? window.App.I18n.getCurrentLang()
            : (localStorage.getItem('salah_lang') || 'ar');
    }

    function showToast(msg, type, duration) {
        if (window.App.UI && window.App.UI.showToast) {
            window.App.UI.showToast(msg, type, duration);
        }
    }

    function getPrayerName(id) {
        if (window.App.I18n && window.App.I18n.getPrayerName) {
            return window.App.I18n.getPrayerName(id);
        }
        return window.getPrayerName ? window.getPrayerName(id) : id;
    }

    function gregorianToHijri(d) {
        if (window.App.Hijri && window.App.Hijri.gregorianToHijri) {
            return window.App.Hijri.gregorianToHijri(d);
        }
        return window.gregorianToHijri ? window.gregorianToHijri(d) : null;
    }

    function getDataObject(type) {
        if (window.App.Storage && window.App.Storage.getDataObject) {
            return window.App.Storage.getDataObject(type);
        }
        return window.getDataObject ? window.getDataObject(type) : {};
    }

    function getActiveProfile() {
        if (window.App.Storage && window.App.Storage.getActiveProfile) {
            return window.App.Storage.getActiveProfile();
        }
        return window.activeProfile || null;
    }

    function getPrayerTimesData() {
        if (window.App.PrayerTimes && window.App.PrayerTimes.getPrayerTimesData) {
            return window.App.PrayerTimes.getPrayerTimesData();
        }
        return window.prayerTimesData || null;
    }

    function parseTimeToMinutes(timeStr) {
        if (window.App.PrayerTimes && window.App.PrayerTimes.parseTimeToMinutes) {
            return window.App.PrayerTimes.parseTimeToMinutes(timeStr);
        }
        if (window.parseTimeToMinutes) {
            return window.parseTimeToMinutes(timeStr);
        }
        // Inline fallback
        if (!timeStr) return 0;
        var clean = timeStr.replace(/\s*\(.*\)/, '').trim();
        var parts = clean.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    function fetchPrayerTimes(force) {
        if (window.App.PrayerTimes && window.App.PrayerTimes.fetchPrayerTimes) {
            return window.App.PrayerTimes.fetchPrayerTimes(force);
        }
        if (window.fetchPrayerTimes) {
            return window.fetchPrayerTimes(force);
        }
    }

    function renderPrayerTimes() {
        if (window.App.PrayerTimes && window.App.PrayerTimes.renderPrayerTimes) {
            return window.App.PrayerTimes.renderPrayerTimes();
        }
        if (window.renderPrayerTimes) {
            return window.renderPrayerTimes();
        }
    }

    // ==================== PUSH NOTIFICATIONS ====================

    function updateNotifButton() {
        var btn = document.getElementById('notifToggleBtn');
        if (!btn) return;
        var currentLang = getCurrentLang();
        if (notificationsEnabled) {
            btn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">notifications_active</span>';
            btn.style.background = 'rgba(5,150,105,0.15)';
            btn.style.borderColor = '#059669';
            btn.title = currentLang === 'ar' ? 'التنبيهات مفعّلة - اضغط لإيقاف' : 'Notifications ON - tap to disable';
        } else {
            btn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">notifications_off</span>';
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.title = currentLang === 'ar' ? 'تفعيل التنبيهات' : 'Enable notifications';
        }
    }

    async function togglePrayerNotifications() {
        var currentLang = getCurrentLang();
        if (notificationsEnabled) {
            // Disable
            notificationsEnabled = false;
            localStorage.setItem('salah_notif_enabled', 'false');
            showToast(t('notif_disabled'), 'info');
        } else {
            // Check iOS standalone mode
            var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            var isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

            if (isIOS && !isStandalone) {
                showToast(currentLang === 'ar'
                    ? 'للتنبيهات على iOS: أضف التطبيق للشاشة الرئيسية أولاً (مشاركة ← إضافة للشاشة الرئيسية)'
                    : 'For iOS notifications: Add to Home Screen first (Share → Add to Home Screen)', 'warning', 6000);
                return;
            }

            // Request permission
            if (!('Notification' in window)) {
                showToast(currentLang === 'ar'
                    ? 'المتصفح لا يدعم التنبيهات — جرّب Chrome أو فعّل التطبيق من الشاشة الرئيسية'
                    : 'Notifications not supported — try Chrome or install as PWA', 'error', 5000);
                return;
            }

            var permission = Notification.permission;
            if (permission === 'denied') {
                showToast(currentLang === 'ar' ? 'تم حظر التنبيهات — فعّلها من إعدادات المتصفح' : 'Notifications blocked — enable in browser settings', 'error');
                return;
            }

            if (permission !== 'granted') {
                permission = await Notification.requestPermission();
            }

            if (permission === 'granted') {
                notificationsEnabled = true;
                localStorage.setItem('salah_notif_enabled', 'true');
                showToast(t('notif_enabled'), 'success');

                // Show test notification via SW
                sendPrayerNotification(
                    currentLang === 'ar' ? 'متتبع الصلاة' : 'Prayer Tracker',
                    'test'
                );
            } else {
                showToast(currentLang === 'ar' ? 'لم يتم السماح بالتنبيهات' : 'Notification permission not granted', 'warning');
            }
        }
        updateNotifButton();
    }

    async function sendPrayerNotification(prayerName, type) {
        if (!notificationsEnabled) return;
        if (Notification.permission !== 'granted') return;

        var currentLang = getCurrentLang();
        var title, body, tag;

        if (type === 'test') {
            title = prayerName;
            body = t('notif_test_body');
            tag = 'prayer-test';
        } else if (type === 'before') {
            title = t('notif_before_title');
            body = (currentLang === 'ar' ? 'يقترب وقت صلاة ' + prayerName + ' — استعد!' : prayerName + ' is coming in ~20 minutes');
            tag = 'prayer-before-' + prayerName;
        } else {
            title = t('notif_after_title');
            body = (currentLang === 'ar' ? 'مرّ وقت صلاة ' + prayerName + ' — سجّل صلاتك' : prayerName + ' time has passed — log your prayer');
            tag = 'prayer-after-' + prayerName;
        }

        // Play notification sound (pleasant chime)
        playNotificationSound(type);

        try {
            // Try Service Worker notification first (works on mobile PWA)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                var reg = await navigator.serviceWorker.ready;
                await reg.showNotification(title, {
                    body: body,
                    icon: 'icons/icon-192x192.png',
                    badge: 'icons/icon-72x72.png',
                    tag: tag,
                    renotify: true,
                    vibrate: [200, 100, 200],
                    requireInteraction: type !== 'test',
                    data: { url: './' }
                });
                return;
            }

            // Fallback to regular Notification API (desktop)
            new Notification(title, {
                body: body,
                icon: 'icons/icon-192x192.png',
                tag: tag,
                renotify: true
            });
        } catch(e) {
            console.error('Notification error:', e);
            // Last resort: in-app toast
            showToast(title + ': ' + body, 'info', 5000);
        }
    }

    // ==================== NOTIFICATION SOUND (Web Audio) ====================

    function playNotificationSound(type) {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var now = ctx.currentTime;

            if (type === 'before') {
                // Rising two-tone chime (prayer approaching)
                playTone(ctx, 523, now, 0.15, 0.08);        // C5
                playTone(ctx, 659, now + 0.18, 0.2, 0.08);  // E5
                playTone(ctx, 784, now + 0.4, 0.3, 0.06);   // G5
            } else if (type === 'after') {
                // Gentle descending reminder
                playTone(ctx, 784, now, 0.15, 0.07);        // G5
                playTone(ctx, 659, now + 0.2, 0.15, 0.07);  // E5
                playTone(ctx, 523, now + 0.4, 0.25, 0.05);  // C5
            } else {
                // Test: single pleasant tone
                playTone(ctx, 659, now, 0.2, 0.06);          // E5
            }

            // Close context after sounds finish
            setTimeout(function() { ctx.close(); }, 1500);
        } catch(e) {
            // AudioContext not available — silent fallback
        }
    }

    function playTone(ctx, freq, startTime, duration, volume) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    }

    // ==================== FASTING NOTIFICATIONS ====================

    var fastingNotifEnabled = localStorage.getItem('salah_fasting_notif') === 'true';

    async function toggleFastingNotifications() {
        var currentLang = getCurrentLang();
        if (fastingNotifEnabled) {
            fastingNotifEnabled = false;
            localStorage.setItem('salah_fasting_notif', 'false');
            showToast(currentLang === 'ar' ? 'تم إيقاف إشعارات الصيام' : 'Fasting notifications disabled', 'info');
        } else {
            if (!('Notification' in window)) {
                showToast(currentLang === 'ar'
                    ? 'المتصفح لا يدعم التنبيهات'
                    : 'Notifications not supported', 'error');
                return;
            }
            var permission = Notification.permission;
            if (permission === 'denied') {
                showToast(currentLang === 'ar' ? 'تم حظر التنبيهات — فعّلها من إعدادات المتصفح' : 'Notifications blocked — enable in browser settings', 'error');
                return;
            }
            if (permission !== 'granted') {
                permission = await Notification.requestPermission();
            }
            if (permission === 'granted') {
                fastingNotifEnabled = true;
                localStorage.setItem('salah_fasting_notif', 'true');
                showToast(currentLang === 'ar' ? 'تم تفعيل إشعارات الصيام' : 'Fasting notifications enabled', 'success');
            } else {
                showToast(currentLang === 'ar' ? 'لم يتم السماح بالتنبيهات' : 'Permission not granted', 'warning');
            }
        }
    }

    function sendFastingNotification(title, body) {
        if (Notification.permission !== 'granted') return;
        playNotificationSound('before');
        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(function(reg) {
                    reg.showNotification(title, {
                        body: body,
                        icon: 'icons/icon-192x192.png',
                        badge: 'icons/icon-72x72.png',
                        tag: 'fasting-' + new Date().toISOString().split('T')[0],
                        vibrate: [200, 100, 200]
                    });
                });
            } else {
                new Notification(title, { body: body, icon: 'icons/icon-192x192.png' });
            }
        } catch(e) {
            showToast(title + ': ' + body, 'info', 5000);
        }
    }

    function checkFastingNotifications() {
        if (!fastingNotifEnabled) return;
        var prayerTimesData = getPrayerTimesData();
        if (!prayerTimesData || !prayerTimesData.timings) return;

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var todayStr = now.toISOString().split('T')[0];

        // Only send after Maghrib
        var maghribMin = parseTimeToMinutes(prayerTimesData.timings.maghrib);
        if (nowMin < maghribMin || nowMin > maghribMin + 60) return; // 1hr window after Maghrib

        var sentKey = 'salah_fasting_notif_sent_' + todayStr;
        if (localStorage.getItem(sentKey)) return;

        var todayH = gregorianToHijri(now);
        if (!todayH) return;
        var weekday = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        var currentLang = getCurrentLang();
        var notification = null;

        // Priority: Dhul Hijjah > Ashura > Shawwal > White Days > Mon/Thu

        // 1. Dhul Hijjah: day 30 Dhul Qi'dah or days 1-8 Dhul Hijjah
        if (todayH.month === 11 && todayH.day === 30) {
            notification = {
                title: currentLang === 'ar' ? 'عشر ذي الحجة' : 'First 10 of Dhul Hijjah',
                body: currentLang === 'ar'
                    ? 'غداً من أيام العشر — ما من أيام العمل الصالح فيهن أحب إلى الله'
                    : 'Tomorrow begins the blessed 10 days — no days are more beloved to Allah for good deeds'
            };
        } else if (todayH.month === 12 && todayH.day >= 1 && todayH.day <= 8) {
            notification = {
                title: currentLang === 'ar' ? 'عشر ذي الحجة' : 'First 10 of Dhul Hijjah',
                body: currentLang === 'ar'
                    ? 'غداً من أيام العشر — ما من أيام العمل الصالح فيهن أحب إلى الله'
                    : 'Tomorrow is one of the blessed 10 days — fast for the sake of Allah'
            };
        }

        // 2. Ashura: day 8 Muharram
        if (!notification && todayH.month === 1 && todayH.day === 8) {
            notification = {
                title: currentLang === 'ar' ? 'تاسوعاء وعاشوراء' : 'Tasu\'a and Ashura',
                body: currentLang === 'ar'
                    ? 'يوم ٩ و١٠ محرم — صيام يوم عاشوراء يكفّر السنة التي قبله'
                    : 'Days 9 & 10 of Muharram — fasting Ashura expiates the previous year\'s sins'
            };
        }

        // 3. Shawwal: every Friday in Shawwal, stop after 6 fasted
        if (!notification && todayH.month === 10 && weekday === 5) {
            var shawwalData = (window.App.Fasting && window.App.Fasting.getVolFastingData)
                ? window.App.Fasting.getVolFastingData(todayH.year, 10) : {};
            var shawwalFasted = Object.values(shawwalData).filter(function(v) { return v; }).length;
            if (shawwalFasted < 6) {
                notification = {
                    title: currentLang === 'ar' ? 'صيام ٦ من شوال' : '6 Days of Shawwal',
                    body: currentLang === 'ar'
                        ? 'من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر'
                        : 'Whoever fasts Ramadan then follows it with six days of Shawwal, it is as if he fasted the entire year'
                };
            }
        }

        // 4. White Days: day 12 of every Hijri month
        if (!notification && todayH.day === 12) {
            notification = {
                title: currentLang === 'ar' ? 'الأيام البيض' : 'The White Days',
                body: currentLang === 'ar'
                    ? 'غداً أول الأيام البيض (١٣، ١٤، ١٥) — صيام ثلاثة أيام من كل شهر'
                    : 'Tomorrow begins the White Days (13, 14, 15) — fasting 3 days each month'
            };
        }

        // 5. Monday/Thursday: Sunday or Wednesday
        if (!notification && (weekday === 0 || weekday === 3)) {
            var dayName = weekday === 0
                ? (currentLang === 'ar' ? 'الاثنين' : 'Monday')
                : (currentLang === 'ar' ? 'الخميس' : 'Thursday');
            notification = {
                title: currentLang === 'ar' ? 'تذكير بصيام التطوع' : 'Voluntary Fasting Reminder',
                body: currentLang === 'ar'
                    ? 'غداً يوم ' + dayName + ' — من أراد الصيام فليبيّت النية'
                    : 'Tomorrow is ' + dayName + ' — a Sunnah day to fast'
            };
        }

        if (notification) {
            sendFastingNotification(notification.title, notification.body);
            localStorage.setItem(sentKey, '1');
        }
    }

    // ==================== PRAYER TIME NOTIFICATION CHECK ====================

    function checkPrayerTimeNotifications() {
        var prayerTimesData = getPrayerTimesData();
        var activeProfile = getActiveProfile();
        if (!notificationsEnabled || !prayerTimesData || !prayerTimesData.timings || !activeProfile) return;

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var todayStr = now.toISOString().split('T')[0];
        var timings = prayerTimesData.timings;

        var todayH = gregorianToHijri(now);
        var dataObj = getDataObject('fard');

        var prayers = [
            { id: 'fajr', time: parseTimeToMinutes(timings.fajr) },
            { id: 'dhuhr', time: parseTimeToMinutes(timings.dhuhr) },
            { id: 'asr', time: parseTimeToMinutes(timings.asr) },
            { id: 'maghrib', time: parseTimeToMinutes(timings.maghrib) },
            { id: 'isha', time: parseTimeToMinutes(timings.isha) }
        ];

        prayers.forEach(function(p) {
            var beforeKey = todayStr + '_before_' + p.id;
            var afterKey = todayStr + '_after_' + p.id;

            // 20 min before prayer
            var beforeMin = p.time - 20;
            if (nowMin >= beforeMin && nowMin < p.time && !notifSentToday[beforeKey]) {
                sendPrayerNotification(getPrayerName(p.id), 'before');
                notifSentToday[beforeKey] = true;
            }

            // 30 min after prayer - only if NOT marked
            var afterMin = p.time + 30;
            if (nowMin >= afterMin && nowMin < afterMin + 10 && !notifSentToday[afterKey]) {
                // Check if this prayer was marked today
                var isMarked = false;
                if (todayH && dataObj[todayH.month] && dataObj[todayH.month][p.id] && dataObj[todayH.month][p.id][todayH.day]) {
                    isMarked = true;
                }
                if (!isMarked) {
                    sendPrayerNotification(getPrayerName(p.id), 'after');
                }
                notifSentToday[afterKey] = true;
            }
        });
    }

    // ==================== PRAYER TIMES MONITOR ====================

    function startPrayerTimesMonitor() {
        // Fetch prayer times
        fetchPrayerTimes(false);

        // Check every 30 seconds for notifications and refresh display
        if (prayerTimesCheckInterval) clearInterval(prayerTimesCheckInterval);
        prayerTimesCheckInterval = setInterval(function() {
            // Re-render to update active/next prayer
            renderPrayerTimes();

            // Check notifications
            checkPrayerTimeNotifications();
            checkFastingNotifications();

            // At midnight, reset and refetch
            var now = new Date();
            if (now.getHours() === 0 && now.getMinutes() < 1) {
                notifSentToday = {};
                fetchPrayerTimes(true);
            }
        }, 30000);
    }

    // ==================== SW SCHEDULED NOTIFICATIONS ====================

    function scheduleSWNotifications() {
        if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
        var prayerTimesData = getPrayerTimesData();
        if (!prayerTimesData || !prayerTimesData.timings) return;

        var currentLang = getCurrentLang();
        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var timings = prayerTimesData.timings;

        var todayH = gregorianToHijri(now);
        var dataObj = getDataObject('fard');

        var prayers = [
            { id: 'fajr', time: parseTimeToMinutes(timings.fajr) },
            { id: 'dhuhr', time: parseTimeToMinutes(timings.dhuhr) },
            { id: 'asr', time: parseTimeToMinutes(timings.asr) },
            { id: 'maghrib', time: parseTimeToMinutes(timings.maghrib) },
            { id: 'isha', time: parseTimeToMinutes(timings.isha) }
        ];

        prayers.forEach(function(p) {
            var prayerName = getPrayerName(p.id);

            // Schedule "before" notification (20 min before)
            var beforeMin = p.time - 20;
            if (beforeMin > nowMin) {
                var delayMs = (beforeMin - nowMin) * 60000;
                navigator.serviceWorker.controller.postMessage({
                    type: 'SCHEDULE_NOTIFICATION',
                    title: (currentLang === 'ar' ? 'قرب وقت الصلاة' : 'Prayer approaching'),
                    body: (currentLang === 'ar' ? 'يقترب وقت صلاة ' + prayerName + ' — استعد!' : prayerName + ' in ~20 minutes'),
                    tag: 'prayer-before-' + p.id,
                    delay: delayMs
                });
            }

            // Schedule "after" notification (30 min after) — only if not marked
            var afterMin = p.time + 30;
            if (afterMin > nowMin) {
                var isMarked = todayH && dataObj[todayH.month] && dataObj[todayH.month][p.id] && dataObj[todayH.month][p.id][todayH.day];
                if (!isMarked) {
                    var delayMs2 = (afterMin - nowMin) * 60000;
                    navigator.serviceWorker.controller.postMessage({
                        type: 'SCHEDULE_NOTIFICATION',
                        title: (currentLang === 'ar' ? 'هل صليت؟' : 'Did you pray?'),
                        body: (currentLang === 'ar' ? 'مرّ وقت صلاة ' + prayerName + ' — سجّل صلاتك' : prayerName + ' time passed — log it'),
                        tag: 'prayer-after-' + p.id,
                        delay: delayMs2
                    });
                }
            }
        });
    }

    // ==================== ONBOARDING CARD ====================

    function showOnboardingCard() {
        // Only show once, and only if notifications not already enabled
        if (notificationsEnabled) return;
        if (localStorage.getItem('salah_notif_onboard_dismissed')) return;
        if (!('Notification' in window)) return;

        var card = document.createElement('div');
        card.id = 'notifOnboardCard';
        card.className = 'notif-onboard-card';
        card.setAttribute('role', 'alert');
        card.innerHTML =
            '<div class="notif-onboard-icon"><span class="material-symbols-rounded" style="font-size:28px;color:var(--primary);">notifications_active</span></div>' +
            '<div class="notif-onboard-text">' +
                '<div class="notif-onboard-title">' + t('notif_onboard_title') + '</div>' +
                '<div class="notif-onboard-body">' + t('notif_onboard_body') + '</div>' +
            '</div>' +
            '<div class="notif-onboard-actions">' +
                '<button class="notif-onboard-btn enable" id="_notifEnable">' + t('notif_onboard_enable') + '</button>' +
                '<button class="notif-onboard-btn later" id="_notifLater">' + t('notif_onboard_later') + '</button>' +
            '</div>';

        // Insert at top of main content
        var container = document.getElementById('mainContent');
        if (container) {
            container.insertBefore(card, container.firstChild);
        } else {
            document.body.appendChild(card);
        }

        requestAnimationFrame(function() {
            requestAnimationFrame(function() { card.classList.add('show'); });
        });

        card.querySelector('#_notifEnable').onclick = function() {
            dismissOnboarding(card);
            togglePrayerNotifications();
        };

        card.querySelector('#_notifLater').onclick = function() {
            dismissOnboarding(card);
        };
    }

    function dismissOnboarding(card) {
        localStorage.setItem('salah_notif_onboard_dismissed', 'true');
        card.classList.remove('show');
        setTimeout(function() { card.remove(); }, 300);
    }

    return {
        updateNotifButton: updateNotifButton,
        togglePrayerNotifications: togglePrayerNotifications,
        toggleFastingNotifications: toggleFastingNotifications,
        sendPrayerNotification: sendPrayerNotification,
        playNotificationSound: playNotificationSound,
        playTone: playTone,
        checkPrayerTimeNotifications: checkPrayerTimeNotifications,
        checkFastingNotifications: checkFastingNotifications,
        startPrayerTimesMonitor: startPrayerTimesMonitor,
        scheduleSWNotifications: scheduleSWNotifications,
        showOnboardingCard: showOnboardingCard,
        isEnabled: function() { return notificationsEnabled; },
        isFastingNotifEnabled: function() { return fastingNotifEnabled; },
        setEnabled: function(v) { notificationsEnabled = v; },
        resetNotifSentToday: function() { notifSentToday = {}; }
    };

})();

// ==================== BACKWARD COMPATIBILITY ====================

window.togglePrayerNotifications = window.App.Notifications.togglePrayerNotifications;
window.toggleFastingNotifications = window.App.Notifications.toggleFastingNotifications;
window.startPrayerTimesMonitor = window.App.Notifications.startPrayerTimesMonitor;
window.scheduleSWNotifications = window.App.Notifications.scheduleSWNotifications;
window.updateNotifButton = window.App.Notifications.updateNotifButton;
if (!window.refreshPrayerTimes) {
    window.refreshPrayerTimes = function() {
        if (window.App.PrayerTimes && window.App.PrayerTimes.fetchPrayerTimes) {
            window.App.PrayerTimes.fetchPrayerTimes(true);
        }
    };
}
