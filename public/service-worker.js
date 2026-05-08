// ========================================
// PWA Service Worker
// 故事板分镜工具 - 离线缓存
// ========================================

// 定义缓存名称和版本
const CACHE_NAME = 'murmurs-cache-v1';

// 定义需要缓存的文件列表
const urlsToCache = [
    '/',
    '/storyboard.html',
    '/styles.css',
    '/manifest.json'
];

// ========================================
// Install 事件 - 预缓存静态文件
// ========================================
self.addEventListener('install', function(event) {
    console.log('Service Worker: 安装中...');
    
    event.waitUntil(
        // 打开缓存
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Service Worker: 缓存文件...');
                // 缓存所有静态文件
                return cache.addAll(urlsToCache);
            })
            .then(function() {
                console.log('Service Worker: 所有文件已缓存');
                // 跳过等待，立即激活
                return self.skipWaiting();
            })
            .catch(function(error) {
                console.log('Service Worker: 缓存失败', error);
            })
    );
});

// ========================================
// Activate 事件 - 清理旧缓存
// ========================================
self.addEventListener('activate', function(event) {
    console.log('Service Worker: 激活中...');
    
    event.waitUntil(
        // 获取所有缓存键
        caches.keys().then(function(cacheNames) {
            // 返回一个 Promise，当所有 Promise 完成时 resolve
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    // 如果缓存名称不是当前版本，删除旧缓存
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: 删除旧缓存', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            console.log('Service Worker: 激活成功');
            // 立即接管所有页面
            return self.clients.claim();
        })
    );
});

// ========================================
// Fetch 事件 - 网络优先，缓存 fallback
// ========================================
self.addEventListener('fetch', function(event) {
    // 只处理同源请求
    if (event.request.url.indexOf(self.location.origin) !== 0) {
        return;
    }

    event.respondWith(
        // 首先尝试网络请求
        fetch(event.request)
            .then(function(response) {
                // 如果请求成功，克隆响应并缓存
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseClone);
                        });
                }
                return response;
            })
            .catch(function() {
                // 如果网络请求失败，从缓存中获取
                return caches.match(event.request)
                    .then(function(response) {
                        if (response) {
                            console.log('Service Worker: 从缓存中提供', event.request.url);
                            return response;
                        }
                        // 如果缓存也没有，返回一个简单的离线页面
                        return new Response('离线状态 - 请检查网络连接', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// ========================================
// 后台同步（可选功能）
// 用于在网络恢复后同步数据
// ========================================
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-cards') {
        console.log('Service Worker: 同步卡片数据...');
        // 这里可以添加数据同步逻辑
    }
});

// ========================================
// 推送通知（可选功能）
// ========================================
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.text();
        console.log('Service Worker: 收到推送', data);
        
        const options = {
            body: data,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%23fbc0e9" width="180" height="180" rx="40"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="90">🐰</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%23fbc0e9" width="180" height="180" rx="40"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="90">🐰</text></svg>',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };
        
        event.waitUntil(
            self.registration.showNotification('🐰 murmurs', options)
        );
    }
});

// ========================================
// 点击通知事件（可选功能）
// ========================================
self.addEventListener('notificationclick', function(event) {
    console.log('Service Worker: 点击通知');
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // 如果已有窗口，打开它
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 如果没有窗口，打开新窗口
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});