import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { buildChatPushPayload, sendPushToSubscription } from '../_shared/webPush.ts'

interface PushRequest {
  recipient_user_id?: string
  conversation_id?: string
}

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

    const body: PushRequest = await req.json().catch(() => ({}))
    const recipientUserId = body.recipient_user_id
    const conversationId = body.conversation_id

    if (!recipientUserId) {
      return jsonResponse({ error: 'recipient_user_id required' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey
    )

    const { data: userPrefs } = await supabase
      .from('users')
      .select('push_notifications_enabled')
      .eq('id', recipientUserId)
      .maybeSingle()

    if (userPrefs?.push_notifications_enabled === false) {
      return jsonResponse({ sent: 0, skipped: 'push disabled' })
    }

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', recipientUserId)

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    if (!subscriptions?.length) {
      return jsonResponse({ sent: 0, skipped: 'no subscriptions' })
    }

    const payload = buildChatPushPayload(conversationId)
    let sent = 0
    const staleEndpoints: string[] = []

    for (const sub of subscriptions) {
      try {
        await sendPushToSubscription(sub, payload)
        sent++
      } catch (pushError) {
        console.error('Push failed for endpoint:', sub.endpoint, pushError)
        staleEndpoints.push(sub.endpoint)
      }
    }

    if (staleEndpoints.length) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', recipientUserId)
        .in('endpoint', staleEndpoints)
    }

    return jsonResponse({ sent, staleRemoved: staleEndpoints.length })
  } catch (error) {
    console.error('send-push-notification error:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})
