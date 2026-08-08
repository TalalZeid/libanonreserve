# Reservierungssystem (MVP)

Zweisprachige (AR/EN) Buchungsplattform für lokale Anbieter (Arzt, Friseur, Werkstatt, ...).
Reines HTML/CSS/JS-Frontend + Supabase als Datenbank/Backend. Kein Build-Schritt nötig.

## Setup

1. **Supabase-Projekt erstellen**: auf [supabase.com](https://supabase.com) registrieren, "New Project" anlegen.
2. **Schema einspielen**: im Supabase-Dashboard unter *SQL Editor* → *New Query* → Inhalt von
   `supabase/schema.sql` einfügen → *Run*.
3. **API-Keys eintragen**: unter *Project Settings → API* die `Project URL` und den `anon public` Key
   kopieren und in `js/supabase-config.js` einsetzen.
4. **Admin-Konto anlegen**: im Dashboard unter *Authentication → Users → Add user* einen Login
   (E-Mail + Passwort) für dich selbst erstellen. Damit meldest du dich auf `admin.html` an, um
   Anbieter einzutragen. Es gibt bewusst keine öffentliche Registrierung.
5. **Lokal testen**: im Projektordner z.B. `python3 -m http.server 8000` ausführen, dann
   `http://localhost:8000` öffnen.
6. **Deployment**: Ordner z.B. bei [Vercel](https://vercel.com) oder [Netlify](https://netlify.com)
   als statische Seite hochladen (kostenlos, kein Server nötig).

## Struktur

- `index.html` / `js/index.js` — Anbieterliste mit Kategorie-Filter
- `provider.html` / `js/provider.js` — Anbieter-Details, Terminauswahl, Buchung + WhatsApp-Bestätigung
- `admin.html` / `js/admin.js` — Login + Formular zum manuellen Eintragen neuer Anbieter
- `js/i18n.js` — Arabisch/Englisch-Umschaltung
- `supabase/schema.sql` — Datenbankschema inkl. Sicherheitsregeln (RLS)

## Wie die WhatsApp-Bestätigung funktioniert

Nach einer Buchung öffnet die Seite automatisch einen `wa.me`-Link mit vorausgefüllter Nachricht
an die WhatsApp-Nummer des Anbieters. Der Kunde muss die Nachricht nur noch senden — keine
WhatsApp Business API, kein Meta-Account nötig.
