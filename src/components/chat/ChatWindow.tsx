import { useState, useEffect, useRef } from 'react'
import { MoreVertical, Settings, Trash2, ArrowLeft } from 'lucide-react'
import { 
  getMessages, 
  sendMessage, 
  markAsRead,
  subscribeToMessagesWithSender,
  subscribeToTypingIndicators,
  subscribeToUserPresence,
  sendTypingIndicator,
  deleteConversation,
  ConnectionManager
} from '../../lib/supabase/chatService'
import type { MessageWithSender, ConversationWithUsers } from '../../lib/supabase/types'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import UserAvatar from './UserAvatar'
import LoadingSpinner from '../ui/LoadingSpinner'
import NotificationSettings from './NotificationSettings'
import SaveCaretakerButton from './SaveCaretakerButton'
import { notificationManager } from '../../lib/notifications/NotificationManager'
import { useNotifications } from '../../lib/notifications/NotificationContext'

interface ChatWindowProps {
  conversation: ConversationWithUsers
  currentUserId: string
  onBack?: () => void
  onConversationDeleted?: (conversationId: string) => void
  onMessageSent?: () => void
}

function ChatWindow({ conversation, currentUserId, onBack, onConversationDeleted, onMessageSent }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [otherUserOnline, setOtherUserOnline] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const connectionManagerRef = useRef<ConnectionManager>(new ConnectionManager())
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  
  // Get notification functions
  const { refreshUnreadCount } = useNotifications()

  // Determine the other user (not current user)
  const otherUser = conversation?.owner?.id === currentUserId 
    ? conversation?.caretaker 
    : conversation?.owner

  const getDisplayName = () => {
    if (!otherUser) return 'Unbekannt';
    const firstName = otherUser.first_name || ''
    const lastName = otherUser.last_name || ''
    return `${firstName} ${lastName}`.trim() || 'Unbekannt'
  }

  // Request notification permission on component mount
  useEffect(() => {
    notificationManager.requestPermission()
  }, [])

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true)
      sendTypingIndicator(conversation.id, currentUserId, true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTypingIndicator(conversation.id, currentUserId, false)
    }, 2000)
  }

  const handleTypingStop = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (isTyping) {
      setIsTyping(false)
      sendTypingIndicator(conversation.id, currentUserId, false)
    }
  }

  // Load messages and setup real-time subscriptions
  useEffect(() => {
    if (!otherUser) {
      setIsLoading(false)
      setError('User-Daten nicht verfügbar')
      return
    }

    const loadMessages = async () => {
      setIsLoading(true)
      setError(null)

      const { data, error: loadError } = await getMessages({
        conversation_id: conversation.id,
        limit: 50
      })

      if (loadError) {
        setError(loadError)
      } else {
        setMessages(data || [])
        // Mark messages as read and refresh unread count
        if (data && data.length > 0) {
          await markAsRead(conversation.id, currentUserId)
          // Refresh the unread count after marking as read
          refreshUnreadCount()
        }
      }

      setIsLoading(false)
    }

    const setupRealtimeSubscriptions = () => {
      const connectionManager = connectionManagerRef.current

      // Subscribe to new messages
      const messagesSubscription = subscribeToMessagesWithSender(
        conversation.id,
        (newMessage) => {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })

          // Mark as read if from other user and refresh unread count
          if (newMessage.sender_id !== currentUserId) {
            markAsRead(conversation.id, currentUserId).then(() => {
              // Refresh the unread count after marking as read
              refreshUnreadCount()
            })
          }

          // Show notification for messages from other users
          if (newMessage.sender_id !== currentUserId) {
            const senderName = newMessage.sender 
              ? `${newMessage.sender.first_name || ''} ${newMessage.sender.last_name || ''}`.trim()
              : 'Unbekannt'
            
            // Show browser notification
            notificationManager.showChatNotification(
              senderName,
              newMessage.content,
              conversation.id,
              () => {
                // Focus the chat when notification is clicked
                window.focus()
              }
            )
          }
        },
        (error) => {
          console.error('Messages subscription error:', error)
          setError(error)
        }
      )

      // Subscribe to typing indicators
      const typingSubscription = subscribeToTypingIndicators(
        conversation.id,
        currentUserId,
        (userId) => {
          if (otherUser && userId === otherUser.id) {
            setOtherUserTyping(true)
          }
        },
        (userId) => {
          if (otherUser && userId === otherUser.id) {
            setOtherUserTyping(false)
          }
        },
        (error) => {
          console.error('Typing subscription error:', error)
        }
      )

      // Subscribe to user presence
      const presenceSubscription = subscribeToUserPresence(
        conversation.id,
        currentUserId,
        (userId) => {
          if (otherUser && userId === otherUser.id) {
            setOtherUserOnline(true)
          }
        },
        (userId) => {
          if (otherUser && userId === otherUser.id) {
            setOtherUserOnline(false)
          }
        },
        (error) => {
          console.error('Presence subscription error:', error)
        }
      )

      connectionManager.addSubscription('messages', messagesSubscription)
      connectionManager.addSubscription('typing', typingSubscription)
      connectionManager.addSubscription('presence', presenceSubscription)
    }

    // Monitor online status
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine)
      if (!navigator.onLine) {
        // Handle reconnection when coming back online
        connectionManagerRef.current.handleReconnect(setupRealtimeSubscriptions)
      }
    }

    loadMessages()
    setupRealtimeSubscriptions()

    // Add online/offline listeners
    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)

    return () => {
      // Cleanup subscriptions
      connectionManagerRef.current.removeAllSubscriptions()
      window.removeEventListener('online', handleOnlineStatus)
      window.removeEventListener('offline', handleOnlineStatus)
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [conversation.id, currentUserId, otherUser?.id])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isLoading) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Handle sending new message
  const handleSendMessage = async (content: string) => {
    const { data, error: sendError } = await sendMessage({
      conversation_id: conversation.id,
      content
    })

    if (sendError) {
      throw new Error(sendError)
    }

    if (data) {
      // Create a MessageWithSender object for the new message
      const newMessageWithSender: MessageWithSender = {
        ...data,
        sender: {
          id: currentUserId,
          first_name: 'Du', // Placeholder - will be replaced by real user data in future
          last_name: '',
          profile_photo_url: null
        }
      }

      setMessages(prev => [...prev, newMessageWithSender])
      
      // Notify parent component that a message was sent
      onMessageSent?.()
    }
  }

  // Handle clicking outside the more menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  const handleDeleteChat = async () => {
    setShowMoreMenu(false)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      // Delete the entire conversation and all messages
      const { error } = await deleteConversation(conversation.id, currentUserId)
      
      if (error) {
        console.error('Error deleting chat:', error)
        return
      }
      
      // Notify parent components about deletion
      if (onConversationDeleted) {
        onConversationDeleted(conversation.id)
      }
      
      // Navigate back to messages list
      if (onBack) {
        onBack()
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    } finally {
      setShowDeleteModal(false)
      setIsDeleting(false)
    }
  }

  if (!otherUser) {
    console.error('ChatWindow: Anderer User nicht gefunden in Konversation:', conversation)
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-medium">Fehler beim Laden des Chats</p>
          <p className="text-gray-500 text-sm mt-1">User-Daten nicht verfügbar</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Zurück
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-medium">Fehler beim Laden des Chats</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b-2 border-gray-200 px-4 py-4 h-[72px] flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <UserAvatar user={otherUser} size="md" showOnline={otherUserOnline} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getDisplayName()}
              </h2>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-500">
                  {otherUserOnline ? 'Online' : 'Zuletzt aktiv'}
                </p>
                <div className={`w-2 h-2 rounded-full ${otherUserOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 relative">
            {/* Nur anzeigen wenn der aktuelle Benutzer der Owner ist */}
            {conversation.owner?.id === currentUserId && otherUser?.id && (
              <SaveCaretakerButton
                ownerId={currentUserId}
                caretakerId={otherUser.id}
                conversationId={conversation.id}
                onSaved={() => {
                  console.log('Betreuer erfolgreich gespeichert')
                }}
                onRemoved={() => {
                  console.log('Betreuer erfolgreich entfernt')
                }}
              />
            )}

            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Mehr Optionen"
              title="Mehr Optionen"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <div
                ref={moreMenuRef}
                className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]"
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowNotificationSettings(true)
                      setShowMoreMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Einstellungen
                  </button>
                  <button
                    onClick={handleDeleteChat}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    Chat löschen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col justify-end"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <UserAvatar user={otherUser} size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Chat mit {getDisplayName()}
              </h3>
              <p className="text-gray-500 text-sm">
                Schreibe die erste Nachricht, um die Unterhaltung zu beginnen.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => {
              const isOwnMessage = message.sender_id === currentUserId
              const previousMessage = messages[index - 1]
              const showAvatar = !previousMessage || 
                previousMessage.sender_id !== message.sender_id ||
                (new Date(message.created_at || '').getTime() - 
                 new Date(previousMessage.created_at || '').getTime()) > 300000 // 5 minutes

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showAvatar={showAvatar}
                  showTimestamp={true}
                />
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing Indicator */}
      {otherUserTyping && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <UserAvatar user={otherUser} size="sm" />
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">{getDisplayName()} schreibt</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        placeholder={`Nachricht an ${getDisplayName()}...`}
      />

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

             {/* Delete Modal */}
       {showDeleteModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
             <div className="flex items-center mb-4">
               <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                 <Trash2 className="w-5 h-5 text-red-600" />
               </div>
               <h2 className="text-lg font-semibold text-gray-900">Chat löschen</h2>
             </div>
             
             <p className="text-gray-700 mb-6 leading-relaxed">
               Möchtest du den Chat mit <span className="font-medium">{getDisplayName()}</span> wirklich löschen? 
               Diese Aktion kann nicht rückgängig gemacht werden und alle Nachrichten werden permanent entfernt.
             </p>
             
             <div className="flex justify-end space-x-3">
               <button
                 onClick={() => setShowDeleteModal(false)}
                 className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                 disabled={isDeleting}
               >
                 Abbrechen
               </button>
               <button
                 onClick={handleConfirmDelete}
                 className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                 disabled={isDeleting}
               >
                 {isDeleting ? (
                   <>
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                     Löschen...
                   </>
                 ) : (
                   <>
                     <Trash2 className="w-4 h-4 mr-2" />
                     Löschen
                   </>
                 )}
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}

export default ChatWindow 