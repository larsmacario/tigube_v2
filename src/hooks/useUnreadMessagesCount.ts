import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth/AuthContext'
import { getTotalUnreadCount } from '../lib/supabase/chatService'

export function useUnreadMessagesCount() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, userProfile } = useAuth()

  const updateUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !userProfile?.id) {
      setUnreadCount(0)
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await getTotalUnreadCount(userProfile.id)

      if (error) {
        setUnreadCount(0)
        return
      }

      setUnreadCount(data)
    } catch (error) {
      console.error('Error fetching unread count:', error)
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, userProfile?.id])

  useEffect(() => {
    updateUnreadCount()
  }, [updateUnreadCount])

  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(updateUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, updateUnreadCount])

  return {
    unreadCount,
    isLoading,
    refresh: updateUnreadCount,
  }
}
