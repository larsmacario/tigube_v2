# Aktueller Stand

## Letzte Änderungen
- **Messenger:** Toasts bei fehlgeschlagenem `getOrCreateConversation` (Betreuer-/Dienstleister-Profil, Owner-Dashboard, Owner-Profil); kein stilles Redirect mehr auf leere `/nachrichten`. `ChatWindow`: Hook-Reihenfolge korrigiert, `conversation.owner?.id` abgesichert. `getCaretakerById`: `userId` aus `users.id` wie in der Suche. ErrorBoundary: Hinweis Cache leeren (Mobile).
- **Diagnose Live:** Production-Bundle enthält bereits `useToast` für Owner-Dashboard. Supabase-RLS-Migration `20260404130000_conversations_insert_rls.sql` im Repo — auf tigube-DB (Ref `puvzrdnziuowznetwwey`) manuell prüfen/anwenden, kein tigube-MCP in Cursor verknüpft.

## Fokus
- Deploy der Messenger-Fixes; danach Smoke-Test auf Mobile (Profil → Nachricht senden → Chat).
- RLS INSERT-Policy auf Production bestätigen.

## Nächste Schritte
- Nach Deploy: Nutzerin erneut testen lassen; bei RLS-Fehler Toast zeigt jetzt Supabase-Meldung.
- Optional: Supabase-MCP für tigube-Projekt anbinden.

## Offene Punkte
- Remote-Status Migration `20260404130000` unbestätigt (Anon-Key im Repo ungültig für Live-Checks).
- Umfang „Seiten-Baukasten“ weiter offen.
