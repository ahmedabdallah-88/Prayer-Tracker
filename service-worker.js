// Prayer Tracker PWA — Service Worker v289
const CACHE_NAME = 'salah-tracker-v289';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // CSS (versioned)
    './css/main.css?v=284',
    './css/themes.css?v=284',
    './css/dashboard.css?v=284',
    './css/splash.css?v=284',
    // JS modules (dependency order)
    './js/config.js?v=284',
    './js/storage.js?v=284',
    './js/hijri-calendar.js?v=284',
    './js/ui-utils.js?v=284',
    './js/i18n.js?v=284',
    './js/themes.js?v=284',
    './js/profiles.js?v=284',
    './js/female-features.js?v=284',
    './js/fard-tracker.js?v=284',
    './js/sunnah-tracker.js?v=284',
    './js/jamaah-tracker.js?v=284',
    './js/prayer-streaks.js?v=284',
    './js/weekly-view.js?v=284',
    './js/fasting-tracker.js?v=284',
    './js/prayer-times.js?v=284',
    './js/notifications.js?v=284',
    './js/azkar-tracker.js?v=284',
    './js/svg-charts.js?v=284',
    './js/info-tooltips.js?v=284',
    './js/qada-report.js?v=284',
    './js/qada-calculator.js?v=284',
    './js/qada-tracker.js?v=284',
    './js/qada-dashboard.js?v=284',
    './js/dashboard.js?v=284',
    './js/year-overview.js?v=284',
    './js/data-io.js?v=284',
    './js/onboarding.js?v=284',
    './js/app.js?v=284',
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

// ==================== FETCH — NETWORK FIRST, cache fallback ====================
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

    // ALL resources — network first, cache fallback
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request, { ignoreSearch: true }).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return new Response(OFFLINE_HTML, {
                            headers: { 'Content-Type': 'text/html; charset=utf-8' }
                        });
                    }
                    return new Response('', { status: 408 });
                });
            })
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

// ==================== BACKGROUND PERIODIC SYNC ====================
self.addEventListener('periodicsync', event => {
    if (event.tag === 'prayer-check') {
        event.waitUntil(checkAndNotify());
    }
});

// ==================== MESSAGE FROM MAIN APP ====================
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { title, body, tag, delay } = event.data;
        if (delay && delay > 0) {
            setTimeout(() => {
                self.registration.showNotification(title, {
                    body: body,
                    icon: 'icons/icon-192x192.png',
                    badge: 'icons/icon-72x72.png',
                    tag: tag,
                    renotify: true,
                    vibrate: [200, 100, 200],
                    data: { url: './' }
                });
            }, delay);
        }
    }
});

// Helper for background sync
async function checkAndNotify() {
    try {
        const allClients = await clients.matchAll({ type: 'window' });
        if (allClients.length === 0 || allClients.every(c => c.visibilityState === 'hidden')) {
            // Main app sends scheduled notifications via message
        }
    } catch(e) {
    }
}
