// نسخه برنامه
const APP_VERSION = '1.7.20'; // ← هر بار تغییر دادید، فقط این عدد را عوض کنید

// Cache Name بر اساس نسخه برنامه
const CACHE_NAME = `attendance-app-cache-v${APP_VERSION}`;

const APP_SHELL_FILES = [
    '/', // صفحه اصلی
    '/index.html', // صفحه اصلی (برای اطمینان)
    '/main.js',
    '/manifest.json', // اگر دارید
    '/style.css', // (مسیر فایل CSS اصلی خود را قرار دهید)
    
    // تصاویر اصلی
    '/Images/LogoHozor192.png',
    '/Images/LogoHozor256.png',
    '/Images/LogoHozor512.png',
    '/Images/LogoHozor256x256.png',
    
    // فونت‌ها (اگر دارید و می‌خواهید آفلاین کار کنند)
    'fonts/yekan-font/yekan-regular.woff',
    'fonts/yekan-font/Yekan.woff',
    
    // ! فایل آفلاین جدید
    '/offline.html'
];

// 1. رویداد Install: کش کردن فایل‌های اصلی
self.addEventListener('install', (event) => {
    console.log('[SW] در حال نصب Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] کش کردن App Shell و صفحه آفلاین');
                return cache.addAll(APP_SHELL_FILES);
            })
            .catch(err => {
                console.error('[SW] خطا در کش کردن App Shell:', err);
            })
    );
});

// 2. رویداد Activate: پاکسازی کش‌های قدیمی
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker فعال شد.');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // اگر نام کش با نسخه فعلی مطابقت نداشت، آن را حذف کن
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] پاکسازی کش قدیمی:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // کنترل فوری صفحه
    );
});


// مدیریت نوتیفیکیشن‌ها 
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    
    const options = {
        body: data.body || 'وضعیت حضور و غیاب',
        icon: 'Images/LogoHozor192.png',
        badge: 'Images/LogoHozor192.png',
        vibrate: [100, 50, 100],
        data: {
            url: self.location.origin
        },
        actions: [
            {
                action: 'open',
                title: 'باز کردن برنامه'
            },
            {
                action: 'close',
                title: 'بستن'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'حضور و غیاب آساگیتی', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === self.location.origin && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(self.location.origin);
            }
        })
    );
});

// 3. رویداد Fetch: مدیریت درخواست‌ها (هسته اصلی آفلاین)
self.addEventListener('fetch', (event) => {
    // ما فقط درخواست‌های GET را مدیریت می‌کنیم
    if (event.request.method !== 'GET') {
        return;
    }

    // استراتژی: ابتدا شبکه، سپس کش (Network Falling Back to Cache)
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // اگر موفق بود، پاسخ شبکه را برگردان
                return networkResponse;
            })
            .catch(() => {
                // اگر شبکه شکست خورد (آفلاین بودیم)
                console.log(`[SW] شبکه برای ${event.request.url} شکست خورد. تلاش از کش...`);
                
                // سعی کن از کش برگردانی
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            // اگر در کش بود، آن را برگردان
                            return cachedResponse;
                        }

                        // اگر در کش نبود:
                        // بررسی کن که آیا درخواست برای یک صفحه (navigation) است؟
                        if (event.request.mode === 'navigate') {
                            console.log('[SW] صفحه در کش نبود، نمایش صفحه آفلاین.');
                            // اگر بله، صفحه آفلاین را از کش برگردان
                            return caches.match('/offline.html');
                        }

                        // اگر درخواست برای چیز دیگری بود (مثل تصویر یا API) و در کش نبود،
                        // فقط یک پاسخ خطا برگردان.
                        return new Response(null, {
                            status: 404,
                            statusText: "Not Found in Cache"
                        });
                    });
            })
    );
});

// 4. مدیریت پیام Skip Waiting (برای به‌روزرسانی)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});




