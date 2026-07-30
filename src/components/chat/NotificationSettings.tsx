import { useState, useEffect } from 'react'
import { Bell, BellOff, Mail, Settings, Smartphone } from 'lucide-react'
import { notificationManager } from '../../lib/notifications/NotificationManager'
import { pushNotificationManager } from '../../lib/notifications/PushNotificationManager'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../lib/notifications/notificationPreferencesService'
import { useAuth } from '../../lib/auth/AuthContext'

interface NotificationSettingsProps {
  isOpen: boolean
  onClose: () => void
}

function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const { userProfile } = useAuth()
  const userId = userProfile?.id as string | undefined

  const [settings, setSettings] = useState({
    permission: 'default' as NotificationPermission,
    browserNotificationsEnabled: true,
    pushEnabled: true,
    emailRemindersEnabled: true,
    browserSupport: true,
    pushSupported: false,
    isIos: false,
    isStandalonePwa: false,
    loading: true,
    saving: false,
  })

  useEffect(() => {
    if (!isOpen || !userId) return

    const load = async () => {
      const browserSettings = notificationManager.getSettings()
      const prefs = await getNotificationPreferences(userId)

      setSettings((prev) => ({
        ...prev,
        permission: browserSettings.permission,
        browserNotificationsEnabled: browserSettings.notificationsEnabled,
        pushEnabled: prefs.push_notifications_enabled,
        emailRemindersEnabled: prefs.email_message_reminders_enabled,
        browserSupport: browserSettings.browserSupport,
        pushSupported: pushNotificationManager.isSupported(),
        isIos: pushNotificationManager.isIos(),
        isStandalonePwa: pushNotificationManager.isStandalonePwa(),
        loading: false,
      }))
    }

    load()
  }, [isOpen, userId])

  const handleRequestPermission = async () => {
    const permission = await notificationManager.requestPermission()
    setSettings((prev) => ({ ...prev, permission }))
  }

  const handleToggleBrowserNotifications = () => {
    const enabled = !settings.browserNotificationsEnabled
    notificationManager.setNotificationsEnabled(enabled)
    setSettings((prev) => ({ ...prev, browserNotificationsEnabled: enabled }))
  }

  const handleTogglePush = async () => {
    if (!userId) return

    setSettings((prev) => ({ ...prev, saving: true }))
    const enabled = !settings.pushEnabled

    const { error } = await updateNotificationPreferences(userId, {
      push_notifications_enabled: enabled,
    })

    if (!error) {
      await pushNotificationManager.syncSubscription(userId, enabled)
      if (enabled) {
        const permission = await notificationManager.requestPermission()
        setSettings((prev) => ({ ...prev, permission, pushEnabled: enabled }))
      } else {
        setSettings((prev) => ({ ...prev, pushEnabled: enabled }))
      }
    }

    setSettings((prev) => ({ ...prev, saving: false }))
  }

  const handleToggleEmailReminders = async () => {
    if (!userId) return

    setSettings((prev) => ({ ...prev, saving: true }))
    const enabled = !settings.emailRemindersEnabled

    const { error } = await updateNotificationPreferences(userId, {
      email_message_reminders_enabled: enabled,
    })

    if (!error) {
      setSettings((prev) => ({ ...prev, emailRemindersEnabled: enabled }))
    }

    setSettings((prev) => ({ ...prev, saving: false }))
  }

  const testNotification = () => {
    notificationManager.showChatNotification('test-conversation', () => {
      console.log('Test notification clicked')
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Benachrichtigungseinstellungen
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-5">
          {settings.loading ? (
            <p className="text-sm text-gray-500">Lade Einstellungen …</p>
          ) : (
            <>
              {!settings.browserSupport && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Dein Browser unterstützt keine Benachrichtigungen.
                  </p>
                </div>
              )}

              {settings.isIos && !settings.isStandalonePwa && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Auf dem iPhone: tigube zum Home-Bildschirm hinzufügen, um Push-Benachrichtigungen zu erhalten.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Browser-Berechtigung</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Status:{' '}
                    {settings.permission === 'granted'
                      ? 'Erlaubt'
                      : settings.permission === 'denied'
                        ? 'Verweigert'
                        : 'Nicht angefragt'}
                  </span>
                  {settings.permission !== 'granted' && (
                    <button
                      onClick={handleRequestPermission}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Berechtigung anfragen
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {settings.browserNotificationsEnabled ? (
                    <Bell className="w-4 h-4 text-blue-600" />
                  ) : (
                    <BellOff className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    Browser-Hinweise (Tab im Hintergrund)
                  </span>
                </div>
                <button
                  onClick={handleToggleBrowserNotifications}
                  disabled={settings.saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.browserNotificationsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.browserNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {settings.pushSupported && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Push-Benachrichtigungen
                    </span>
                  </div>
                  <button
                    onClick={handleTogglePush}
                    disabled={settings.saving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      settings.pushEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.pushEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">
                    E-Mail bei ungelesenen Nachrichten
                  </span>
                </div>
                <button
                  onClick={handleToggleEmailReminders}
                  disabled={settings.saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.emailRemindersEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.emailRemindersEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-gray-500">
                E-Mail-Erinnerungen werden gesendet, wenn du innerhalb einer Stunde keine neuen Nachrichten gelesen hast. Es werden keine Absendernamen oder Anzahlen genannt.
              </p>

              {settings.permission === 'granted' && (
                <button
                  onClick={testNotification}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                >
                  Test-Benachrichtigung senden
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
