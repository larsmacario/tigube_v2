INSERT INTO public.content_items (
  type,
  slug,
  title,
  excerpt,
  content,
  status,
  published_at
)
VALUES (
  'release',
  'release-preiseinheiten-flat-pro',
  'Preise pro Leistung: Stunde, Pauschal oder „pro“',
  'Betreuer und Dienstleister wählen bei jeder Leistung die Abrechnungsart; Besitzer sehen die Einheit im Profil und in der Suche.',
  $release$
• Dashboard: Bei Leistungen wählbar – Stunde (€/h), Pauschal oder Anzahl (pro, z. B. pro Fütterung).

• Profil & Suche: Preise erscheinen mit passender Einheit (z. B. „12 € pauschal“, „8 € pro“).

• Bestehende „pro Besuch“-Angaben wurden zu Pauschalpreisen normalisiert.
$release$,
  'published',
  timestamptz '2026-07-29 14:00:00+00'
)
ON CONFLICT (slug) DO UPDATE SET
  type = EXCLUDED.type,
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();
