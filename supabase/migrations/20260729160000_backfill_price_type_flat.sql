-- Legacy price_type in services_with_categories: per_visit / per_day → flat

CREATE OR REPLACE FUNCTION public.normalize_swc_price_types(arr jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN jsonb_typeof(elem) = 'object'
          AND elem->>'price_type' IN ('per_visit', 'per_day')
        THEN jsonb_set(elem, '{price_type}', '"flat"'::jsonb, true)
        ELSE elem
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(
    CASE
      WHEN arr IS NULL OR jsonb_typeof(arr) <> 'array' THEN '[]'::jsonb
      ELSE arr
    END
  ) AS elem;
$$;

UPDATE public.caretaker_profiles cp
SET
  services_with_categories = public.normalize_swc_price_types(cp.services_with_categories::jsonb),
  updated_at = now()
WHERE cp.services_with_categories IS NOT NULL
  AND (
    cp.services_with_categories::text LIKE '%"per_visit"%'
    OR cp.services_with_categories::text LIKE '%"per_day"%'
  );

COMMENT ON FUNCTION public.normalize_swc_price_types(jsonb) IS
  'Mappt Legacy price_type per_visit/per_day auf flat in services_with_categories-Arrays.';
