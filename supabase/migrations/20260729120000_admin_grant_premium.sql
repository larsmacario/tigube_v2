-- Admin: Premium manuell zuweisen/entziehen; Admins gelten immer als Premium (RLS + Trigger)

-- 1. RLS-Hilfe: Admins zählen als Premium
CREATE OR REPLACE FUNCTION public.user_has_db_premium(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = uid
      AND (
        u.is_admin IS TRUE
        OR
        (
          lower(trim(coalesce(u.plan_type, ''))) = 'premium'
          AND (u.plan_expires_at IS NULL OR u.plan_expires_at > NOW())
        )
        OR
        (
          u.created_at IS NOT NULL
          AND u.created_at < TIMESTAMPTZ '2026-05-01T00:00:00Z'
          AND (u.created_at + INTERVAL '3 months') > NOW()
        )
      )
  );
$$;

COMMENT ON FUNCTION public.user_has_db_premium(UUID) IS
  'RLS: Premium = Admin, (plan_type premium + gültiges Ablaufdatum) oder 3-Monats-Promo';

-- 2. Beim Admin-Flag Premium-Felder setzen (BEFORE trigger)
CREATE OR REPLACE FUNCTION public.sync_premium_for_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS TRUE AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_admin, false) IS NOT TRUE) THEN
    NEW.plan_type := 'premium';
    NEW.premium_badge := true;
    NEW.show_ads := false;
    NEW.max_contact_requests := -1;
    NEW.max_bookings := -1;
    NEW.search_priority := 5;
    NEW.plan_expires_at := NULL;
    IF NEW.subscription_status IS NULL OR lower(trim(NEW.subscription_status)) = 'free' THEN
      NEW.subscription_status := 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_sync_premium_for_admin ON public.users;
CREATE TRIGGER users_sync_premium_for_admin
  BEFORE INSERT OR UPDATE OF is_admin ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_premium_for_admin_user();

-- 3. Backfill bestehende Admins
UPDATE public.users
SET
  plan_type = 'premium',
  premium_badge = true,
  show_ads = false,
  max_contact_requests = -1,
  max_bookings = -1,
  search_priority = 5,
  plan_expires_at = NULL,
  subscription_status = CASE
    WHEN subscription_status IS NULL OR lower(trim(subscription_status)) = 'free' THEN 'active'
    ELSE subscription_status
  END,
  updated_at = NOW()
WHERE is_admin IS TRUE
  AND (
    lower(trim(coalesce(plan_type, ''))) <> 'premium'
    OR premium_badge IS NOT TRUE
  );

-- 4. Admin RPC: Premium zuweisen
CREATE OR REPLACE FUNCTION public.admin_grant_user_premium(
  p_user_id UUID,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.users%ROWTYPE;
  v_old JSON;
  v_new JSON;
BEGIN
  IF NOT public.check_admin_access(auth.uid(), 'support') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_old := json_build_object(
    'plan_type', v_row.plan_type,
    'plan_expires_at', v_row.plan_expires_at,
    'subscription_status', v_row.subscription_status,
    'premium_badge', v_row.premium_badge
  );

  UPDATE public.users
  SET
    plan_type = 'premium',
    premium_badge = true,
    show_ads = false,
    max_contact_requests = -1,
    max_bookings = -1,
    search_priority = 5,
    plan_expires_at = p_expires_at,
    subscription_status = 'admin_granted',
    updated_at = NOW()
  WHERE id = p_user_id;

  v_new := json_build_object(
    'plan_type', 'premium',
    'plan_expires_at', p_expires_at,
    'subscription_status', 'admin_granted',
    'premium_badge', true
  );

  PERFORM public.log_admin_action(
    auth.uid(),
    'grant_user_premium',
    'users',
    p_user_id,
    v_old,
    v_new,
    NULL,
    NULL
  );
END;
$$;

COMMENT ON FUNCTION public.admin_grant_user_premium(UUID, TIMESTAMPTZ) IS
  'Admin: Premium-Mitgliedschaft zuweisen; p_expires_at NULL = unbegrenzt';

-- 5. Admin RPC: Premium entziehen (nicht für Admin-Nutzer)
CREATE OR REPLACE FUNCTION public.admin_revoke_user_premium(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.users%ROWTYPE;
  v_old JSON;
  v_new JSON;
BEGIN
  IF NOT public.check_admin_access(auth.uid(), 'support') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.is_admin IS TRUE THEN
    RAISE EXCEPTION 'admin_user_cannot_revoke_premium' USING ERRCODE = '22023';
  END IF;

  v_old := json_build_object(
    'plan_type', v_row.plan_type,
    'plan_expires_at', v_row.plan_expires_at,
    'subscription_status', v_row.subscription_status,
    'premium_badge', v_row.premium_badge
  );

  UPDATE public.users
  SET
    plan_type = 'free',
    premium_badge = false,
    show_ads = true,
    max_contact_requests = 3,
    max_bookings = 3,
    search_priority = 0,
    plan_expires_at = NULL,
    subscription_status = 'free',
    updated_at = NOW()
  WHERE id = p_user_id;

  v_new := json_build_object(
    'plan_type', 'free',
    'plan_expires_at', NULL,
    'subscription_status', 'free',
    'premium_badge', false
  );

  PERFORM public.log_admin_action(
    auth.uid(),
    'revoke_user_premium',
    'users',
    p_user_id,
    v_old,
    v_new,
    NULL,
    NULL
  );
END;
$$;

COMMENT ON FUNCTION public.admin_revoke_user_premium(UUID) IS
  'Admin: manuelles Premium entfernen; Stripe-IDs unverändert; Admins nicht entziehbar';

GRANT EXECUTE ON FUNCTION public.admin_grant_user_premium(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_user_premium(UUID) TO authenticated;
