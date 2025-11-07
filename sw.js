// نسخه برنامه
const APP_VERSION = '1.7.8'; // ← هر بار تغییر دادید، فقط این عدد را عوض کنید

// Cache Name بر اساس نسخه برنامه
const CACHE_NAME = `attendance-app-cache-v${APP_VERSION}`;
// فایل‌هایی که باید cache شوند
const STATIC_FILES = [
    './',
    './index.html',
    './manifest.json',
    './browserconfig.xml',
    'Images/LogoHozor192.png',
    'Images/LogoHozor512.png',
    'Images/LogoHozor256.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

const ASSETS = [
  '/',               // صفحه اصلی
  '/index.html',
  '/manifest.json',
  'Images/LogoHozor192.png',
  'Images/LogoHozor512.png',
];

// نصب Service Worker
self.addEventListener('install', (event) => {
    console.log('🚀 Service Worker در حال نصب...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('✅ کش استاتیک ایجاد شد');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('✅ همه فایل‌ها کش شدند');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ خطا در نصب Service Worker:', error);
            })
    );
});

// فعال‌سازی Service Worker
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker فعال شد');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
                        console.log('🗑️ حذف کش قدیمی:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ کش‌های قدیمی پاک شدند');
            return self.clients.claim();
        })
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

// مدیریت درخواست‌ها
self.addEventListener('fetch', (event) => {
    // فقط درخواست‌های GET را مدیریت کن
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // اگر فایل در کش وجود دارد، از کش برگردان
                if (response) {
                    return response;
                }

                // در غیر این صورت از شبکه بگیر و کش کن
                return fetch(event.request)
                    .then((response) => {
                        // فقط پاسخ‌های معتبر را کش کن
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // اگر آفلاین هستیم و فایل در کش نیست
                        if (event.request.destination === 'document') {
                            return caches.match('./');
                        }
                    });
            })
    );
});

// پیام‌ها از main.js
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

