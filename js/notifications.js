/* Prayer Tracker PWA — notifications.js (restructured: before/after athan) */
window.App = window.App || {};
window.App.Notifications = (function() {

    // ==================== STATE ====================

    var notifSentToday = {};
    var monitorInterval = null;

    // Before-athan state
    var beforeEnabled = localStorage.getItem('salah_notif_before_enabled') === 'true';
    var beforeMinutes = parseInt(localStorage.getItem('salah_notif_before_minutes')) || 10;
    var beforePrayers = JSON.parse(localStorage.getItem('salah_notif_before_prayers') || '["fajr","dhuhr","asr","maghrib","isha"]');

    // After-athan state
    var afterEnabled = localStorage.getItem('salah_notif_after_enabled') === 'true';
    var afterMinutes = parseInt(localStorage.getItem('salah_notif_after_minutes')) || 15;
    var afterPrayers = JSON.parse(localStorage.getItem('salah_notif_after_prayers') || '["fajr","dhuhr","asr","maghrib","isha"]');

    // Fasting state
    var fastingNotifEnabled = localStorage.getItem('salah_fasting_notif') === 'true';

    // Daily insight state
    var dailyInsightEnabled = localStorage.getItem('salah_insight_enabled') === 'true';

    // Athan sound state
    var athanSoundEnabled = localStorage.getItem('salah_athan_sound_enabled') === 'true';
    var athanMuezzin = localStorage.getItem('salah_athan_muezzin') || 'afasy';
    var athanVolume = parseInt(localStorage.getItem('salah_athan_volume')) || 80;
    var athanPrayers = JSON.parse(localStorage.getItem('salah_athan_prayers') || '["fajr","dhuhr","asr","maghrib","isha"]');
    var currentAthanAudio = null;

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
        if (window.App.PrayerTimes && window.App.PrayerTimes.getPrayerName) {
            return window.App.PrayerTimes.getPrayerName(id);
        }
        if (window.getPrayerName) return window.getPrayerName(id);
        return id;
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
        // FIX: prayer-times.js exposes getData(), not getPrayerTimesData()
        if (window.App.PrayerTimes && window.App.PrayerTimes.getData) {
            return window.App.PrayerTimes.getData();
        }
        return null;
    }

    function parseTimeToMinutes(timeStr) {
        if (window.App.PrayerTimes && window.App.PrayerTimes.parseTimeToMinutes) {
            return window.App.PrayerTimes.parseTimeToMinutes(timeStr);
        }
        if (!timeStr) return 0;
        var clean = timeStr.replace(/\s*\(.*\)/, '').trim();
        var parts = clean.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    function fetchPrayerTimes(force) {
        if (window.App.PrayerTimes && window.App.PrayerTimes.fetchPrayerTimes) {
            return window.App.PrayerTimes.fetchPrayerTimes(force);
        }
    }

    function renderPrayerTimes() {
        if (window.App.PrayerTimes && window.App.PrayerTimes.renderPrayerTimes) {
            return window.App.PrayerTimes.renderPrayerTimes();
        }
    }

    // ==================== PERMISSION HELPER ====================

    function ensurePermission() {
        return new Promise(function(resolve) {
            var currentLang = getCurrentLang();
            if (!('Notification' in window)) {
                showToast(currentLang === 'ar'
                    ? 'المتصفح لا يدعم التنبيهات — جرّب Chrome أو فعّل التطبيق من الشاشة الرئيسية'
                    : 'Notifications not supported — try Chrome or install as PWA', 'error', 5000);
                resolve(false);
                return;
            }

            // Check iOS standalone mode
            var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            var isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
            if (isIOS && !isStandalone) {
                showToast(currentLang === 'ar'
                    ? 'للتنبيهات على iOS: أضف التطبيق للشاشة الرئيسية أولاً'
                    : 'For iOS: Add to Home Screen first', 'warning', 6000);
                resolve(false);
                return;
            }

            if (Notification.permission === 'denied') {
                showToast(currentLang === 'ar'
                    ? 'تم حظر التنبيهات — فعّلها من إعدادات المتصفح'
                    : 'Notifications blocked — enable in browser settings', 'error');
                resolve(false);
                return;
            }

            if (Notification.permission === 'granted') {
                resolve(true);
                return;
            }

            Notification.requestPermission().then(function(p) {
                resolve(p === 'granted');
                if (p !== 'granted') {
                    showToast(currentLang === 'ar'
                        ? 'لم يتم السماح بالتنبيهات'
                        : 'Permission not granted', 'warning');
                }
            });
        });
    }

    // ==================== NOTIFICATION SOUND (Web Audio) ====================

    function playNotificationSound(type) {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var now = ctx.currentTime;
            if (type === 'before') {
                playTone(ctx, 523, now, 0.15, 0.08);
                playTone(ctx, 659, now + 0.18, 0.2, 0.08);
                playTone(ctx, 784, now + 0.4, 0.3, 0.06);
            } else if (type === 'after') {
                playTone(ctx, 784, now, 0.15, 0.07);
                playTone(ctx, 659, now + 0.2, 0.15, 0.07);
                playTone(ctx, 523, now + 0.4, 0.25, 0.05);
            } else {
                playTone(ctx, 659, now, 0.2, 0.06);
            }
            setTimeout(function() { ctx.close(); }, 1500);
        } catch(e) {}
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

    // ==================== SEND NOTIFICATION ====================

    function sendNotification(title, body, tag, soundType) {
        if (Notification.permission !== 'granted') {
            console.error('[NOTIF] Permission not granted (current: ' + Notification.permission + ')');
            return;
        }

        playNotificationSound(soundType || 'before');

        // Always use Service Worker path — new Notification() does NOT work on mobile PWAs
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(function(reg) {
                return reg.showNotification(title, {
                    body: body,
                    icon: 'icons/icon-192x192.png',
                    badge: 'icons/icon-72x72.png',
                    tag: tag,
                    renotify: true,
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    data: { url: './' }
                });
            }).catch(function(e) {
                console.error('[NOTIF] SW showNotification failed:', e);
                // Desktop-only fallback
                try {
                    new Notification(title, { body: body, icon: 'icons/icon-192x192.png', tag: tag });
                } catch(e2) {
                    showToast(title + ': ' + body, 'info', 5000);
                }
            });
        } else {
            // No service worker — desktop fallback only
            try {
                new Notification(title, { body: body, icon: 'icons/icon-192x192.png', tag: tag });
            } catch(e) {
                console.error('[NOTIF] Notification FAILED:', e);
                showToast(title + ': ' + body, 'info', 5000);
            }
        }
    }

    // ==================== BEFORE-ATHAN TOGGLE ====================

    function toggleBeforeAthan() {
        var currentLang = getCurrentLang();
        if (beforeEnabled) {
            beforeEnabled = false;
            localStorage.setItem('salah_notif_before_enabled', 'false');
            showToast(currentLang === 'ar' ? 'تم إيقاف تنبيه قبل الأذان' : 'Before-athan alert disabled', 'info');
            var panel = document.getElementById('beforeAthanSettings');
            if (panel) panel.style.display = 'none';
            updateReminderBanner();
        } else {
            ensurePermission().then(function(ok) {
                if (ok) {
                    beforeEnabled = true;
                    localStorage.setItem('salah_notif_before_enabled', 'true');
                    showToast(currentLang === 'ar' ? 'تم تفعيل تنبيه قبل الأذان' : 'Before-athan alert enabled', 'success');
                    var panel = document.getElementById('beforeAthanSettings');
                    if (panel) panel.style.display = 'block';
                    updateReminderBanner();
                    sendNotification(
                        currentLang === 'ar' ? 'تم تفعيل التنبيه' : 'Notification Enabled',
                        currentLang === 'ar' ? 'ستصلك تنبيهات قبل الأذان' : 'You will receive pre-athan alerts',
                        'test-before', 'before'
                    );
                }
            });
        }
    }

    function setBeforeMinutes(min) {
        beforeMinutes = min;
        localStorage.setItem('salah_notif_before_minutes', String(min));
        document.querySelectorAll('#beforeAthanSettings .notif-pill').forEach(function(p) {
            p.classList.toggle('active', parseInt(p.getAttribute('data-min')) === min);
        });
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
    }

    function saveBeforePrayers() {
        var checks = document.querySelectorAll('#beforeAthanPrayers input[type="checkbox"]');
        beforePrayers = [];
        checks.forEach(function(c) { if (c.checked) beforePrayers.push(c.value); });
        localStorage.setItem('salah_notif_before_prayers', JSON.stringify(beforePrayers));
    }

    // ==================== AFTER-ATHAN TOGGLE ====================

    function toggleAfterAthan() {
        var currentLang = getCurrentLang();
        if (afterEnabled) {
            afterEnabled = false;
            localStorage.setItem('salah_notif_after_enabled', 'false');
            showToast(currentLang === 'ar' ? 'تم إيقاف تنبيه بعد الأذان' : 'After-athan alert disabled', 'info');
            var panel = document.getElementById('afterAthanSettings');
            if (panel) panel.style.display = 'none';
            updateReminderBanner();
        } else {
            ensurePermission().then(function(ok) {
                if (ok) {
                    afterEnabled = true;
                    localStorage.setItem('salah_notif_after_enabled', 'true');
                    showToast(currentLang === 'ar' ? 'تم تفعيل تنبيه بعد الأذان' : 'After-athan alert enabled', 'success');
                    var panel = document.getElementById('afterAthanSettings');
                    if (panel) panel.style.display = 'block';
                    updateReminderBanner();
                    // Test notification
                    sendNotification(
                        currentLang === 'ar' ? 'تم تفعيل التنبيه' : 'Notification Enabled',
                        currentLang === 'ar' ? 'ستصلك تنبيهات بعد الأذان' : 'You will receive post-athan alerts',
                        'test-after', 'after'
                    );
                }
            });
        }
    }

    function setAfterMinutes(min) {
        afterMinutes = min;
        localStorage.setItem('salah_notif_after_minutes', String(min));
        document.querySelectorAll('#afterAthanSettings .notif-pill').forEach(function(p) {
            p.classList.toggle('active', parseInt(p.getAttribute('data-min')) === min);
        });
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
    }

    function saveAfterPrayers() {
        var checks = document.querySelectorAll('#afterAthanPrayers input[type="checkbox"]');
        afterPrayers = [];
        checks.forEach(function(c) { if (c.checked) afterPrayers.push(c.value); });
        localStorage.setItem('salah_notif_after_prayers', JSON.stringify(afterPrayers));
    }

    // ==================== INIT SETTINGS PANELS ====================

    function initSettingsPanels() {
        // Before-athan panel
        var bPanel = document.getElementById('beforeAthanSettings');
        if (bPanel && beforeEnabled) bPanel.style.display = 'block';
        document.querySelectorAll('#beforeAthanSettings .notif-pill').forEach(function(p) {
            p.classList.toggle('active', parseInt(p.getAttribute('data-min')) === beforeMinutes);
        });
        document.querySelectorAll('#beforeAthanPrayers input[type="checkbox"]').forEach(function(c) {
            c.checked = beforePrayers.indexOf(c.value) !== -1;
            c.addEventListener('change', saveBeforePrayers);
        });

        // After-athan panel
        var aPanel = document.getElementById('afterAthanSettings');
        if (aPanel && afterEnabled) aPanel.style.display = 'block';
        document.querySelectorAll('#afterAthanSettings .notif-pill').forEach(function(p) {
            p.classList.toggle('active', parseInt(p.getAttribute('data-min')) === afterMinutes);
        });
        document.querySelectorAll('#afterAthanPrayers input[type="checkbox"]').forEach(function(c) {
            c.checked = afterPrayers.indexOf(c.value) !== -1;
            c.addEventListener('change', saveAfterPrayers);
        });

        // Athan sound panel
        initAthanSettings();

        // Show reminder banner if needed
        updateReminderBanner();
    }

    setTimeout(initSettingsPanels, 500);

    // ==================== CHECK BEFORE-ATHAN ====================

    function checkBeforeAthan() {
        if (!beforeEnabled) return;
        var ptData = getPrayerTimesData();
        if (!ptData || !ptData.timings) {
            return;
        }
        if (Notification.permission !== 'granted') {
            return;
        }

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var todayStr = now.toISOString().split('T')[0];
        var timings = ptData.timings;
        var currentLang = getCurrentLang();

        var prayers = [
            { id: 'fajr', time: parseTimeToMinutes(timings.fajr) },
            { id: 'dhuhr', time: parseTimeToMinutes(timings.dhuhr) },
            { id: 'asr', time: parseTimeToMinutes(timings.asr) },
            { id: 'maghrib', time: parseTimeToMinutes(timings.maghrib) },
            { id: 'isha', time: parseTimeToMinutes(timings.isha) }
        ];

        prayers.forEach(function(p) {
            if (beforePrayers.indexOf(p.id) === -1) return;
            var alertMin = p.time - beforeMinutes;
            var key = todayStr + '_before_' + p.id;
            var diff = p.time - nowMin;

            // Fire if we're within the window: alertMin <= nowMin < prayerTime
            if (nowMin >= alertMin && nowMin < p.time && !notifSentToday[key]) {
                var prayerName = getPrayerName(p.id);
                var title, body;
                if (currentLang === 'ar') {
                    title = prayerName + ' بعد ' + diff + ' دقائق';
                    body = 'استعد للصلاة';
                } else {
                    title = prayerName + ' in ' + diff + ' minutes';
                    body = 'Prepare for prayer';
                }
                sendNotification(title, body, 'before-' + p.id, 'before');
                notifSentToday[key] = true;
            }
        });
    }

    // ==================== CHECK AFTER-ATHAN ====================

    function checkAfterAthan() {
        if (!afterEnabled) return;
        var ptData = getPrayerTimesData();
        if (!ptData || !ptData.timings) {
            return;
        }
        if (Notification.permission !== 'granted') return;

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var todayStr = now.toISOString().split('T')[0];
        var timings = ptData.timings;
        var currentLang = getCurrentLang();

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
            if (afterPrayers.indexOf(p.id) === -1) return;
            var alertMin = p.time + afterMinutes;
            var key = todayStr + '_after_' + p.id;

            // Fire if we're in window: alertMin <= nowMin < alertMin+10
            if (nowMin >= alertMin && nowMin < alertMin + 10 && !notifSentToday[key]) {
                // Only notify if prayer NOT yet marked today
                var isMarked = false;
                if (todayH && dataObj[todayH.month] && dataObj[todayH.month][p.id] && dataObj[todayH.month][p.id][todayH.day]) {
                    isMarked = true;
                }
                if (!isMarked) {
                    var prayerName = getPrayerName(p.id);
                    var title, body;
                    if (currentLang === 'ar') {
                        title = 'هل صليت ' + prayerName + '؟';
                        body = 'مضى ' + afterMinutes + ' دقائق على الأذان';
                    } else {
                        title = 'Did you pray ' + prayerName + '?';
                        body = afterMinutes + ' minutes since Athan';
                    }
                    sendNotification(title, body, 'after-' + p.id, 'after');
                }
                notifSentToday[key] = true;
            }
        });
    }

    // ==================== FASTING NOTIFICATIONS ====================

    function toggleFastingNotifications() {
        var currentLang = getCurrentLang();
        if (fastingNotifEnabled) {
            fastingNotifEnabled = false;
            localStorage.setItem('salah_fasting_notif', 'false');
            showToast(currentLang === 'ar' ? 'تم إيقاف إشعارات الصيام' : 'Fasting notifications disabled', 'info');
        } else {
            ensurePermission().then(function(ok) {
                if (ok) {
                    fastingNotifEnabled = true;
                    localStorage.setItem('salah_fasting_notif', 'true');
                    showToast(currentLang === 'ar' ? 'تم تفعيل إشعارات الصيام' : 'Fasting notifications enabled', 'success');
                    // Test notification
                    sendNotification(
                        currentLang === 'ar' ? 'تم تفعيل التنبيه' : 'Notification Enabled',
                        currentLang === 'ar' ? 'ستصلك تذكيرات بأيام الصيام المسنونة' : 'You will receive fasting reminders',
                        'test-fasting', 'before'
                    );
                }
            });
        }
    }

    function checkFastingNotifications() {
        if (!fastingNotifEnabled) return;
        var ptData = getPrayerTimesData();
        if (!ptData || !ptData.timings) return;

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var todayStr = now.toISOString().split('T')[0];

        var maghribMin = parseTimeToMinutes(ptData.timings.maghrib);
        // Notify any time after Maghrib (evening reminder for tomorrow's fast)
        if (nowMin < maghribMin) return;

        var sentKey = 'salah_fasting_notif_sent_' + todayStr;
        if (localStorage.getItem(sentKey)) return;

        var todayH = gregorianToHijri(now);
        if (!todayH) return;
        var weekday = now.getDay();
        var currentLang = getCurrentLang();
        var notification = null;

        // Dhul Hijjah
        if (todayH.month === 11 && todayH.day === 30) {
            notification = {
                title: currentLang === 'ar' ? 'عشر ذي الحجة' : 'First 10 of Dhul Hijjah',
                body: currentLang === 'ar'
                    ? 'غداً من أيام العشر — ما من أيام العمل الصالح فيهن أحب إلى الله'
                    : 'Tomorrow begins the blessed 10 days'
            };
        } else if (todayH.month === 12 && todayH.day >= 1 && todayH.day <= 8) {
            notification = {
                title: currentLang === 'ar' ? 'عشر ذي الحجة' : 'First 10 of Dhul Hijjah',
                body: currentLang === 'ar'
                    ? 'غداً من أيام العشر — ما من أيام العمل الصالح فيهن أحب إلى الله'
                    : 'Tomorrow is one of the blessed 10 days — fast for Allah'
            };
        }

        // Ashura
        if (!notification && todayH.month === 1 && todayH.day === 8) {
            notification = {
                title: currentLang === 'ar' ? 'تاسوعاء وعاشوراء' : "Tasu'a and Ashura",
                body: currentLang === 'ar'
                    ? 'يوم ٩ و١٠ محرم — صيام يوم عاشوراء يكفّر السنة التي قبله'
                    : "Days 9 & 10 of Muharram — fasting Ashura expiates the previous year's sins"
            };
        }

        // Shawwal
        if (!notification && todayH.month === 10 && weekday === 5) {
            var shawwalData = (window.App.Fasting && window.App.Fasting.getVolFastingData)
                ? window.App.Fasting.getVolFastingData(todayH.year, 10) : {};
            var shawwalFasted = Object.values(shawwalData).filter(function(v) { return v; }).length;
            if (shawwalFasted < 6) {
                notification = {
                    title: currentLang === 'ar' ? 'صيام ٦ من شوال' : '6 Days of Shawwal',
                    body: currentLang === 'ar'
                        ? 'من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر'
                        : 'Whoever fasts Ramadan then follows it with six of Shawwal, it is as if he fasted the year'
                };
            }
        }

        // White Days
        if (!notification && todayH.day === 12) {
            notification = {
                title: currentLang === 'ar' ? 'الأيام البيض' : 'The White Days',
                body: currentLang === 'ar'
                    ? 'غداً أول الأيام البيض (١٣، ١٤، ١٥) — صيام ثلاثة أيام من كل شهر'
                    : 'Tomorrow begins the White Days (13, 14, 15)'
            };
        }

        // Mon/Thu
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
            sendNotification(notification.title, notification.body, 'fasting-' + todayStr, 'before');
            localStorage.setItem(sentKey, '1');
        }
    }

    // ==================== DAILY DATA INSIGHT ====================

    function toggleDailyInsight() {
        var currentLang = getCurrentLang();
        if (dailyInsightEnabled) {
            dailyInsightEnabled = false;
            localStorage.setItem('salah_insight_enabled', 'false');
            showToast(currentLang === 'ar' ? 'تم إيقاف الملخص اليومي' : 'Daily insight disabled', 'info');
        } else {
            ensurePermission().then(function(ok) {
                if (ok) {
                    dailyInsightEnabled = true;
                    localStorage.setItem('salah_insight_enabled', 'true');
                    showToast(currentLang === 'ar' ? 'تم تفعيل الملخص اليومي' : 'Daily insight enabled', 'success');
                    // Test notification
                    sendNotification(
                        currentLang === 'ar' ? 'تم تفعيل التنبيه' : 'Notification Enabled',
                        currentLang === 'ar' ? 'ستصلك تحليل يومي بعد صلاة العشاء' : 'You will receive daily insights after Isha',
                        'test-insight', 'before'
                    );
                }
            });
        }
    }

    function generateDailyInsight() {
        var currentLang = getCurrentLang();
        var todayH = gregorianToHijri(new Date());
        if (!todayH) return null;
        var dataObj = getDataObject('fard');
        var fardPrayers = window.App.Config ? window.App.Config.fardPrayers : [];
        var congData = {};
        if (window.App.Storage && window.App.Storage.getCongData) {
            congData = window.App.Storage.getCongData();
        }

        var prayed = 0;
        var congCount = 0;
        var missed = [];
        for (var i = 0; i < fardPrayers.length; i++) {
            var pid = fardPrayers[i].id;
            var val = dataObj[todayH.month] && dataObj[todayH.month][pid] && dataObj[todayH.month][pid][todayH.day];
            if (val) {
                prayed++;
                if (congData[pid] && congData[pid][todayH.day]) congCount++;
            } else {
                missed.push(getPrayerName(pid));
            }
        }

        var title, body;
        var now = new Date();
        var weekday = now.getDay();

        if (congCount === 5) {
            title = currentLang === 'ar' ? 'ما شاء الله!' : "Masha'Allah!";
            body = currentLang === 'ar'
                ? 'صليت الخمس جماعة اليوم — بارك الله في يومك'
                : 'All 5 prayers in congregation today — blessed day!';
        } else if (prayed === 5) {
            title = currentLang === 'ar' ? 'أحسنت!' : 'Well done!';
            body = currentLang === 'ar'
                ? 'أتممت الصلوات الخمس اليوم' + (congCount > 0 ? ' — منها ' + congCount + ' جماعة' : '')
                : 'All 5 prayers completed' + (congCount > 0 ? ' — ' + congCount + ' in congregation' : '');
        } else if (prayed > 0 && prayed < 5) {
            title = currentLang === 'ar' ? 'ملخص يومك' : 'Your daily summary';
            body = currentLang === 'ar'
                ? 'صليت ' + prayed + ' من 5 — لم تسجّل: ' + missed.join('، ')
                : prayed + ' of 5 prayed — missed: ' + missed.join(', ');
        } else if (prayed === 0) {
            title = currentLang === 'ar' ? 'لا تنسَ صلاتك' : "Don't forget your prayers";
            body = currentLang === 'ar'
                ? 'لم تسجّل أي صلاة اليوم — هل نسيت؟'
                : 'No prayers logged today — did you forget?';
        }

        if (weekday === 5 && prayed >= 3) {
            var fridayMsg = currentLang === 'ar'
                ? ' — أكثروا من الصلاة على النبي \uFDFA'
                : ' — Send salawat on the Prophet \uFDFA';
            if (body) body += fridayMsg;
        }

        if (!title) return null;

        // Streak
        var streak = 0;
        for (var d = todayH.day; d >= 1; d--) {
            var dayPrayed = 0;
            for (var j = 0; j < fardPrayers.length; j++) {
                if (dataObj[todayH.month] && dataObj[todayH.month][fardPrayers[j].id] && dataObj[todayH.month][fardPrayers[j].id][d]) {
                    dayPrayed++;
                }
            }
            if (dayPrayed === 5) streak++;
            else break;
        }
        if (streak >= 7) {
            body += (currentLang === 'ar' ? ' \uD83D\uDD25 سلسلة ' + streak + ' يوم!' : ' \uD83D\uDD25 ' + streak + '-day streak!');
        }

        return { title: title, body: body };
    }

    function checkDailyInsight() {
        if (!dailyInsightEnabled) return;
        var ptData = getPrayerTimesData();
        if (!ptData || !ptData.timings) return;
        if (Notification.permission !== 'granted') return;

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var todayStr = now.toISOString().split('T')[0];

        var ishaMin = parseTimeToMinutes(ptData.timings.isha);
        var insightMin = ishaMin + 30;
        // Notify any time after Isha+30 (no upper bound — once per day via sentKey)
        if (nowMin < insightMin) return;

        var sentKey = 'salah_insight_sent_' + todayStr;
        if (localStorage.getItem(sentKey)) return;

        var insight = generateDailyInsight();
        if (!insight) return;

        sendNotification(insight.title, insight.body, 'daily-insight', 'before');
        localStorage.setItem(sentKey, '1');
    }

    // ==================== ATHAN SOUND ====================

    function toggleAthanSound() {
        var currentLang = getCurrentLang();
        if (athanSoundEnabled) {
            athanSoundEnabled = false;
            localStorage.setItem('salah_athan_sound_enabled', 'false');
            showToast(currentLang === 'ar' ? 'تم إيقاف صوت الأذان' : 'Athan sound disabled', 'info');
            var panel = document.getElementById('athanSoundSettings');
            if (panel) panel.style.display = 'none';
        } else {
            athanSoundEnabled = true;
            localStorage.setItem('salah_athan_sound_enabled', 'true');
            showToast(currentLang === 'ar' ? 'تم تفعيل صوت الأذان' : 'Athan sound enabled', 'success');
            var panel = document.getElementById('athanSoundSettings');
            if (panel) panel.style.display = 'block';
        }
    }

    function setAthanMuezzin(value) {
        athanMuezzin = value;
        localStorage.setItem('salah_athan_muezzin', value);
        document.querySelectorAll('#athanSoundSettings .notif-pill[data-muezzin]').forEach(function(p) {
            p.classList.toggle('active', p.getAttribute('data-muezzin') === value);
        });
        if (window.App.UI && window.App.UI.haptic) window.App.UI.haptic('soft');
    }

    function setAthanVolume(value) {
        athanVolume = parseInt(value);
        localStorage.setItem('salah_athan_volume', String(athanVolume));
    }

    function saveAthanPrayers() {
        var checks = document.querySelectorAll('#athanSoundPrayers input[type="checkbox"]');
        athanPrayers = [];
        checks.forEach(function(c) { if (c.checked) athanPrayers.push(c.value); });
        localStorage.setItem('salah_athan_prayers', JSON.stringify(athanPrayers));
    }

    // Fallback beep via AudioContext when mp3 files are missing
    function playPlaceholderBeep(vol, durationSec) {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var gain = ctx.createGain();
            gain.gain.value = (vol || 80) / 100;
            gain.connect(ctx.destination);

            // Two-tone athan-like beep pattern
            var freqs = [523.25, 659.25, 783.99, 659.25]; // C5 E5 G5 E5
            var noteLen = (durationSec || 3) / freqs.length;
            freqs.forEach(function(freq, i) {
                var osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq;
                osc.connect(gain);
                osc.start(ctx.currentTime + i * noteLen);
                osc.stop(ctx.currentTime + (i + 1) * noteLen - 0.05);
            });
            console.error('[ATHAN] Using placeholder beep — replace audio files in audio/ folder');
            // Return a mock audio object so stopAthan can work
            return {
                _ctx: ctx,
                pause: function() { try { ctx.close(); } catch(e) {} },
                currentTime: 0
            };
        } catch(e) {
            console.error('[ATHAN] AudioContext fallback failed:', e);
            return null;
        }
    }

    function previewAthan() {
        console.error('[ATHAN] Preview clicked, muezzin=' + athanMuezzin + ', vol=' + athanVolume);
        stopAthan();

        // Build absolute path from page location to avoid relative-path issues
        var base = location.href.substring(0, location.href.lastIndexOf('/') + 1);
        var filePath = base + 'audio/athan-' + athanMuezzin + '.mp3';
        console.error('[ATHAN] Full audio URL: ' + filePath);

        var audio = new Audio(filePath);
        audio.volume = athanVolume / 100;
        currentAthanAudio = audio;

        // Must call play() synchronously within user gesture
        var playPromise = audio.play();
        showStopPill();

        if (playPromise && playPromise.then) {
            playPromise.then(function() {
                console.error('[ATHAN] Preview playing OK');
            }).catch(function(e) {
                console.error('[ATHAN] Preview play() FAILED:', e.message || e);
                // Fallback to AudioContext beep (still within gesture chain on most browsers)
                stopAthan();
                var mock = playPlaceholderBeep(athanVolume, 3);
                if (mock) {
                    currentAthanAudio = mock;
                    showStopPill();
                    setTimeout(function() {
                        if (currentAthanAudio === mock) stopAthan();
                    }, 3000);
                }
            });
        }

        // Let audio play to completion — stop pill gives manual control
        audio.addEventListener('ended', function() {
            if (currentAthanAudio === audio) stopAthan();
        });
    }

    function playAthan(prayerId) {
        console.error('[ATHAN] Playing for ' + prayerId + ', muezzin=' + athanMuezzin + ', vol=' + athanVolume);
        stopAthan();

        var base = location.href.substring(0, location.href.lastIndexOf('/') + 1);
        var filePath = base + 'audio/athan-' + athanMuezzin + '.mp3';

        var audio = new Audio(filePath);
        audio.volume = athanVolume / 100;
        currentAthanAudio = audio;

        audio.play().then(function() {
            console.error('[ATHAN] Athan playing OK for ' + prayerId);
        }).catch(function(e) {
            console.error('[ATHAN] Athan play() FAILED for ' + prayerId + ':', e.message || e);
            stopAthan();
            var mock = playPlaceholderBeep(athanVolume, 3);
            if (mock) {
                currentAthanAudio = mock;
                showStopPill();
                setTimeout(function() {
                    if (currentAthanAudio === mock) stopAthan();
                }, 3000);
            }
        });

        audio.addEventListener('ended', function() {
            removeStopPill();
            currentAthanAudio = null;
        });
        showStopPill();
    }

    function stopAthan() {
        if (currentAthanAudio) {
            currentAthanAudio.pause();
            currentAthanAudio.currentTime = 0;
            currentAthanAudio = null;
        }
        removeStopPill();
    }

    function showStopPill() {
        removeStopPill();
        var pill = document.createElement('button');
        pill.id = 'athanStopPill';
        pill.className = 'athan-stop-pill';
        pill.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">stop</span><span>' + t('stop_athan') + '</span>';
        pill.onclick = function() { stopAthan(); };
        document.body.appendChild(pill);
    }

    function removeStopPill() {
        var pill = document.getElementById('athanStopPill');
        if (pill) pill.remove();
    }

    function checkAthanTime() {
        if (!athanSoundEnabled) return;
        var ptData = getPrayerTimesData();
        if (!ptData || !ptData.timings) return;

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var todayStr = now.toISOString().split('T')[0];
        var timings = ptData.timings;
        var currentLang = getCurrentLang();

        var prayers = [
            { id: 'fajr', time: parseTimeToMinutes(timings.fajr) },
            { id: 'dhuhr', time: parseTimeToMinutes(timings.dhuhr) },
            { id: 'asr', time: parseTimeToMinutes(timings.asr) },
            { id: 'maghrib', time: parseTimeToMinutes(timings.maghrib) },
            { id: 'isha', time: parseTimeToMinutes(timings.isha) }
        ];

        prayers.forEach(function(p) {
            if (athanPrayers.indexOf(p.id) === -1) return;
            var diff = nowMin - p.time;
            if (diff >= 0 && diff <= 2) {
                var playedKey = 'salah_athan_played_' + p.id + '_' + todayStr;
                if (!localStorage.getItem(playedKey)) {
                    playAthan(p.id);
                    // Also send a notification as fallback when audio is blocked
                    if (Notification.permission === 'granted') {
                        var prayerName = getPrayerName(p.id);
                        sendNotification(
                            currentLang === 'ar' ? 'حان وقت ' + prayerName : prayerName + ' time now',
                            currentLang === 'ar' ? 'حيّ على الصلاة' : 'Come to prayer',
                            'athan-' + p.id, 'before'
                        );
                    }
                    localStorage.setItem(playedKey, 'true');
                }
            }
        });
    }

    function initAthanSettings() {
        var panel = document.getElementById('athanSoundSettings');
        if (panel && athanSoundEnabled) panel.style.display = 'block';

        document.querySelectorAll('#athanSoundSettings .notif-pill[data-muezzin]').forEach(function(p) {
            p.classList.toggle('active', p.getAttribute('data-muezzin') === athanMuezzin);
        });

        var slider = document.getElementById('athanVolumeSlider');
        if (slider) slider.value = athanVolume;

        document.querySelectorAll('#athanSoundPrayers input[type="checkbox"]').forEach(function(c) {
            c.checked = athanPrayers.indexOf(c.value) !== -1;
            c.addEventListener('change', saveAthanPrayers);
        });
    }

    // ==================== REMINDER BANNER (STEP 4) ====================

    function updateReminderBanner() {
        var existing = document.getElementById('notifReminderBanner');

        // If either notification type is enabled, hide banner
        if (beforeEnabled || afterEnabled) {
            if (existing) existing.remove();
            return;
        }

        // Check if dismissed within last 7 days
        var dismissed = localStorage.getItem('salah_notif_reminder_dismissed');
        if (dismissed) {
            var dismissedTime = parseInt(dismissed);
            if (Date.now() - dismissedTime < 7 * 86400000) {
                if (existing) existing.remove();
                return;
            }
        }

        // Don't duplicate
        if (existing) return;

        // Check if notifications are supported at all
        if (!('Notification' in window)) return;

        var currentLang = getCurrentLang();
        var banner = document.createElement('div');
        banner.id = 'notifReminderBanner';
        banner.className = 'notif-reminder-banner';
        banner.innerHTML =
            '<span class="material-symbols-rounded" style="font-size:20px;color:var(--accent);flex-shrink:0;">notifications</span>' +
            '<span style="flex:1;font-size:0.8em;font-weight:600;">' +
                (currentLang === 'ar' ? 'فعّل الإشعارات للتذكير بمواقيت الصلاة' : 'Enable notifications for prayer time reminders') +
            '</span>' +
            '<button class="notif-reminder-btn" id="_notifReminderEnable">' +
                (currentLang === 'ar' ? 'تفعيل' : 'Enable') +
            '</button>' +
            '<button class="notif-reminder-dismiss" id="_notifReminderDismiss">' +
                '<span class="material-symbols-rounded" style="font-size:16px;">close</span>' +
            '</button>';

        // Insert after prayer reminder bar or at top of fard tracker view
        var reminderBar = document.getElementById('prayerReminder');
        var container = document.getElementById('fardTrackerView');
        if (reminderBar && reminderBar.parentNode) {
            reminderBar.parentNode.insertBefore(banner, reminderBar.nextSibling);
        } else if (container) {
            var firstChild = container.querySelector('.prayers-container') || container.firstChild;
            container.insertBefore(banner, firstChild);
        }

        document.getElementById('_notifReminderEnable').onclick = function() {
            banner.remove();
            // Open profile settings to notification section
            if (typeof window.openProfileSettings === 'function') {
                window.openProfileSettings();
            }
        };

        document.getElementById('_notifReminderDismiss').onclick = function() {
            localStorage.setItem('salah_notif_reminder_dismissed', String(Date.now()));
            banner.remove();
        };
    }

    // ==================== SCHEDULE SW NOTIFICATIONS ====================

    function scheduleSWNotifications() {
        if (!('serviceWorker' in navigator)) return;
        var ptData = getPrayerTimesData();
        if (!ptData || !ptData.timings) return;

        var currentLang = getCurrentLang();
        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();
        var timings = ptData.timings;

        var prayers = [
            { id: 'fajr', time: parseTimeToMinutes(timings.fajr) },
            { id: 'dhuhr', time: parseTimeToMinutes(timings.dhuhr) },
            { id: 'asr', time: parseTimeToMinutes(timings.asr) },
            { id: 'maghrib', time: parseTimeToMinutes(timings.maghrib) },
            { id: 'isha', time: parseTimeToMinutes(timings.isha) }
        ];

        navigator.serviceWorker.ready.then(function(reg) {
            if (!reg.active) return;

            prayers.forEach(function(p) {
                var prayerName = getPrayerName(p.id);

                // Schedule before notification
                if (beforeEnabled && beforePrayers.indexOf(p.id) !== -1) {
                    var bMin = p.time - beforeMinutes;
                    if (bMin > nowMin) {
                        var diff = p.time - bMin; // = beforeMinutes
                        var title = currentLang === 'ar'
                            ? prayerName + ' بعد ' + diff + ' دقائق'
                            : prayerName + ' in ' + diff + ' minutes';
                        var body = currentLang === 'ar' ? 'استعد للصلاة' : 'Prepare for prayer';
                        reg.active.postMessage({
                            type: 'SCHEDULE_NOTIFICATION',
                            title: title,
                            body: body,
                            tag: 'before-' + p.id,
                            delay: (bMin - nowMin) * 60000
                        });
                    }
                }

                // Schedule after notification
                if (afterEnabled && afterPrayers.indexOf(p.id) !== -1) {
                    var aMin = p.time + afterMinutes;
                    if (aMin > nowMin) {
                        var aTitle = currentLang === 'ar'
                            ? 'هل صليت ' + prayerName + '؟'
                            : 'Did you pray ' + prayerName + '?';
                        var aBody = currentLang === 'ar'
                            ? 'مضى ' + afterMinutes + ' دقائق على الأذان'
                            : afterMinutes + ' minutes since Athan';
                        reg.active.postMessage({
                            type: 'SCHEDULE_NOTIFICATION',
                            title: aTitle,
                            body: aBody,
                            tag: 'after-' + p.id,
                            delay: (aMin - nowMin) * 60000
                        });
                    }
                }
            });
        });

    }

    // ==================== MONITOR (60-second interval) ====================

    function runAllChecks() {
        // Each check is isolated — one failure does not block the others
        try { renderPrayerTimes(); } catch(e) { console.error('[NOTIF] renderPrayerTimes error:', e); }
        try { checkBeforeAthan(); } catch(e) { console.error('[NOTIF] checkBeforeAthan error:', e); }
        try { checkAfterAthan(); } catch(e) { console.error('[NOTIF] checkAfterAthan error:', e); }
        try { checkAthanTime(); } catch(e) { console.error('[NOTIF] checkAthanTime error:', e); }
        try { checkFastingNotifications(); } catch(e) { console.error('[NOTIF] checkFastingNotifications error:', e); }
        try { checkDailyInsight(); } catch(e) { console.error('[NOTIF] checkDailyInsight error:', e); }
    }

    function startMonitor() {
        fetchPrayerTimes(false);

        // Run first check immediately (short delay for prayer times data to load)
        setTimeout(runAllChecks, 3000);

        if (monitorInterval) clearInterval(monitorInterval);
        monitorInterval = setInterval(function() {
            runAllChecks();

            // Midnight reset
            var now2 = new Date();
            if (now2.getHours() === 0 && now2.getMinutes() < 2) {
                notifSentToday = {};
                fetchPrayerTimes(true);
            }
        }, 60000); // 60 seconds
    }

    // ==================== PUBLIC API ====================

    return {
        // Before/After athan
        toggleBeforeAthan: toggleBeforeAthan,
        toggleAfterAthan: toggleAfterAthan,
        setBeforeMinutes: setBeforeMinutes,
        setAfterMinutes: setAfterMinutes,
        isBeforeEnabled: function() { return beforeEnabled; },
        isAfterEnabled: function() { return afterEnabled; },

        // Fasting
        toggleFastingNotifications: toggleFastingNotifications,
        checkFastingNotifications: checkFastingNotifications,
        isFastingNotifEnabled: function() { return fastingNotifEnabled; },

        // Daily insight
        toggleDailyInsight: toggleDailyInsight,
        generateDailyInsight: generateDailyInsight,
        checkDailyInsight: checkDailyInsight,
        isDailyInsightEnabled: function() { return dailyInsightEnabled; },

        // Athan sound
        toggleAthanSound: toggleAthanSound,
        setAthanMuezzin: setAthanMuezzin,
        setAthanVolume: setAthanVolume,
        previewAthan: previewAthan,
        stopAthan: stopAthan,
        checkAthanTime: checkAthanTime,
        isAthanSoundEnabled: function() { return athanSoundEnabled; },

        // Reminder banner
        updateReminderBanner: updateReminderBanner,

        // Core
        sendNotification: sendNotification,
        playNotificationSound: playNotificationSound,
        playTone: playTone,
        scheduleSWNotifications: scheduleSWNotifications,
        startMonitor: startMonitor,
        runAllChecks: runAllChecks,
        resetNotifSentToday: function() { notifSentToday = {}; },

        // Checks (for visibility change)
        checkBeforeAthan: checkBeforeAthan,
        checkAfterAthan: checkAfterAthan,
        checkAthanTime: checkAthanTime,
        checkFastingNotifications: checkFastingNotifications,
        checkDailyInsight: checkDailyInsight,

        // Bridge: Notification Center settings changed
        onSettingsChanged: function(newSettings) {
            if (!newSettings) return;
            // Sync legacy module state from NC settings
            beforeEnabled = newSettings.prePrayer ? newSettings.prePrayer.enabled : beforeEnabled;
            beforeMinutes = newSettings.prePrayer ? newSettings.prePrayer.minutes : beforeMinutes;
            afterEnabled = newSettings.missedPrayer ? newSettings.missedPrayer.enabled : afterEnabled;
            afterMinutes = newSettings.missedPrayer ? newSettings.missedPrayer.delayMinutes : afterMinutes;
            athanSoundEnabled = newSettings.athan ? newSettings.athan.enabled : athanSoundEnabled;
            fastingNotifEnabled = newSettings.fasting ? newSettings.fasting.enabled : fastingNotifEnabled;
            dailyInsightEnabled = newSettings.dailyInsight ? newSettings.dailyInsight.enabled : dailyInsightEnabled;
        }
    };

})();

// ==================== BACKWARD COMPATIBILITY ====================

window.toggleBeforeAthan = window.App.Notifications.toggleBeforeAthan;
window.toggleAfterAthan = window.App.Notifications.toggleAfterAthan;
window.setBeforeMinutes = window.App.Notifications.setBeforeMinutes;
window.setAfterMinutes = window.App.Notifications.setAfterMinutes;
window.toggleFastingNotifications = window.App.Notifications.toggleFastingNotifications;
window.toggleDailyInsight = window.App.Notifications.toggleDailyInsight;
window.toggleAthanSound = window.App.Notifications.toggleAthanSound;
window.setAthanMuezzin = window.App.Notifications.setAthanMuezzin;
window.setAthanVolume = window.App.Notifications.setAthanVolume;
window.previewAthan = window.App.Notifications.previewAthan;
window.stopAthan = window.App.Notifications.stopAthan;
window.scheduleSWNotifications = window.App.Notifications.scheduleSWNotifications;
// Legacy compat — old code calls startPrayerTimesMonitor
window.startPrayerTimesMonitor = window.App.Notifications.startMonitor;
