/**
 * NotificationManager - Handle browser notifications (fallback when tab is in background)
 */
export class NotificationManager {
  private permission: NotificationPermission = 'default'
  private notificationsEnabled = true

  constructor() {
    this.permission = Notification.permission
    this.loadSettings()
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    this.permission = permission
    this.saveSettings()
    return permission
  }

  showChatNotification(conversationId: string, onNotificationClick?: () => void) {
    if (!this.canShowNotification()) {
      return
    }

    const notification = new Notification('Neue Nachricht auf tigube', {
      body: 'Du hast eine neue Nachricht erhalten.',
      icon: '/Image/Logos/tigube_logo.svg',
      tag: conversationId,
      badge: '/Image/Logos/tigube_logo_klein.png',
      requireInteraction: false,
      silent: true,
    })

    notification.onclick = () => {
      window.focus()
      onNotificationClick?.()
      notification.close()
    }

    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  }

  private canShowNotification(): boolean {
    return (
      'Notification' in window &&
      this.permission === 'granted' &&
      this.notificationsEnabled &&
      document.visibilityState === 'hidden'
    )
  }

  private loadSettings() {
    try {
      const settings = localStorage.getItem('tigube_notification_settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        this.notificationsEnabled = parsed.notificationsEnabled ?? true
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error)
    }
  }

  private saveSettings() {
    try {
      const settings = {
        notificationsEnabled: this.notificationsEnabled,
        permission: this.permission,
      }
      localStorage.setItem('tigube_notification_settings', JSON.stringify(settings))
    } catch (error) {
      console.warn('Failed to save notification settings:', error)
    }
  }

  setNotificationsEnabled(enabled: boolean) {
    this.notificationsEnabled = enabled
    this.saveSettings()
  }

  getSettings() {
    return {
      permission: this.permission,
      notificationsEnabled: this.notificationsEnabled,
      browserSupport: 'Notification' in window,
    }
  }
}

export const notificationManager = new NotificationManager()
