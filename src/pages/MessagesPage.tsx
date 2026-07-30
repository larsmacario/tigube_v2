import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getUserConversations, getConversationWithUsers } from '../lib/supabase/chatService'
import type { ConversationWithUsers, Conversation } from '../lib/supabase/types'
import ConversationList from '../components/chat/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useNotifications } from '../lib/notifications/NotificationContext'
import { useAuth } from '../lib/auth/AuthContext'
import { MESSAGES_CHANGED_EVENT } from '../hooks/useUnreadMessagesRealtime'

const DEEP_LINK_RETRY_MS = 400
const REFRESH_DEBOUNCE_MS = 500

function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithUsers[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithUsers | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isResolvingChat, setIsResolvingChat] = useState(false)

  const navigate = useNavigate()
  const { conversationId } = useParams()
  const { refreshUnreadCount } = useNotifications()
  const { user, loading: authLoading } = useAuth()

  const currentUserId = user?.id ?? null
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevConversationIdRef = useRef<string | undefined>(undefined)
  const hasLoadedOnceRef = useRef(false)

  const resolveConversationFromUrl = useCallback(
    async (list: ConversationWithUsers[], userId: string, targetId: string) => {
      let match = list.find((c) => c.id === targetId)

      if (!match) {
        await new Promise((resolve) => setTimeout(resolve, DEEP_LINK_RETRY_MS))
        const { data: refetched } = await getConversationWithUsers(targetId, userId)
        if (refetched) {
          match = refetched
          setConversations((prev) => {
            if (prev.some((c) => c.id === refetched.id)) {
              return prev.map((c) => (c.id === refetched.id ? refetched : c))
            }
            return [refetched, ...prev]
          })
        }
      }

      return match ?? null
    },
    []
  )

  const requestFullListRefresh = useCallback(() => {
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current)
    }

    refreshDebounceRef.current = setTimeout(() => {
      setRefreshTrigger((prev) => prev + 1)
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  const handleConversationRealtimeUpdate = useCallback(
    (updated?: Conversation) => {
      if (!updated) {
        requestFullListRefresh()
        return
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === updated.id)
        if (index === -1) {
          requestFullListRefresh()
          return prev
        }

        const next = [...prev]
        next[index] = { ...next[index], ...updated }
        next.sort((a, b) => {
          const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
          const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
          return bTime - aTime
        })
        return next
      })
    },
    [requestFullListRefresh]
  )

  // Initial load + conversation switch (not background refresh)
  useEffect(() => {
    if (authLoading || !currentUserId) return

    const isConversationSwitch = conversationId !== prevConversationIdRef.current
    prevConversationIdRef.current = conversationId

    let cancelled = false

    const loadConversations = async () => {
      if (!hasLoadedOnceRef.current) {
        setIsInitialLoad(true)
      }

      setError(null)

      if (conversationId && (isConversationSwitch || !hasLoadedOnceRef.current)) {
        setIsResolvingChat(true)
        if (isConversationSwitch) {
          setSelectedConversation((prev) => (prev?.id === conversationId ? prev : null))
        }
      }

      const { data, error: loadError } = await getUserConversations(currentUserId)

      if (cancelled) return

      if (loadError) {
        setError(loadError)
        setConversations([])
        setSelectedConversation(null)
      } else {
        const list = data || []
        setConversations(list)

        if (conversationId) {
          const resolved = await resolveConversationFromUrl(list, currentUserId, conversationId)
          if (!cancelled) {
            setSelectedConversation(resolved)
          }
        } else {
          setSelectedConversation(null)
        }
      }

      if (!cancelled) {
        hasLoadedOnceRef.current = true
        setIsInitialLoad(false)
        setIsResolvingChat(false)
      }
    }

    loadConversations()

    return () => {
      cancelled = true
    }
  }, [currentUserId, authLoading, conversationId, resolveConversationFromUrl])

  // Silent background refresh (sidebar metadata only)
  useEffect(() => {
    if (authLoading || !currentUserId || refreshTrigger === 0 || !hasLoadedOnceRef.current) {
      return
    }

    let cancelled = false

    const refreshList = async () => {
      const { data, error: loadError } = await getUserConversations(currentUserId)

      if (cancelled) return

      if (loadError) {
        setError(loadError)
      } else {
        const list = data || []
        setConversations(list)
        // Sidebar refresh only – keep active chat mounted with stable props
      }

      refreshUnreadCount()
    }

    refreshList()

    return () => {
      cancelled = true
    }
  }, [refreshTrigger, currentUserId, authLoading, refreshUnreadCount])

  // Refresh conversation list when messages change (realtime)
  useEffect(() => {
    if (!currentUserId) return

    const handleMessagesChanged = () => {
      requestFullListRefresh()
    }

    window.addEventListener(MESSAGES_CHANGED_EVENT, handleMessagesChanged)
    return () => window.removeEventListener(MESSAGES_CHANGED_EVENT, handleMessagesChanged)
  }, [currentUserId, requestFullListRefresh])

  const handleConversationSelect = (id: string) => {
    navigate(`/nachrichten/${id}`, { replace: true })

    const conversation = conversations.find((c) => c.id === id)
    if (conversation) {
      setSelectedConversation(conversation)
      refreshUnreadCount()
    }
  }

  const handleMessageSent = useCallback(
    (message: { content: string; created_at: string | null; sender_id: string }) => {
      const convId = selectedConversation?.id
      if (!convId || !message.created_at) return

      const lastMessage = {
        content: message.content,
        created_at: message.created_at,
        sender_id: message.sender_id,
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                last_message: lastMessage,
                last_message_at: message.created_at,
                unread_count: 0,
              }
            : c
        )
      )

      setSelectedConversation((prev) =>
        prev && prev.id === convId
          ? {
              ...prev,
              last_message: lastMessage,
              last_message_at: message.created_at,
              unread_count: 0,
            }
          : prev
      )
    },
    [selectedConversation?.id]
  )

  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current)
      }
    }
  }, [])

  const handleBackToList = () => {
    navigate('/nachrichten', { replace: true })
    setSelectedConversation(null)
  }

  const handleConversationDeleted = (deletedConversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== deletedConversationId))

    if (selectedConversation?.id === deletedConversationId) {
      setSelectedConversation(null)
      navigate('/nachrichten', { replace: true })
    }
  }

  if (authLoading || !currentUserId) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 80px)' }}>
        <LoadingSpinner />
      </div>
    )
  }

  const showChatLoading = Boolean(
    conversationId && isResolvingChat && !selectedConversation
  )
  const showChatNotFound = Boolean(
    conversationId && !isResolvingChat && !isInitialLoad && !selectedConversation
  )

  return (
    <div className="bg-gray-50" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="container-custom h-full py-4">
        <div className="bg-white rounded-xl shadow-sm h-full flex overflow-hidden" style={{ height: 'calc(100% - 2rem)' }}>
          {selectedConversation && (
            <div className="lg:hidden absolute top-4 left-4 z-10">
              <button
                onClick={handleBackToList}
                className="p-2 bg-white text-gray-400 hover:text-gray-600 transition-colors rounded-lg shadow-md"
                aria-label="Zurück zur Übersicht"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          )}

          <div
            className={`
            w-full lg:w-80 xl:w-96 border-r border-gray-200 flex-shrink-0
            ${selectedConversation ? 'hidden lg:block' : 'block'}
          `}
          >
            <ConversationList
              conversations={conversations}
              currentUserId={currentUserId}
              selectedConversationId={selectedConversation?.id}
              onConversationSelect={handleConversationSelect}
              onConversationUpdate={handleConversationRealtimeUpdate}
              onConversationDeleted={handleConversationDeleted}
              isInitialLoad={isInitialLoad}
              error={error}
            />
          </div>

          <div
            className={`
            flex-1 min-w-0
            ${selectedConversation || showChatLoading || showChatNotFound ? 'block' : 'hidden lg:flex lg:items-center lg:justify-center'}
          `}
          >
            {showChatLoading ? (
              <div className="h-full flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : selectedConversation ? (
              <ChatWindow
                key={selectedConversation.id}
                conversation={selectedConversation}
                currentUserId={currentUserId}
                onBack={handleBackToList}
                onConversationDeleted={handleConversationDeleted}
                onMessageSent={handleMessageSent}
              />
            ) : showChatNotFound ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Konversation nicht gefunden</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Der Chat existiert nicht oder du hast keinen Zugriff.
                  </p>
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Zur Übersicht
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 21l1.98-5.874A8.955 8.955 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-600 mb-2">Wähle eine Konversation</h2>
                <p className="text-gray-500">Klicke auf eine Konversation links, um zu chatten</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessagesPage
