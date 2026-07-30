/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; url?: string } = {}

  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'tigube', body: event.data.text() }
  }

  const title = payload.title ?? 'Neue Nachricht auf tigube'
  const body = payload.body ?? 'Du hast eine neue Nachricht erhalten.'
  const url = payload.url ?? '/nachrichten'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/Image/Logos/tigube_logo_klein.png',
      badge: '/Image/Logos/tigube_logo_klein.png',
      data: { url },
      tag: 'tigube-chat',
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const targetUrl = (event.notification.data?.url as string) ?? '/nachrichten'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

export {}
