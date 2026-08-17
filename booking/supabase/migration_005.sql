-- Migration 005: "Von der Gemeinde empfohlen"-Badge + Buchungszahlen fuer
-- das Vertrauenssignal "X Personen haben hier schon gebucht".

alter table providers add column featured boolean not null default false;

create or replace function get_booking_count(p_provider_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from appointments
  where provider_id = p_provider_id and blocked = false;
$$;

create or replace function get_all_booking_counts()
returns table (provider_id uuid, booking_count bigint)
language sql
security definer
set search_path = public
as $$
  select provider_id, count(*) as booking_count
  from appointments
  where blocked = false
  group by provider_id;
$$;
