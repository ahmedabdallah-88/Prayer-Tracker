// Prayer Tracker PWA — Service Worker v331
const CACHE_NAME = 'salah-tracker-v331';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // CSS (versioned)
    './css/main.css?v=328',
    './css/themes.css?v=328',
    './css/dashboard.css?v=328',
    './css/splash.css?v=328',
    // JS modules (dependency order)
    './js/config.js?v=328',
    './js/storage.js?v=328',
    './js/hijri-calendar.js?v=328',
    './js/ui-utils.js?v=328',
    './js/i18n.js?v=328',
    './js/themes.js?v=328',
    './js/profiles.js?v=328',
    './js/female-features.js?v=328',
    './js/tracker-utils.js?v=328',
    './js/fard-tracker.js?v=328',
    './js/sunnah-tracker.js?v=328',
    './js/jamaah-tracker.js?v=328',
    './js/prayer-streaks.js?v=328',
    './js/weekly-view.js?v=328',
    './js/fasting-tracker.js?v=328',
    './js/prayer-times.js?v=328',
    './js/missed-prayer-notif.js?v=328',
    './js/notification-center.js?v=328',
    './js/notifications.js?v=328',
    './js/azkar-tracker.js?v=328',
    './js/svg-charts.js?v=328',
    './js/info-tooltips.js?v=328',
    './js/qada-report.js?v=328',
    './js/qada-calculator.js?v=328',
    './js/qada-tracker.js?v=328',
    './js/qada-dashboard.js?v=328',
    './js/dashboard.js?v=328',
    './js/year-overview.js?v=328',
    './js/data-io.js?v=328',
    './js/onboarding.js?v=328',
    './js/app.js?v=328',
    // Icons
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png',
    './icons/maskable-192x192.png',
    './icons/maskable-512x512.png',
    // Audio
    './audio/athan-afasy.mp3',
    './audio/athan-makkah.mp3',
    // CDN fonts (cached on first fetch)
    'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Rubik:wght@400;500;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=add,add_circle,alarm,analytics,assignment_late,auto_awesome,badge,bedtime,bolt,brightness_2,cake,calculate,calendar_month,calendar_today,calendar_view_month,check,check_circle,chevron_left,chevron_right,circle,close,compare_arrows,dark_mode,date_range,delete,delete_outline,do_not_disturb,done_all,download,edit,edit_calendar,emoji_events,event,event_repeat,face,female,grid_view,history,info,insights,light_mode,local_fire_department,location_on,male,menu_book,mosque,my_location,nights_stay,notification_important,notifications,notifications_active,partly_cloudy_day,person,person_add,play_arrow,print,refresh,restaurant,routine,schedule,school,settings,show_chart,speed,star,stop,swap_horiz,system_update,target,translate,trending_down,trending_up,upload_file,verified,volume_up,warning,water_drop,wb_sunny,wb_twilight,wifi_off&display=swap',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap'
];

// ==================== OFFLINE FALLBACK HTML ====================
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>غير متصل - متتبع الصلاة</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;
min-height:100vh;padding:20px;text-align:center;
font-family:'Noto Kufi Arabic',system-ui,sans-serif;background:#F5F3EF;color:#2B2D42}
.icon{font-size:64px;margin-bottom:16px;opacity:0.7}
h2{font-size:1.4em;margin-bottom:8px;color:#2D6A4F}
p{color:#8D99AE;max-width:320px;line-height:1.6;margin-bottom:24px}
button{background:#2D6A4F;color:white;border:none;padding:12px 32px;border-radius:12px;
font-size:1em;font-weight:700;cursor:pointer;font-family:inherit}
button:active{transform:scale(0.97)}
</style>
</head>
<body>
<div class="icon">&#x1F54C;</div>
<h2>أنت غير متصل</h2>
<p>لا يوجد اتصال بالإنترنت ولم يتم تحميل التطبيق بعد.<br>أعد المحاولة عند الاتصال.</p>
<p style="font-size:0.9em;">No internet connection and the app hasn't been cached yet.<br>Please try again when connected.</p>
<button onclick="location.reload()">إعادة المحاولة / Retry</button>
</body>
</html>`;

// ==================== INSTALL — cache assets then skip waiting ====================
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ==================== ACTIVATE — claim clients + purge old caches ====================
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// ==================== FETCH — split strategy ====================
// Navigation (HTML) → network-first (always get latest page)
// Static assets (JS, CSS, images, fonts) → cache-first (SW version busting handles updates)
// APIs → network-only
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // API calls — network only, no cache
    if (url.hostname === 'api.aladhan.com' ||
        url.hostname === 'nominatim.openstreetmap.org') {
        event.respondWith(
            fetch(event.request).catch(() => new Response('', { status: 408 }))
        );
        return;
    }

    // Navigation requests (HTML) — network first, offline fallback
    if (event.request.mode === 'navigate' ||
        (event.request.headers.get('accept') || '').indexOf('text/html') !== -1) {
        event.respondWith(
            fetch(event.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                return caches.match(event.request, { ignoreSearch: true }).then(cached => {
                    if (cached) return cached;
                    return new Response(OFFLINE_HTML, {
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    });
                });
            })
        );
        return;
    }

    // Static assets (JS, CSS, images, fonts) — cache first
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => new Response('', { status: 408 }))
    );
});

// ==================== NOTIFICATION CLICK ====================
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                for (let client of windowClients) {
                    if (client.url.includes('prayer-tracker') || client.url.endsWith('/')) {
                        client.focus();
                        client.postMessage({
                            type: 'notification-click',
                            tag: event.notification.tag
                        });
                        return;
                    }
                }
                return clients.openWindow(event.notification.data?.url || './');
            })
    );
});

// ==================== NOTIFICATION CLOSE ====================
self.addEventListener('notificationclose', event => {
});

// ==================== MESSAGE FROM MAIN APP ====================
// NOTE: SCHEDULE_NOTIFICATION removed — SW setTimeout is unreliable
// (browser may kill SW before timer fires). Scheduling handled in notifications.js.
// NOTE: periodicsync handler removed — was empty dead code.
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
