import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { buildChatPushPayload, sendPushToSubscription } from '../_shared/webPush.ts'
import { buildUnreadMessagesEmail, sendMail } from '../_shared/smtpMail.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey
    )

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://tigube.de'
    const results = {
      pushProcessed: 0,
      pushSent: 0,
      emailsSent: 0,
      emailsSkipped: 0,
    }

    // Process push queue
    const { data: pushQueue, error: pushError } = await supabase
      .from('message_push_queue')
      .select('id, recipient_user_id, conversation_id')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(100)

    if (pushError) {
      return jsonResponse({ error: pushError.message }, 500)
    }

    for (const item of pushQueue ?? []) {
      const { data: userPrefs } = await supabase
        .from('users')
        .select('push_notifications_enabled')
        .eq('id', item.recipient_user_id)
        .maybeSingle()

      if (userPrefs?.push_notifications_enabled !== false) {
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', item.recipient_user_id)

        const payload = buildChatPushPayload(item.conversation_id)
        const staleEndpoints: string[] = []

        for (const sub of subscriptions ?? []) {
          try {
            await sendPushToSubscription(sub, payload)
            results.pushSent++
          } catch {
            staleEndpoints.push(sub.endpoint)
          }
        }

        if (staleEndpoints.length) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', item.recipient_user_id)
            .in('endpoint', staleEndpoints)
        }
      }

      await supabase
        .from('message_push_queue')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', item.id)

      results.pushProcessed++
    }

    // Process email reminders
    const { data: dueReminders, error: reminderError } = await supabase
      .from('message_email_reminders')
      .select('user_id, scheduled_for')
      .is('sent_at', null)
      .lte('scheduled_for', new Date().toISOString())

    if (reminderError) {
      return jsonResponse({ error: reminderError.message }, 500)
    }

    for (const reminder of dueReminders ?? []) {
      const { data: userRow } = await supabase
        .from('users')
        .select('email, email_message_reminders_enabled')
        .eq('id', reminder.user_id)
        .maybeSingle()

      if (userRow?.email_message_reminders_enabled === false || !userRow?.email) {
        await supabase.from('message_email_reminders').delete().eq('user_id', reminder.user_id)
        results.emailsSkipped++
        continue
      }

      const { data: unreadCount } = await supabase.rpc('get_total_unread_count', {
        p_user_id: reminder.user_id,
      })

      if (!unreadCount || unreadCount === 0) {
        await supabase.from('message_email_reminders').delete().eq('user_id', reminder.user_id)
        results.emailsSkipped++
        continue
      }

      const emailContent = buildUnreadMessagesEmail(siteUrl)
      await sendMail({
        to: userRow.email,
        subject: emailContent.subject,
        text: emailContent.text,
      })

      await supabase
        .from('message_email_reminders')
        .update({ sent_at: new Date().toISOString() })
        .eq('user_id', reminder.user_id)

      results.emailsSent++
    }

    return jsonResponse(results)
  } catch (error) {
    console.error('process-message-notifications error:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})
