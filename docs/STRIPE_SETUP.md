# Stripe Live-Setup (tigube)

Checkout läuft über **Supabase Edge Functions** + **Stripe Webhooks**. Keine Payment Links, kein n8n, kein Stripe FDW im Frontend.

## 1. Stripe Dashboard (Plugin oder Dashboard)

1. **Live-Modus** aktivieren (Identität/Bank abschließen).
2. Zwei **Produkte** mit monatlichem Abo (EUR):
   - **tigube Owner Premium** — 4,90 €/Monat
   - **tigube Professional** (Dienstleister) — 12,90 €/Monat
3. **Price-IDs** (Live, Stand Plugin-Setup):
   - Owner Premium: `price_1TyXM3PiyZyAUG95MXjwAAmG`
   - Professional: `price_1TyXM7PiyZyAUG95tkqH1Nz7`
4. **Customer Portal** aktivieren (Kündigung, Zahlungsmethode, Rechnungen).
5. Nach Deploy: **Webhook** auf  
   `https://puvzrdnziuowznetwwey.supabase.co/functions/v1/stripe-webhook`  
   Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## 2. Supabase Secrets (Project **tigube** `puvzrdnziuowznetwwey` → Edge Functions → Secrets)

Im Dashboard eintragen (CLI/MCP haben oft keine Secret-Rechte):

| Secret | Wert |
|--------|------|
| `STRIPE_SECRET_KEY` | `sk_live_…` vom Stripe-Konto `acct_1TwPFIPiyZyAUG95` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` nach Webhook-Anlage |
| `STRIPE_PRICE_OWNER_PREMIUM` | `price_1TyXM3PiyZyAUG95MXjwAAmG` |
| `STRIPE_PRICE_CARETAKER_PROFESSIONAL` | `price_1TyXM7PiyZyAUG95tkqH1Nz7` |
| `SITE_URL` | `https://tigube.de` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` setzt Supabase automatisch für Functions.

## 3. Edge Functions (Remote-Status)

Auf **supabase_tigube** deployed:

- `create-checkout-session` (JWT an)
- `validate-checkout-session` (JWT an)
- `create-billing-portal-session` (JWT an)
- `stripe-webhook` (**JWT aus**)

URLs: `https://puvzrdnziuowznetwwey.supabase.co/functions/v1/<name>`

Bei Code-Änderungen erneut deployen (Cursor MCP `user-supabase_tigube` → `deploy_edge_function` oder CLI).

## 4. Vercel (Frontend)

| Variable | Wert |
|----------|------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
| `VITE_APP_URL` | `https://tigube.de` |
| `VITE_ENVIRONMENT` | `production` |

**Nicht** im Frontend: Secret Key, Webhook Secret, Service Role.

## 5. Lokale Entwicklung

In `.env` nur:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_APP_URL=http://localhost:5174
VITE_ENVIRONMENT=development
```

Supabase Secrets für Test-Keys wie oben; Checkout ruft deployed Functions auf (oder `supabase functions serve` lokal).

## 6. Test-Checkliste

- [ ] Eingeloggt → `/mitgliedschaften` → Premium → Stripe Checkout
- [ ] Success → `/payment/success?session_id=…` → Dashboard zeigt Premium
- [ ] Webhook-Log in Stripe grün
- [ ] „Mitgliedschaft verwalten“ → Billing Portal
- [ ] Kündigung → User zurück auf Free-Features
