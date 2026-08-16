-- Migration 007: Abo-Pflicht fuer Anbieter (monatliche Zahlung, manuell vom
-- Admin verwaltet, spaeter automatisierbar sobald Whish-API-Zugang da ist).

alter table providers add column if not exists subscription_active_until date;
