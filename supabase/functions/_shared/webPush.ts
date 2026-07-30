import webpush from 'npm:web-push@3.6.7'

export interface PushPayload {
  title: string
  body: string
  url: string
}

export function configureWebPush() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:info@tigube.de'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  return webpush
}

export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<void> {
  const wp = configureWebPush()

  await wp.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  )
}

export function buildChatPushPayload(conversationId?: string): PushPayload {
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://tigube.de'
  const path = conversationId ? `/nachrichten/${conversationId}` : '/nachrichten'

  return {
    title: 'Neue Nachricht auf tigube',
    body: 'Du hast eine neue Nachricht erhalten.',
    url: `${siteUrl}${path}`,
  }
}
