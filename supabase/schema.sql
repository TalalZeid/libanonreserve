-- Reservierungssystem: vollstaendiges Datenbankschema fuer Supabase
-- Fuer eine frische Installation komplett ausfuehren.
-- Falls du bereits eine aeltere Version laufen hast: die migration_XXX.sql
-- Dateien der Reihe nach (002, 003, 004, ...) ausfuehren statt dieser Datei.
--
-- WICHTIG: Ganz unten musst du deine eigene Admin-E-Mail eintragen,
-- sonst kommst du nicht mehr in den Admin-Bereich!

create table categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  created_at timestamptz not null default now()
);

create table providers (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  category_id uuid not null references categories(id),
  -- Format ohne Plus und ohne Leerzeichen, Beispiel 9613xxxxxxx
  phone_whatsapp text not null,
  description_ar text,
  description_en text,
  address text,
  image_url text,
  latitude double precision,
  longitude double precision,
  -- 0 Sonntag bis 6 Samstag
  working_days int[] not null default '{0,1,2,3,4,5}',
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  slot_minutes int not null default 30,
  -- von der Gemeinde empfohlen, nur vom Admin setzbar
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  customer_name text,
  customer_phone text,
  -- true = vom Anbieter selbst gesperrter Slot, kein echter Kundentermin
  blocked boolean not null default false,
  appointment_date date not null,
  appointment_time time not null,
  -- Push-Erinnerung (optional, Firebase Cloud Messaging)
  push_token text,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (provider_id, appointment_date, appointment_time)
);

-- Ganze Tage, die ein Anbieter komplett geschlossen hat (Feiertag etc.)
create table closed_days (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (provider_id, date)
);

-- E-Mail-Adressen der Super-Admins (du)
create table admins (
  email text primary key
);

-- Verknuepfung: welche Login-E-Mail gehoert zu welcher Firma
-- (separate Tabelle, damit die E-Mail niemals oeffentlich sichtbar wird)
create table provider_owners (
  provider_id uuid primary key references providers(id) on delete cascade,
  email text not null,
  push_token text
);

alter table categories enable row level security;
alter table providers enable row level security;
alter table appointments enable row level security;
alter table closed_days enable row level security;
alter table admins enable row level security;
alter table provider_owners enable row level security;

-- Security-definer Hilfsfunktionen: pruefen Rechte, ohne dass die
-- zugrunde liegenden Tabellen (admins/provider_owners) oeffentlich
-- lesbar sein muessen.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from admins where email = auth.jwt()->>'email');
$$;

create or replace function owns_provider(p_provider_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from provider_owners
    where provider_id = p_provider_id and email = auth.jwt()->>'email'
  );
$$;

-- categories
create policy "categories_select_public" on categories
  for select to anon, authenticated using (true);

create policy "categories_insert_admin" on categories
  for insert to authenticated with check (is_admin());

-- providers
create policy "providers_select_public" on providers
  for select to anon, authenticated using (true);

create policy "providers_insert_admin" on providers
  for insert to authenticated with check (is_admin());

create policy "providers_update_admin" on providers
  for update to authenticated using (is_admin()) with check (is_admin());

create policy "providers_delete_admin" on providers
  for delete to authenticated using (is_admin());

-- appointments
-- Oeffentliche Buchung: nur echte Kundentermine (nicht blockiert, mit Kundendaten)
create policy "appointments_insert_public" on appointments
  for insert to anon, authenticated
  with check (blocked = false and customer_name is not null and customer_phone is not null);

-- Anbieter darf eigene Slots blockieren (kein Kunde noetig)
create policy "appointments_insert_owner_block" on appointments
  for insert to authenticated
  with check (blocked = true and owns_provider(provider_id));

-- Anbieter (und Admin) duerfen die eigenen Termine lesen (vergangene + kommende)
create policy "appointments_select_owner" on appointments
  for select to authenticated using (owns_provider(provider_id) or is_admin());

-- Stornieren/Entsperren: abgesichert durch Kenntnis der zufaelligen Termin-ID
-- (Kunde bekommt sie als Link, Anbieter sieht sie in seinem Dashboard)
create policy "appointments_delete_public" on appointments
  for delete to anon, authenticated using (true);

-- closed_days
create policy "closed_days_select_public" on closed_days
  for select to anon, authenticated using (true);

create policy "closed_days_manage_owner" on closed_days
  for insert to authenticated with check (owns_provider(provider_id));

create policy "closed_days_delete_owner" on closed_days
  for delete to authenticated using (owns_provider(provider_id) or is_admin());

-- provider_owners: nur Admin verwaltet die Zuordnung, jeder Anbieter darf
-- nur seine eigene Zeile sehen (um seine eigene provider_id herauszufinden)
create policy "provider_owners_admin_all" on provider_owners
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "provider_owners_self_select" on provider_owners
  for select to authenticated using (email = auth.jwt()->>'email');

-- Anbieter darf seinen eigenen Push-Token selbst setzen/aendern
create policy "provider_owners_self_update" on provider_owners
  for update to authenticated
  using (email = auth.jwt()->>'email')
  with check (email = auth.jwt()->>'email');

-- Kein direktes Lesen von appointments fuer die Oeffentlichkeit (Kundendaten
-- bleiben privat). Verfuegbare/belegte Zeiten werden stattdessen ueber diese
-- Funktion abgefragt, die nur die Uhrzeit zurueckgibt, keine Kundendaten.
create or replace function get_booked_slots(p_provider_id uuid, p_date date)
returns table (appointment_time time)
language sql
security definer
set search_path = public
as $$
  select appointment_time from appointments
  where provider_id = p_provider_id and appointment_date = p_date;
$$;

-- Anzahl echter Buchungen (ohne blockierte Slots) fuer einen Anbieter --
-- fuer das "X Personen haben hier schon gebucht"-Vertrauenssignal.
create or replace function get_booking_count(p_provider_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from appointments
  where provider_id = p_provider_id and blocked = false;
$$;

-- Dieselbe Zahl fuer alle Anbieter auf einmal (fuer die Startseiten-Liste,
-- vermeidet eine Anfrage pro Anbieter).
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

-- Fuer den Erinnerungs-Cronjob: findet Termine, die in ca. einer Stunde
-- stattfinden, eine Erinnerung wollen und noch nicht erinnert wurden.
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

insert into categories (name_ar, name_en) values
  ('طبيب', 'Doctor'),
  ('حلاق / صالون', 'Hairdresser / Salon'),
  ('ميكانيكي', 'Mechanic'),
  ('مطعم', 'Restaurant'),
  ('أخرى', 'Other');

-- Storage-Bucket fuer Bilder: im Dashboard unter Storage -> New bucket
-- Name: provider-images, Public bucket: an. Danach diese Policy ausfuehren:
create policy "provider_images_insert_admin"
on storage.objects for insert
to authenticated
with check (bucket_id = 'provider-images');

-- WICHTIG, unbedingt anpassen und ausfuehren -- sonst kein Zugriff auf den
-- eigenen Admin-Bereich mehr:
insert into admins (email) values ('DEINE-ADMIN-EMAIL-HIER@example.com');
