-- pg_cron + pg_net for process-message-notifications (every 10 minutes)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.invoke_process_message_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_url text := 'https://puvzrdnziuowznetwwey.supabase.co/functions/v1/process-message-notifications';
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'cron_service_role_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE WARNING 'cron_service_role_key missing in vault';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_message_notifications') THEN
    PERFORM cron.unschedule('process_message_notifications');
  END IF;
END $$;

SELECT cron.schedule(
  'process_message_notifications',
  '*/10 * * * *',
  $$SELECT private.invoke_process_message_notifications();$$
);
