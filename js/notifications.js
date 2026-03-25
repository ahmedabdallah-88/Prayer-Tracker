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
        console.log('[NOTIF] SENDING notification: ' + tag + ' — ' + title + ': ' + body);
        if (Notification.permission !== 'granted') {
            console.error('[NOTIF] Permission not granted, cannot send');
            return;
        }

        playNotificationSound(soundType || 'before');

        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(function(reg) {
                    reg.showNotification(title, {
                        body: body,
                        icon: 'icons/icon-192x192.png',
                        badge: 'icons/icon-72x72.png',
                        tag: tag,
                        renotify: true,
                        vibrate: [200, 100, 200],
                        requireInteraction: true,
                        data: { url: './' }
                    });
                    console.log('[NOTIF] Notification sent via SW successfully');
                }).catch(function(e) {
                    console.error('[NOTIF] SW notification FAILED:', e);
                });
            } else {
                new Notification(title, {
                    body: body,
                    icon: 'icons/icon-192x192.png',
                    tag: tag
                });
                console.log('[NOTIF] Notification sent via Notification API');
            }
        } catch(e) {
            console.error('[NOTIF] Notification FAILED:', e);
            showToast(title + ': ' + body, 'info', 5000);
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
                    // Test notification
                    sendNotification(
                        currentLang === 'ar' ? 'متتبع الصلاة' : 'Prayer Tracker',
                        currentLang === 'ar' ? 'تم تفعيل تنبيه قبل الأذان' : 'Before-athan alert activated',
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
                        currentLang === 'ar' ? 'متتبع الصلاة' : 'Prayer Tracker',
                        currentLang === 'ar' ? 'تم تفعيل تنبيه بعد الأذان' : 'After-athan alert activated',
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

        // Show reminder banner if needed
        updateReminderBanner();
    }

    setTimeout(initSettingsPanels, 500);

    // ==================== CHECK BEFORE-ATHAN ====================

    function checkBeforeAthan() {
        if (!beforeEnabled) return;
        var ptData = getPrayerTimesData();
        if (!ptData || !ptData.timings) {
            console.log('[NOTIF] Before-athan: no prayer times data');
            return;
        }
        if (Notification.permission !== 'granted') {
            console.log('[NOTIF] Before-athan: permission=' + Notification.permission);
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
                console.log('[NOTIF] Before-athan firing for ' + p.id + ', diff=' + diff + 'min');
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
            console.log('[NOTIF] After-athan: no prayer times data');
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
                    console.log('[NOTIF] After-athan firing for ' + p.id + ', marked=' + isMarked);
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
        if (nowMin < maghribMin || nowMin > maghribMin + 60) return;

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
        var insightMin = ishaMin + 45;
        if (nowMin < insightMin || nowMin > insightMin + 30) return;

        var sentKey = 'salah_insight_sent_' + todayStr;
        if (localStorage.getItem(sentKey)) return;

        var insight = generateDailyInsight();
        if (!insight) return;

        sendNotification(insight.title, insight.body, 'daily-insight', 'before');
        localStorage.setItem(sentKey, '1');
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
        if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
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
                    navigator.serviceWorker.controller.postMessage({
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
                    navigator.serviceWorker.controller.postMessage({
                        type: 'SCHEDULE_NOTIFICATION',
                        title: aTitle,
                        body: aBody,
                        tag: 'after-' + p.id,
                        delay: (aMin - nowMin) * 60000
                    });
                }
            }
        });

        console.log('[NOTIF] Scheduled SW notifications for background');
    }

    // ==================== MONITOR (60-second interval) ====================

    function startMonitor() {
        console.log('[NOTIF] Starting notification monitor (60s interval)');
        fetchPrayerTimes(false);

        if (monitorInterval) clearInterval(monitorInterval);
        monitorInterval = setInterval(function() {
            console.log('[NOTIF] Monitor tick — checking notifications...');
            console.log('[NOTIF] Permission: ' + (('Notification' in window) ? Notification.permission : 'N/A'));
            console.log('[NOTIF] Before enabled: ' + beforeEnabled + ', After enabled: ' + afterEnabled);

            var ptData = getPrayerTimesData();
            console.log('[NOTIF] Prayer times loaded: ' + (ptData ? 'yes' : 'NO'));
            if (ptData && ptData.timings) {
                var now = new Date();
                var nowMin = now.getHours() * 60 + now.getMinutes();
                var timings = ptData.timings;
                var pIds = ['fajr','dhuhr','asr','maghrib','isha'];
                pIds.forEach(function(id) {
                    var pMin = parseTimeToMinutes(timings[id]);
                    var diff = pMin - nowMin;
                    if (Math.abs(diff) < 60) {
                        console.log('[NOTIF] ' + id + ': time=' + timings[id] + ', diff=' + diff + 'min');
                    }
                });
            }

            // Re-render prayer times display
            renderPrayerTimes();

            // Check all notification types
            checkBeforeAthan();
            checkAfterAthan();
            checkFastingNotifications();
            checkDailyInsight();

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

        // Reminder banner
        updateReminderBanner: updateReminderBanner,

        // Core
        sendNotification: sendNotification,
        playNotificationSound: playNotificationSound,
        playTone: playTone,
        scheduleSWNotifications: scheduleSWNotifications,
        startMonitor: startMonitor,
        resetNotifSentToday: function() { notifSentToday = {}; },

        // Checks (for visibility change)
        checkBeforeAthan: checkBeforeAthan,
        checkAfterAthan: checkAfterAthan
    };

})();

// ==================== BACKWARD COMPATIBILITY ====================

window.toggleBeforeAthan = window.App.Notifications.toggleBeforeAthan;
window.toggleAfterAthan = window.App.Notifications.toggleAfterAthan;
window.setBeforeMinutes = window.App.Notifications.setBeforeMinutes;
window.setAfterMinutes = window.App.Notifications.setAfterMinutes;
window.toggleFastingNotifications = window.App.Notifications.toggleFastingNotifications;
window.toggleDailyInsight = window.App.Notifications.toggleDailyInsight;
window.scheduleSWNotifications = window.App.Notifications.scheduleSWNotifications;
// Legacy compat — old code calls startPrayerTimesMonitor
window.startPrayerTimesMonitor = window.App.Notifications.startMonitor;
