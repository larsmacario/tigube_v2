import { supabase } from '../supabase/client'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export class PushNotificationManager {
  private vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  isIos(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  }

  isStandalonePwa(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
    )
  }

  async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null

    try {
      return await navigator.serviceWorker.ready
    } catch (error) {
      console.error('Service worker not ready:', error)
      return null
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied'
    return Notification.requestPermission()
  }

  async subscribe(userId: string): Promise<boolean> {
    if (!this.vapidPublicKey) {
      console.warn('VITE_VAPID_PUBLIC_KEY not configured')
      return false
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') return false

    const registration = await this.getRegistration()
    if (!registration) return false

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(this.vapidPublicKey),
      })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return false
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) {
      console.error('Failed to save push subscription:', error)
      return false
    }

    return true
  }

  async unsubscribe(userId: string): Promise<void> {
    const registration = await navigator.serviceWorker.ready.catch(() => null)
    const subscription = await registration?.pushManager.getSubscription()

    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
    }
  }

  async syncSubscription(userId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await this.subscribe(userId)
    } else {
      await this.unsubscribe(userId)
    }
  }
}

export const pushNotificationManager = new PushNotificationManager()
