import type { Database } from './database.types'

// Base types from database
export type User = Database['public']['Tables']['users']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']

export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']

// Extended types for UI
export interface ConversationWithUsers extends Conversation {
  owner: Pick<User, 'id' | 'first_name' | 'last_name' | 'profile_photo_url'>
  caretaker: Pick<User, 'id' | 'first_name' | 'last_name' | 'profile_photo_url'>
  last_message?: {
    content: string
    created_at: string
    sender_id: string
  }
  unread_count: number
}

export interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'first_name' | 'last_name' | 'profile_photo_url'>
}

// Request types
export interface CreateConversationRequest {
  owner_id: string
  caretaker_id: string
}

export interface SendMessageRequest {
  conversation_id: string
  content: string
  message_type?: string
  sender_id?: string
}

export interface GetMessagesOptions {
  conversation_id: string
  limit?: number
  offset?: number
  before?: string
}

export interface UnreadCount {
  conversation_id: string
  count: number
}

// Owner caretaker connection types
export type OwnerCaretakerConnection = Database['public']['Tables']['owner_caretaker_connections']['Row']
export type OwnerCaretakerConnectionInsert = Database['public']['Tables']['owner_caretaker_connections']['Insert']
export type OwnerCaretakerConnectionUpdate = Database['public']['Tables']['owner_caretaker_connections']['Update']

/** Ein Job auf dem öffentlichen Tierhalter-Profil (nur offene Jobs) */
export interface PublicOwnerJob {
  id: string
  title: string
  description: string
  date_from: string | null
  date_to: string | null
  location_text: string | null
  service_tags: string[] | null
  budget_hint: string | null
  pets: { id: string; name: string }[]
}

// Öffentliches Tierhalter-Profil (/owner/:id): nur Profilbild, Über mich, Tiere, offene Jobs.
// Keine Kontaktdaten — Kommunikation läuft über den Chat.
export interface PublicOwnerProfile {
  id: string
  first_name: string
  last_name: string
  profile_photo_url?: string | null
  /** Kurzer Teaser im Profil-Header (öffentlich) */
  short_intro?: string | null
  about_me?: string | null
  pets?: Array<{
    id: string
    name: string
    type: string
    breed?: string | null
    age?: number | null
    photo_url?: string | null
    gender?: string | null
    neutered?: boolean | null
  }>
  share_settings?: {
    aboutMe: boolean
    profilePhoto: boolean
    petDetails: boolean
  }
  jobs?: PublicOwnerJob[]
}
