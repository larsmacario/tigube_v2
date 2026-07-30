import { createContext, useContext, ReactNode, useMemo, useEffect, useRef } from 'react'
import { useUnreadMessagesCount } from '../../hooks/useUnreadMessagesCount'
import { useUnreadMessagesRealtime } from '../../hooks/useUnreadMessagesRealtime'
import { useAuth } from '../auth/AuthContext'
import { notificationManager } from './NotificationManager'
import { pushNotificationManager } from './PushNotificationManager'
import { getNotificationPreferences } from './notificationPreferencesService'
import { supabase } from '../supabase/client'

interface NotificationContextType {
  unreadCount: number
  isLoading: boolean
  refreshUnreadCount: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { unreadCount, isLoading, refresh } = useUnreadMessagesCount()
  const { userProfile, isAuthenticated } = useAuth()
  const userId = userProfile?.id as string | undefined

  useUnreadMessagesRealtime(userId, refresh)

  // Sync push subscription after login
  useEffect(() => {
    if (!isAuthenticated || !userId) return

    const syncPush = async () => {
      const prefs = await getNotificationPreferences(userId)
      if (prefs.push_notifications_enabled) {
        await pushNotificationManager.syncSubscription(userId, true)
      }
    }

    syncPush()
  }, [isAuthenticated, userId])

  // Global in-tab notification fallback for incoming messages
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`global-notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const message = payload.new as { sender_id: string; conversation_id: string }
          if (message.sender_id === userId) return

          notificationManager.showChatNotification(message.conversation_id, () => {
            window.location.href = `/nachrichten/${message.conversation_id}`
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const value = useMemo(
    () => ({
      unreadCount,
      isLoading,
      refreshUnreadCount: refresh,
    }),
    [unreadCount, isLoading, refresh]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
