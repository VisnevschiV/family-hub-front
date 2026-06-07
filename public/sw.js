const STATIC_CACHE = 'family-hub-static-v1'
const RUNTIME_CACHE = 'family-hub-runtime-v1'
const OFFLINE_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/logo.png']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS))
    )
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
                    .map((key) => caches.delete(key))
            )
        )
    )
    self.clients.claim()
})

self.addEventListener('fetch', (event) => {
    const { request } = event

    if (request.method !== 'GET') return

    const url = new URL(request.url)

    if (url.origin !== self.location.origin) return
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/notifications')) return

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone()
                    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
                    return response
                })
                .catch(async () => {
                    const cachedPage = await caches.match(request)
                    if (cachedPage) return cachedPage
                    return caches.match('/index.html')
                })
        )
        return
    }

    if (['script', 'style', 'image', 'font'].includes(request.destination)) {
        event.respondWith(
            caches.match(request).then(async (cached) => {
                const networkFetch = fetch(request)
                    .then((response) => {
                        const copy = response.clone()
                        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
                        return response
                    })
                    .catch(() => cached)

                return cached || networkFetch
            })
        )
    }
})

self.addEventListener('push', (event) => {
    const fallback = {
        title: 'Family Hub',
        body: 'You have a new update.',
        url: '/app/notifications',
    }

    let payload = fallback
    try {
        const data = event.data ? event.data.json() : null
        if (data && typeof data === 'object') {
            payload = {
                title: data.title || fallback.title,
                body: data.body || data.message || fallback.body,
                url: data.url || fallback.url,
            }
        }
    } catch {
        payload = fallback
    }

    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: '/logo.png',
            badge: '/logo.png',
            data: { url: payload.url },
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const destination = event.notification?.data?.url || '/'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if ('focus' in client) {
                    client.navigate(destination)
                    return client.focus()
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(destination)
            }
            return undefined
        })
    )
})
