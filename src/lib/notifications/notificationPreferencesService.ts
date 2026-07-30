import { supabase } from '../supabase/client'

export interface NotificationPreferences {
  push_notifications_enabled: boolean
  email_message_reminders_enabled: boolean
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from('users')
    .select('push_notifications_enabled, email_message_reminders_enabled')
    .eq('id', userId)
    .maybeSingle()

  return {
    push_notifications_enabled: data?.push_notifications_enabled ?? true,
    email_message_reminders_enabled: data?.email_message_reminders_enabled ?? true,
  }
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('users')
    .update(preferences)
    .eq('id', userId)

  return { error: error?.message ?? null }
}
