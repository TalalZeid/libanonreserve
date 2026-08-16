-- Erlaubt das Stornieren einer Buchung durch den Kunden selbst.
-- Abgesichert dadurch, dass nur der Kunde die zufaellige Buchungs-ID kennt
-- (wird ihm nach der Buchung als Link angezeigt) -- kein Login noetig,
-- aehnlich einem Google-Docs-Freigabelink.

create policy "appointments_delete_public" on appointments
  for delete to anon, authenticated using (true);
