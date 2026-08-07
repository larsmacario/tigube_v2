-- Synchronisiert caretaker_profiles.is_verified mit users.verification_status
-- und erweitert dienstleister_search_view um is_verified

-- 1. Backfill: bestehende verifizierte User
UPDATE public.caretaker_profiles cp
SET is_verified = true
FROM public.users u
WHERE cp.id = u.id
  AND u.verification_status = 'approved'
  AND (cp.is_verified IS DISTINCT FROM true);

-- 2. Trigger: künftige Änderungen an verification_status spiegeln
CREATE OR REPLACE FUNCTION public.sync_caretaker_is_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    UPDATE public.caretaker_profiles
    SET is_verified = (NEW.verification_status = 'approved')
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_caretaker_is_verified ON public.users;

CREATE TRIGGER trg_sync_caretaker_is_verified
AFTER UPDATE OF verification_status ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_caretaker_is_verified();

-- 3. dienstleister_search_view um is_verified erweitern
DROP VIEW IF EXISTS public.dienstleister_search_view;

CREATE VIEW public.dienstleister_search_view AS
SELECT
  u.id,
  u.first_name,
  u.last_name,
  u.city,
  u.plz,
  u.street,
  u.profile_photo_url,
  u.public_profile_visible,
  u.is_suspended,
  cp.approval_status,
  cp.is_verified,
  cp.kategorie_id,
  dk.name AS kategorie_name,
  dk.icon AS kategorie_icon,
  cp.dienstleister_typ,
  cp.spezialisierungen,
  cp.zertifikate,
  cp.notfall_bereitschaft,
  cp.portfolio_urls,
  cp.oeffnungszeiten,
  cp.kontakt_info,
  cp.hourly_rate,
  cp.rating,
  cp.services_with_categories,
  cp.availability,
  cp.short_term_available,
  cp.overnight_availability,
  cp.experience_years,
  cp.experience_description,
  cp.qualifications,
  cp.languages,
  cp.service_radius,
  cp.home_photos,
  cp.is_commercial,
  cp.bio,
  cp.short_about_me,
  cp.long_about_me,
  cp.animal_types,
  CASE
    WHEN cp.kategorie_id = 1 THEN 'caretaker'::text
    ELSE 'service_provider'::text
  END AS search_type,
  u.user_type,
  to_tsvector(
    'german'::regconfig,
    (
      ((((((((
        COALESCE(u.first_name, ''::text) || ' '::text
      ) || COALESCE(u.last_name, ''::text)) || ' '::text
      ) || COALESCE(cp.bio, ''::text)) || ' '::text
      ) || COALESCE(cp.short_about_me, ''::text)) || ' '::text
      ) || COALESCE(array_to_string(cp.spezialisierungen, ' '::text), ''::text)) || ' '::text
    ) || COALESCE(dk.name, ''::character varying)::text
  ) AS search_vector
FROM public.users u
LEFT JOIN public.caretaker_profiles cp ON u.id = cp.id
LEFT JOIN public.dienstleister_kategorien dk ON cp.kategorie_id = dk.id
WHERE u.is_suspended = false
  AND cp.kategorie_id IS NOT NULL
  AND (dk.is_active = true OR dk.is_active IS NULL)
  AND cp.approval_status = 'approved'::text
  AND (
    (cp.kategorie_id = 1 AND u.public_profile_visible = true)
    OR cp.kategorie_id <> 1
  )
  AND (
    u.user_type <> 'caretaker'::text
    OR (cp.kategorie_id IS NOT NULL AND cp.kategorie_id = 1)
  );
