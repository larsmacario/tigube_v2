-- Message notifications: unread RPC, push subscriptions, email reminders

-- Performance index for unread counts
CREATE INDEX IF NOT EXISTS idx_messages_unread_lookup
  ON public.messages (conversation_id, sender_id, read_at)
  WHERE read_at IS NULL;

-- Notification preferences on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_message_reminders_enabled boolean NOT NULL DEFAULT true;

-- Efficient total unread count
CREATE OR REPLACE FUNCTION public.get_total_unread_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.messages m
  INNER JOIN public.conversations c ON c.id = m.conversation_id
  WHERE (c.owner_id = p_user_id OR c.caretaker_id = p_user_id)
    AND m.sender_id <> p_user_id
    AND m.read_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_unread_count(uuid) TO authenticated;

-- Push subscriptions for Web Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Push dispatch queue (processed by Edge Function)
CREATE TABLE IF NOT EXISTS public.message_push_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_message_push_queue_pending
  ON public.message_push_queue (created_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.message_push_queue ENABLE ROW LEVEL SECURITY;

-- Email reminders for unread messages (1 hour delay)
CREATE TABLE IF NOT EXISTS public.message_email_reminders (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_email_reminders_due
  ON public.message_email_reminders (scheduled_for)
  WHERE sent_at IS NULL;

ALTER TABLE public.message_email_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own email reminders" ON public.message_email_reminders;
CREATE POLICY "Users view own email reminders"
  ON public.message_email_reminders
  FOR SELECT
  USING (user_id = auth.uid());

-- Helper: resolve message recipient
CREATE OR REPLACE FUNCTION public.get_message_recipient_id(
  p_conversation_id uuid,
  p_sender_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN c.owner_id = p_sender_id THEN c.caretaker_id
    WHEN c.caretaker_id = p_sender_id THEN c.owner_id
    ELSE NULL
  END
  FROM public.conversations c
  WHERE c.id = p_conversation_id;
$$;

-- Queue push notification on new message
CREATE OR REPLACE FUNCTION public.queue_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
BEGIN
  v_recipient_id := public.get_message_recipient_id(NEW.conversation_id, NEW.sender_id);

  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO public.message_push_queue (recipient_user_id, conversation_id)
    VALUES (v_recipient_id, NEW.conversation_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_push_notification ON public.messages;
CREATE TRIGGER trg_queue_push_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_push_notification();

-- Schedule email reminder on new message (do not reset timer if pending)
CREATE OR REPLACE FUNCTION public.schedule_message_email_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
BEGIN
  v_recipient_id := public.get_message_recipient_id(NEW.conversation_id, NEW.sender_id);

  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.message_email_reminders (user_id, scheduled_for, sent_at)
  VALUES (v_recipient_id, now() + interval '1 hour', NULL)
  ON CONFLICT (user_id) DO UPDATE
  SET scheduled_for = now() + interval '1 hour',
      sent_at = NULL
  WHERE public.message_email_reminders.sent_at IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_message_email_reminder ON public.messages;
CREATE TRIGGER trg_schedule_message_email_reminder
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_message_email_reminder();

-- Clear email reminder when all messages read
CREATE OR REPLACE FUNCTION public.clear_email_reminder_if_all_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_id uuid;
  v_has_unread boolean;
BEGIN
  IF NEW.read_at IS NULL OR OLD.read_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT CASE
    WHEN c.owner_id = NEW.sender_id THEN c.caretaker_id
    ELSE c.owner_id
  END INTO v_reader_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF v_reader_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.get_total_unread_count(v_reader_id) > 0 INTO v_has_unread;

  IF NOT v_has_unread THEN
    DELETE FROM public.message_email_reminders WHERE user_id = v_reader_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_email_reminder_on_read ON public.messages;
CREATE TRIGGER trg_clear_email_reminder_on_read
  AFTER UPDATE OF read_at ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_email_reminder_if_all_read();

-- Realtime publication for messages (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
