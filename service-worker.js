// Prayer Tracker PWA — Service Worker v323
const CACHE_NAME = 'salah-tracker-v323';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // CSS (versioned)
    './css/main.css?v=323',
    './css/themes.css?v=323',
    './css/dashboard.css?v=323',
    './css/splash.css?v=323',
    // JS modules (dependency order)
    './js/config.js?v=323',
    './js/storage.js?v=323',
    './js/hijri-calendar.js?v=323',
    './js/ui-utils.js?v=323',
    './js/i18n.js?v=323',
    './js/themes.js?v=323',
    './js/profiles.js?v=323',
    './js/female-features.js?v=323',
    './js/fard-tracker.js?v=323',
    './js/sunnah-tracker.js?v=323',
    './js/jamaah-tracker.js?v=323',
    './js/prayer-streaks.js?v=323',
    './js/weekly-view.js?v=323',
    './js/fasting-tracker.js?v=323',
    './js/prayer-times.js?v=323',
    './js/missed-prayer-notif.js?v=323',
    './js/notifications.js?v=323',
    './js/azkar-tracker.js?v=323',
    './js/svg-charts.js?v=323',
    './js/info-tooltips.js?v=323',
    './js/qada-report.js?v=323',
    './js/qada-calculator.js?v=323',
    './js/qada-tracker.js?v=323',
    './js/qada-dashboard.js?v=323',
    './js/dashboard.js?v=323',
    './js/year-overview.js?v=323',
    './js/data-io.js?v=323',
    './js/onboarding.js?v=323',
    './js/app.js?v=323',
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
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
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
