# Chat-Benachrichtigungen – Setup

## Übersicht

- **Unread-Badge:** Echtzeit + RPC `get_total_unread_count`
- **Push (PWA):** Web Push via Service Worker + `push_subscriptions`
- **E-Mail:** SMTP nach 1 h ungelesener Nachrichten (generisch, ohne Namen/Anzahl)

## Edge Functions (deployed auf tigube)

| Function | Status | Zweck |
|----------|--------|-------|
| `send-push-notification` | ACTIVE | Push an einzelnen User |
| `process-message-notifications` | ACTIVE | Push-Queue + E-Mail-Reminder (Cron) |

## Supabase Secrets (Edge Functions)

Im Dashboard unter **Project Settings → Edge Functions → Secrets** setzen:

```bash
# Web Push (VAPID) – erzeugen mit: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:info@tigube.de

# SMTP (Custom)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@tigube.de
SMTP_SECURE=false

SITE_URL=https://tigube.de
```

## Frontend Env

```bash
VITE_VAPID_PUBLIC_KEY=<gleicher Wert wie VAPID_PUBLIC_KEY>
```

## Cron (pg_cron, alle 10 Minuten)

Eingerichtet: Job `process_message_notifications` ruft die Edge Function über Vault-Secret `cron_service_role_key` auf.

Die Function verarbeitet:

1. `message_push_queue` → Push-Benachrichtigungen
2. `message_email_reminders` → SMTP-E-Mails

## Manueller Test

1. Zwei Accounts, Nachricht senden → Badge sofort sichtbar
2. Push: PWA installieren, Berechtigung erteilen, Tab schließen
3. E-Mail: `scheduled_for` in `message_email_reminders` auf Vergangenheit setzen, Function manuell aufrufen
4. Nachrichten lesen → Reminder-Eintrag gelöscht

## iOS-Hinweis

Push auf iOS nur als zum Home-Bildschirm hinzugefügte PWA (iOS 16.4+).
