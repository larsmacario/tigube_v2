import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getUserConversations, getConversationWithUsers } from '../lib/supabase/chatService'
import type { ConversationWithUsers } from '../lib/supabase/types'
import ConversationList from '../components/chat/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useNotifications } from '../lib/notifications/NotificationContext'
import { useAuth } from '../lib/auth/AuthContext'

const DEEP_LINK_RETRY_MS = 400

function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithUsers[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithUsers | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isResolvingChat, setIsResolvingChat] = useState(false)

  const navigate = useNavigate()
  const { conversationId } = useParams()
  const { refreshUnreadCount } = useNotifications()
  const { user, loading: authLoading } = useAuth()

  const currentUserId = user?.id ?? null

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

  // Load conversations
  useEffect(() => {
    if (authLoading || !currentUserId) return

    let cancelled = false

    const loadConversations = async () => {
      setIsLoading(true)
      setError(null)
      if (conversationId) {
        setIsResolvingChat(true)
      }

      const { data, error: loadError } = await getUserConversations(currentUserId)

      if (cancelled) return

      if (loadError) {
        setError(loadError)
        setConversations([])
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
        setIsLoading(false)
        setIsResolvingChat(false)
      }
    }

    loadConversations()

    return () => {
      cancelled = true
    }
  }, [currentUserId, authLoading, refreshTrigger, conversationId, resolveConversationFromUrl])

  const handleConversationSelect = (id: string) => {
    navigate(`/nachrichten/${id}`, { replace: true })

    const conversation = conversations.find((c) => c.id === id)
    if (conversation) {
      setSelectedConversation(conversation)
      refreshUnreadCount()
    }
  }

  const handleConversationUpdate = () => {
    setRefreshTrigger((prev) => prev + 1)
    refreshUnreadCount()
  }

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

  const showChatLoading = Boolean(conversationId && (isResolvingChat || isLoading))
  const showChatNotFound =
    Boolean(conversationId && !isResolvingChat && !isLoading && !selectedConversation)

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
              onConversationUpdate={handleConversationUpdate}
              onConversationDeleted={handleConversationDeleted}
              isLoading={isLoading}
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
                conversation={selectedConversation}
                currentUserId={currentUserId}
                onBack={handleBackToList}
                onConversationDeleted={handleConversationDeleted}
                onMessageSent={handleConversationUpdate}
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
