import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

export interface SendMailOptions {
  to: string
  subject: string
  text: string
}

function getSmtpConfig() {
  const host = Deno.env.get('SMTP_HOST')
  const port = Number(Deno.env.get('SMTP_PORT') ?? '587')
  const user = Deno.env.get('SMTP_USER')
  const password = Deno.env.get('SMTP_PASSWORD')
  const from = Deno.env.get('SMTP_FROM')
  const secure = (Deno.env.get('SMTP_SECURE') ?? 'false').toLowerCase() === 'true'

  if (!host || !user || !password || !from) {
    throw new Error('SMTP configuration incomplete')
  }

  return { host, port, user, password, from, secure }
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const { host, port, user, password, from, secure } = getSmtpConfig()

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: secure,
      auth: {
        username: user,
        password,
      },
    },
  })

  await client.send({
    from,
    to: options.to,
    subject: options.subject,
    content: options.text,
  })

  await client.close()
}

export function buildUnreadMessagesEmail(siteUrl: string): { subject: string; text: string } {
  const messagesUrl = `${siteUrl.replace(/\/$/, '')}/nachrichten`

  return {
    subject: 'Neue Nachrichten auf tigube',
    text: [
      'Hallo,',
      '',
      'auf tigube warten ungelesene Nachrichten auf dich.',
      '',
      `Melde dich an, um sie zu lesen: ${messagesUrl}`,
      '',
      'Viele Grüße',
      'dein tigube-Team',
    ].join('\n'),
  }
}
