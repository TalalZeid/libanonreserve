-- Migration 006: Push-Benachrichtigungen (Firebase Cloud Messaging)
--
-- Zwei Faelle:
-- 1. Anbieter bekommt eine Push-Nachricht, sobald ein neuer Termin gebucht wird.
-- 2. Kunde kann optional beim Buchen eine Erinnerung ca. 1 Stunde vorher aktivieren.

alter table appointments add column push_token text;
alter table appointments add column reminder_sent boolean not null default false;

alter table provider_owners add column push_token text;

-- Anbieter darf seinen eigenen Push-Token selbst setzen/aendern
create policy "provider_owners_self_update" on provider_owners
  for update to authenticated
  using (email = auth.jwt()->>'email')
  with check (email = auth.jwt()->>'email');

-- Fuer den Erinnerungs-Cronjob: findet Termine, die in ca. einer Stunde
-- stattfinden, eine Erinnerung wollen und noch nicht erinnert wurden.
-- Rechnet "jetzt" bewusst in libanesische Ortszeit um, da appointment_date/
-- appointment_time ohne Zeitzone gespeichert sind (Wanduhrzeit vor Ort).
create or replace function get_appointments_needing_reminder()
returns setof appointments
language sql
security definer
set search_path = public
as $$
  select * from appointments
  where blocked = false
    and reminder_sent = false
    and push_token is not null
    and (appointment_date + appointment_time) between
      ((now() at time zone 'Asia/Beirut') + interval '50 minutes') and
      ((now() at time zone 'Asia/Beirut') + interval '70 minutes');
$$;
