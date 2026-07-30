import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth/AuthContext'
import { getUserConversations } from '../lib/supabase/chatService'

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
      const { data: conversations, error } = await getUserConversations(userProfile.id)

      if (error || !conversations) {
        setUnreadCount(0)
        return
      }

      const totalUnread = conversations.reduce((total, conversation) => {
        return total + (conversation.unread_count || 0)
      }, 0)

      if (import.meta.env.DEV) {
        console.log('Unread messages count:', {
          conversations: conversations.length,
          conversationsWithUnread: conversations.filter((c) => (c.unread_count || 0) > 0),
          totalUnread,
        })
      }

      setUnreadCount(totalUnread)
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