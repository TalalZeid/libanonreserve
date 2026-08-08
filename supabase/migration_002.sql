-- Migration fuer eine bereits bestehende Datenbank (erste schema.sql wurde schon ausgefuehrt).
-- Fuegt hinzu: Kategorien-Tabelle, Bild-URL, Standort (Breiten-/Laengengrad),
-- sowie Update/Delete-Rechte fuer Admin.
--
-- Achtung: eventuelle Test-Anbieter, die du schon angelegt hast, werden
-- geloescht (wegen der neuen Pflicht-Kategorie-Zuordnung) -- danach einfach
-- ueber die neue Admin-Oberflaeche neu anlegen.

delete from appointments;
delete from providers;

create table categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

create policy "categories_select_public" on categories
  for select to anon, authenticated using (true);

create policy "categories_insert_admin" on categories
  for insert to authenticated with check (true);

insert into categories (name_ar, name_en) values
  ('طبيب', 'Doctor'),
  ('حلاق / صالون', 'Hairdresser / Salon'),
  ('ميكانيكي', 'Mechanic'),
  ('مطعم', 'Restaurant'),
  ('أخرى', 'Other');

alter table providers add column category_id uuid references categories(id);
alter table providers add column image_url text;
alter table providers add column latitude double precision;
alter table providers add column longitude double precision;

alter table providers drop column category;
alter table providers alter column category_id set not null;

create policy "providers_update_admin" on providers
  for update to authenticated using (true) with check (true);

create policy "providers_delete_admin" on providers
  for delete to authenticated using (true);

-- Storage-Bucket fuer Bilder erstellen:
-- Dashboard -> Storage -> New bucket -> Name "provider-images" -> Public bucket: an
-- Danach diese Policy ausfuehren:
create policy "provider_images_insert_admin"
on storage.objects for insert
to authenticated
with check (bucket_id = 'provider-images');
