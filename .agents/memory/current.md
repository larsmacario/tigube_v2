# Aktueller Stand

## Letzte Änderungen
- **Promo/Beta-UI bereinigt:** Keine „3 Monate gratis“-Banner mehr; FAQ/Landingpages/Mitgliedschaften auf Stripe-Preise (4,90 € / 12,90 €) umgestellt. `SubscriptionCard`: `PROMOTION_ACTIVE`-Bug behoben, Portal-Button für Premium. Migration `20260729140000_remove_signup_premium_promo` auf tigube angewendet (`user_has_db_premium` ohne Anmelde-Promo).

## Fokus
- Deploy Frontend (Vercel) nach Promo-Text-Update.

## Nächste Schritte
- Smoke-Test Startseite, `/mitgliedschaften`, `/faq` ausgeloggt.

## Offene Punkte
- Statisches Mockup `tigube_design 2/` enthält noch alte Promo-HTML (nicht produktiv).
