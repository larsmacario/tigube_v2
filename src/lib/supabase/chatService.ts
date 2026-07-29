import { supabase } from './client'
import type { 
  Conversation, 
  ConversationInsert, 
  ConversationWithUsers,
  Message, 
  MessageInsert, 
  MessageWithSender,
  SendMessageRequest,
  CreateConversationRequest,
  GetMessagesOptions,
  UnreadCount
} from './types'

/**
 * Get or create a conversation between a pet owner and caretaker
 */
export async function getOrCreateConversation(
  request: CreateConversationRequest
): Promise<{ data: Conversation | null; error: string | null }> {
  try {
    // First try to find existing conversation
    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('owner_id', request.owner_id)
      .eq('caretaker_id', request.caretaker_id)
      .maybeSingle()

    if (findError) {
      return { data: null, error: findError.message }
    }

    // If conversation exists, return it
    if (existingConversation) {
      return { data: existingConversation, error: null }
    }

    // Create new conversation
    const conversationData: ConversationInsert = {
      owner_id: request.owner_id,
      caretaker_id: request.caretaker_id,
      status: 'active'
    }

    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single()

    if (createError) {
      return { data: null, error: createError.message }
    }

    return { data: newConversation, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

async function enrichConversationWithUsers(
  conversation: Conversation,
  userId: string
): Promise<ConversationWithUsers> {
  const [ownerResult, caretakerResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, profile_photo_url')
      .eq('id', conversation.owner_id)
      .single(),
    supabase
      .from('users')
      .select('id, first_name, last_name, profile_photo_url')
      .eq('id', conversation.caretaker_id)
      .single()
  ])

  const owner = ownerResult.data || {
    id: conversation.owner_id,
    first_name: '',
    last_name: '',
    profile_photo_url: null
  }
  const caretaker = caretakerResult.data || {
    id: conversation.caretaker_id,
    first_name: '',
    last_name: '',
    profile_photo_url: null
  }

  const { data: latestMessage } = await supabase
    .from('messages')
    .select('id, content, created_at, sender_id, message_type, read_at')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { count: unreadCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversation.id)
    .neq('sender_id', userId)
    .is('read_at', null)

  return {
    ...conversation,
    owner,
    caretaker,
    last_message: latestMessage || undefined,
    unread_count: unreadCount || 0
  } as ConversationWithUsers
}

/**
 * Load a single conversation with user details (deep links / post-create navigation)
 */
export async function getConversationWithUsers(
  conversationId: string,
  userId: string
): Promise<{ data: ConversationWithUsers | null; error: string | null }> {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (error) {
      return { data: null, error: error.message }
    }

    if (!conversation) {
      return { data: null, error: null }
    }

    if (conversation.owner_id !== userId && conversation.caretaker_id !== userId) {
      return { data: null, error: 'Kein Zugriff auf diese Konversation' }
    }

    const enriched = await enrichConversationWithUsers(conversation, userId)
    return { data: enriched, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get all conversations for a user with user details and last message
 */
export async function getUserConversations(
  userId: string
): Promise<{ data: ConversationWithUsers[] | null; error: string | null }> {
  try {
    // Use simple query without problematic joins and fetch user data separately
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`owner_id.eq.${userId},caretaker_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Conversations query error:', error)
      return { data: [], error: null } // Return empty array for new accounts
    }

    // If no conversations found, return empty array (normal for new accounts)
    if (!conversations || conversations.length === 0) {
      return { data: [], error: null }
    }

    const conversationsWithLastMessage = await Promise.all(
      conversations.map((conversation) => enrichConversationWithUsers(conversation, userId))
    )

    return { data: conversationsWithLastMessage, error: null }
  } catch (error) {
    console.error('Unexpected error in getUserConversations:', error)
    // For new accounts or any other errors, return empty array instead of error
    return { data: [], error: null }
  }
}

/**
 * Get messages for a conversation with pagination
 */
export async function getMessages(
  options: GetMessagesOptions
): Promise<{ data: MessageWithSender[] | null; error: string | null }> {
  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(id, first_name, last_name, profile_photo_url)
      `)
      .eq('conversation_id', options.conversation_id)
      .order('created_at', { ascending: false })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    if (options.before) {
      query = query.lt('created_at', options.before)
    }

    const { data: messages, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    // Reverse to show oldest first in UI
    const sortedMessages = messages?.reverse() as MessageWithSender[]

    return { data: sortedMessages, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

const MESSAGE_LOAD_RETRY_DELAY_MS = 400

/**
 * Load messages with one retry for transient auth/session races on first visit
 */
export async function getMessagesWithRetry(
  options: GetMessagesOptions,
  retriesLeft = 1
): Promise<{ data: MessageWithSender[] | null; error: string | null }> {
  const result = await getMessages(options)
  if (result.error && retriesLeft > 0) {
    await new Promise((resolve) => setTimeout(resolve, MESSAGE_LOAD_RETRY_DELAY_MS))
    return getMessagesWithRetry(options, retriesLeft - 1)
  }
  return result
}

/**
 * Send a new message in a conversation
 */
export async function sendMessage(
  request: SendMessageRequest
): Promise<{ data: Message | null; error: string | null }> {
  try {
    // Get current user ID from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: 'User not authenticated' }
    }

    const messageData: MessageInsert = {
      conversation_id: request.conversation_id,
      sender_id: user.id,
      content: request.content,
      message_type: request.message_type || 'text'
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: message, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Mark messages as read for a user in a conversation
 */
export async function markAsRead(
  conversationId: string,
  userId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null)

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get unread message count for a user across all conversations
 */
export async function getUnreadCount(
  userId: string
): Promise<{ data: UnreadCount[] | null; error: string | null }> {
  try {
    // Get all conversations for the user
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .or(`owner_id.eq.${userId},caretaker_id.eq.${userId}`)

    if (conversationsError) {
      return { data: null, error: conversationsError.message }
    }

    // Get unread count for each conversation
    const unreadCounts = await Promise.all(
      conversations.map(async (conversation) => {
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conversation.id)
          .neq('sender_id', userId)
          .is('read_at', null)

        return {
          conversation_id: conversation.id,
          count: unreadMessages?.length || 0
        }
      })
    )

    return { data: unreadCounts, error: null }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Subscribe to real-time messages for a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void,
  onError?: (error: string) => void
) {
  const subscription = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        onMessage(payload.new as Message)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to messages for conversation:', conversationId)
      } else if (status === 'CHANNEL_ERROR') {
        onError?.('Failed to subscribe to messages')
      }
    })

  return subscription
}

/**
 * Subscribe to real-time conversation updates
 */
export function subscribeToConversations(
  userId: string,
  onUpdate: (conversation: Conversation) => void,
  onDelete?: (conversationId: string) => void,
  onError?: (error: string) => void
) {
  const subscription = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `or(owner_id.eq.${userId},caretaker_id.eq.${userId})`
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          // Handle conversation deletion
          onDelete?.(payload.old.id)
        } else {
          // Handle conversation updates/inserts
          onUpdate(payload.new as Conversation)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to conversations for user:', userId)
      } else if (status === 'CHANNEL_ERROR') {
        onError?.('Failed to subscribe to conversations')
      }
    })

  return subscription
}

/**
 * Enhanced real-time message subscription with sender info
 */
export function subscribeToMessagesWithSender(
  conversationId: string,
  onMessage: (message: MessageWithSender) => void,
  onError?: (error: string) => void
) {
  const subscription = supabase
    .channel(`messages_enhanced:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        try {
          // Fetch the complete message with sender info
          const { data: messageWithSender, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!sender_id(id, first_name, last_name, profile_photo_url)
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            onError?.(`Failed to fetch message details: ${error.message}`)
            return
          }

          onMessage(messageWithSender as MessageWithSender)
        } catch (error) {
          onError?.(`Error processing real-time message: ${error}`)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to enhanced messages for conversation:', conversationId)
      } else if (status === 'CHANNEL_ERROR') {
        onError?.('Failed to subscribe to enhanced messages')
      }
    })

  return subscription
}

/**
 * Subscribe to typing indicators for a conversation
 */
export function subscribeToTypingIndicators(
  conversationId: string,
  currentUserId: string,
  onTypingStart: (userId: string) => void,
  onTypingStop: (userId: string) => void,
  onError?: (error: string) => void
) {
  const subscription = supabase
    .channel(`typing:${conversationId}`)
    .on(
      'broadcast',
      { event: 'typing_start' },
      (payload) => {
        if (payload.payload.userId !== currentUserId) {
          onTypingStart(payload.payload.userId)
        }
      }
    )
    .on(
      'broadcast',
      { event: 'typing_stop' },
      (payload) => {
        if (payload.payload.userId !== currentUserId) {
          onTypingStop(payload.payload.userId)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to typing indicators for conversation:', conversationId)
      } else if (status === 'CHANNEL_ERROR') {
        onError?.('Failed to subscribe to typing indicators')
      }
    })

  return subscription
}

/**
 * Send typing indicator
 */
export function sendTypingIndicator(
  conversationId: string,
  userId: string,
  isTyping: boolean
) {
  const channel = supabase.channel(`typing:${conversationId}`)
  
  channel.send({
    type: 'broadcast',
    event: isTyping ? 'typing_start' : 'typing_stop',
    payload: { userId, conversationId }
  })
}

/**
 * Subscribe to online presence for users
 */
export function subscribeToUserPresence(
  conversationId: string,
  currentUserId: string,
  onUserOnline: (userId: string) => void,
  onUserOffline: (userId: string) => void,
  onError?: (error: string) => void
) {
  const subscription = supabase
    .channel(`presence:${conversationId}`)
    .on('presence', { event: 'sync' }, () => {
      const state = subscription.presenceState()
      Object.keys(state).forEach(userId => {
        if (userId !== currentUserId) {
          onUserOnline(userId)
        }
      })
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (key !== currentUserId) {
        onUserOnline(key)
      }
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (key !== currentUserId) {
        onUserOffline(key)
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track current user's presence
        await subscription.track({
          userId: currentUserId,
          online_at: new Date().toISOString()
        })
        console.log('Subscribed to presence for conversation:', conversationId)
      } else if (status === 'CHANNEL_ERROR') {
        onError?.('Failed to subscribe to user presence')
      }
    })

  return subscription
}

/**
 * Connection status manager
 */
export class ConnectionManager {
  private subscriptions: Map<string, any> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  addSubscription(key: string, subscription: any) {
    this.subscriptions.set(key, subscription)
  }

  removeSubscription(key: string) {
    const subscription = this.subscriptions.get(key)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  removeAllSubscriptions() {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe()
    })
    this.subscriptions.clear()
  }

  async handleReconnect(onReconnect?: () => void) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    
    try {
      // Remove all old subscriptions
      this.removeAllSubscriptions()
      
      // Trigger reconnection callback
      onReconnect?.()
      
      this.reconnectAttempts = 0
      console.log('Successfully reconnected')
    } catch (error) {
      console.error('Reconnection failed:', error)
      await this.handleReconnect(onReconnect)
    }
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<{ error: string | null }> {
  try {
    console.log('🗑️ deleteConversation called with:', { conversationId, userId })
    
    // First verify that the user is part of this conversation
    console.log('Step 1: Verifying user authorization...')
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('owner_id, caretaker_id')
      .eq('id', conversationId)
      .single()

    console.log('Authorization check result:', { conversation, fetchError })

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError.message)
      return { error: fetchError.message }
    }

    if (!conversation) {
      console.error('❌ Conversation not found')
      return { error: 'Conversation not found' }
    }

    // Verify user is owner or caretaker
    const isAuthorized = conversation.owner_id === userId || conversation.caretaker_id === userId
    console.log('Authorization check:', {
      owner_id: conversation.owner_id,
      caretaker_id: conversation.caretaker_id,
      userId,
      isAuthorized
    })

    if (!isAuthorized) {
      console.error('❌ Not authorized to delete this conversation')
      return { error: 'Not authorized to delete this conversation' }
    }

    // Delete all messages first (foreign key constraint)
    console.log('Step 2: Deleting messages...')
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)

    console.log('Messages deletion result:', { messagesError })

    if (messagesError) {
      console.error('❌ Failed to delete messages:', messagesError.message)
      return { error: `Failed to delete messages: ${messagesError.message}` }
    }

    // Delete the conversation
    console.log('Step 3: Deleting conversation...')
    const { error: conversationError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    console.log('Conversation deletion result:', { conversationError })

    if (conversationError) {
      console.error('❌ Failed to delete conversation:', conversationError.message)
      return { error: `Failed to delete conversation: ${conversationError.message}` }
    }

    console.log('✅ Conversation deleted successfully')
    return { error: null }
  } catch (error) {
    console.error('❌ Unexpected error in deleteConversation:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
} 