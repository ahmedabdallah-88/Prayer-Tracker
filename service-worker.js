// Prayer Tracker PWA — Service Worker v88
const CACHE_NAME = 'salah-tracker-v88';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // CSS
    './css/main.css',
    './css/themes.css',
    './css/dashboard.css',
    // JS modules (dependency order)
    './js/config.js?v=85',
    './js/storage.js?v=85',
    './js/hijri-calendar.js?v=85',
    './js/ui-utils.js?v=85',
    './js/i18n.js?v=85',
    './js/themes.js?v=85',
    './js/profiles.js?v=85',
    './js/female-features.js?v=85',
    './js/fard-tracker.js?v=85',
    './js/sunnah-tracker.js?v=85',
    './js/jamaah-tracker.js?v=85',
    './js/weekly-view.js?v=85',
    './js/fasting-tracker.js?v=85',
    './js/prayer-times.js?v=85',
    './js/notifications.js?v=85',
    './js/azkar-tracker.js?v=85',
    './js/svg-charts.js?v=85',
    './js/qada-report.js?v=85',
    './js/dashboard.js?v=85',
    './js/year-overview.js?v=85',
    './js/data-io.js?v=85',
    './js/app.js?v=85',
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
    // CDN (cached on first fetch)
    'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;600;700&family=Rubik:wght@400;500;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
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

// ==================== INSTALL ====================
self.addEventListener('install', event => {
    console.log('[SW] Installing v85...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
    console.log('[SW] Activating v85...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ==================== FETCH (Network-first) ====================
self.addEventListener('fetch', event => {
    // Skip non-GET and cross-origin requests
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    
    // API calls — network only, no cache
    if (url.hostname === 'api.aladhan.com' || 
        url.hostname === 'nominatim.openstreetmap.org') {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // CDN resources (fonts) — cache first
    if (url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com') {
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
            })
        );
        return;
    }
    
    // App resources — network first, fallback to cache, then offline page
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
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    // For navigation requests, serve offline fallback
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
    console.log('[SW] Notification clicked:', event.notification.tag);
    event.notification.close();
    
    // Focus existing window or open new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // Try to focus an existing window
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
                // No existing window — open new one
                return clients.openWindow(event.notification.data?.url || './');
            })
    );
});

// ==================== NOTIFICATION CLOSE ====================
self.addEventListener('notificationclose', event => {
    console.log('[SW] Notification dismissed:', event.notification.tag);
});

// ==================== BACKGROUND PERIODIC SYNC ====================
// For browsers that support it (Chrome Android)
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
    
    // Schedule notification from main thread
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

// Helper: check prayer times and send notifications (for background sync)
async function checkAndNotify() {
    try {
        const allClients = await clients.matchAll({ type: 'window' });
        // Only notify if no active window (app is in background)
        if (allClients.length === 0 || allClients.every(c => c.visibilityState === 'hidden')) {
            // Read cached prayer times from the app
            // (The main app stores this in localStorage which SW can't access directly,
            //  but the main app sends scheduled notifications via message)
            console.log('[SW] Background check — app is hidden, relying on scheduled notifications');
        }
    } catch(e) {
        console.log('[SW] Background check error:', e);
    }
}
