-- Remove signup 3-month premium promo from RLS helper (Stripe/admin-only premium)

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
        OR (
          lower(trim(coalesce(u.plan_type, ''))) = 'premium'
          AND (u.plan_expires_at IS NULL OR u.plan_expires_at > NOW())
        )
      )
  );
$$;

COMMENT ON FUNCTION public.user_has_db_premium(UUID) IS
  'RLS: Premium = Admin oder plan_type premium mit gültigem plan_expires_at (NULL = laufend)';
