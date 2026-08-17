-- Migration 004: Eigene Logins fuer Firmen (nur eigene Firma sichtbar/verwaltbar)
--
-- WICHTIG: Ganz unten in diesem Skript musst du deine eigene Admin-E-Mail
-- eintragen -- die, mit der du dich aktuell auf admin.html einloggst --
-- BEVOR du das Skript ausfuehrst. Sonst kommst du selbst nicht mehr in
-- deinen Admin-Bereich!

-- 1. Neue Spalten/Tabellen
alter table appointments add column blocked boolean not null default false;
alter table appointments alter column customer_name drop not null;
alter table appointments alter column customer_phone drop not null;

create table closed_days (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (provider_id, date)
);
alter table closed_days enable row level security;

create table admins (
  email text primary key
);
alter table admins enable row level security;

create table provider_owners (
  provider_id uuid primary key references providers(id) on delete cascade,
  email text not null
);
alter table provider_owners enable row level security;

-- 2. Hilfsfunktionen
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

-- 3. Bestehende Admin-Regeln auf is_admin() umstellen statt "jeder eingeloggte"
drop policy "categories_insert_admin" on categories;
create policy "categories_insert_admin" on categories
  for insert to authenticated with check (is_admin());

drop policy "providers_insert_admin" on providers;
create policy "providers_insert_admin" on providers
  for insert to authenticated with check (is_admin());

drop policy "providers_update_admin" on providers;
create policy "providers_update_admin" on providers
  for update to authenticated using (is_admin()) with check (is_admin());

drop policy "providers_delete_admin" on providers;
create policy "providers_delete_admin" on providers
  for delete to authenticated using (is_admin());

-- 4. appointments: Einfuegen-Regel anpassen (blocked=false Pflicht fuer
--    oeffentliche Buchungen) + neue Regeln fuer Anbieter
drop policy "appointments_insert_public" on appointments;
create policy "appointments_insert_public" on appointments
  for insert to anon, authenticated
  with check (blocked = false and customer_name is not null and customer_phone is not null);

create policy "appointments_insert_owner_block" on appointments
  for insert to authenticated
  with check (blocked = true and owns_provider(provider_id));

create policy "appointments_select_owner" on appointments
  for select to authenticated using (owns_provider(provider_id) or is_admin());

-- 5. closed_days Regeln
create policy "closed_days_select_public" on closed_days
  for select to anon, authenticated using (true);

create policy "closed_days_manage_owner" on closed_days
  for insert to authenticated with check (owns_provider(provider_id));

create policy "closed_days_delete_owner" on closed_days
  for delete to authenticated using (owns_provider(provider_id) or is_admin());

-- 6. provider_owners Regeln
create policy "provider_owners_admin_all" on provider_owners
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "provider_owners_self_select" on provider_owners
  for select to authenticated using (email = auth.jwt()->>'email');

-- 7. WICHTIG, unbedingt anpassen: deine eigene Admin-E-Mail eintragen
insert into admins (email) values ('DEINE-ADMIN-EMAIL-HIER@example.com');
