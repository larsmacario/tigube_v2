import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase/client'

const DEBOUNCE_MS = 400

export const MESSAGES_CHANGED_EVENT = 'tigube:messages-changed'

function dispatchMessagesChanged() {
  window.dispatchEvent(new CustomEvent(MESSAGES_CHANGED_EVENT))
}

/**
 * Subscribe to message INSERT/UPDATE events for realtime unread refresh.
 * RLS ensures users only receive events for their conversations.
 */
export function useUnreadMessagesRealtime(
  userId: string | null | undefined,
  onRefresh: () => void
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!userId) return

    const scheduleRefresh = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        onRefreshRef.current()
        dispatchMessagesChanged()
      }, DEBOUNCE_MS)
    }

    const channel = supabase
      .channel(`unread-messages:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        scheduleRefresh
      )
      .subscribe()

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [userId])
}
