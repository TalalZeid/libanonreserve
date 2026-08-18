-- Migration 008: Sterne-Bewertungen fuer Anbieter (oeffentlich, ohne Login).

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "reviews_public_select" on reviews
  for select using (true);

create policy "reviews_public_insert" on reviews
  for insert with check (true);

create policy "reviews_admin_delete" on reviews
  for delete using (is_admin());
