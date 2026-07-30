import { createContext, useContext, ReactNode, useMemo } from 'react'
import { useUnreadMessagesCount } from '../../hooks/useUnreadMessagesCount'

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