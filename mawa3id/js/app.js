// Gemeinsame Initialisierung: Supabase-Client (aus supabase-config.js)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// Prueft, ob Benachrichtigungen fuer diese Seite bereits vorher im Browser
// abgelehnt wurden. In dem Fall zeigt requestPermission() gar keinen Dialog
// mehr, sondern gibt sofort und stumm "denied" zurueck -- das koennen wir
// vorher erkennen, um direkt die Anleitung statt eines nutzlosen Versuchs zu zeigen.
function isPushBlocked() {
  return "Notification" in window && Notification.permission === "denied";
}

// Push-Benachrichtigungen (Firebase Cloud Messaging).
// Fragt Erlaubnis an und gibt bei Zustimmung den Geraete-Token zurueck,
// sonst null (z.B. abgelehnt, nicht unterstuetzt, iOS ohne Installation).
async function requestPushToken() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
  if (typeof firebase === "undefined") return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const messaging = firebase.messaging();
    const registration = await navigator.serviceWorker.ready;
    return await messaging.getToken({ vapidKey: FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
  } catch (err) {
    console.error("requestPushToken failed:", err);
    return null;
  }
}

// PWA-Installation: Button/Banner erst zeigen, wenn der Browser das
// tatsaechlich anbietet (oder auf iOS, wo es nur manuell per Teilen-Menue geht).
// Der kleine Button in der Kopfzeile bleibt immer verfuegbar; der Banner
// verschwindet dauerhaft, sobald er einmal weggeklickt wurde.
let deferredInstallPrompt = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function showInstallUI() {
  document.querySelectorAll(".install-nav-btn").forEach((el) => {
    el.hidden = false;
  });
  if (localStorage.getItem("install_banner_dismissed") !== "1") {
    document.querySelectorAll(".install-banner").forEach((el) => {
      el.hidden = false;
    });
    if (document.querySelector(".install-banner")) {
      document.body.classList.add("has-install-banner");
    }
  }
}

function hideInstallUI() {
  document.querySelectorAll(".install-nav-btn, .install-banner").forEach((el) => {
    el.hidden = true;
  });
  document.body.classList.remove("has-install-banner");
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!isStandalone()) showInstallUI();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  hideInstallUI();
});

// Generisches Hinweis-Popup (ersetzt haessliche Browser-alert()-Dialoge).
function showInfoModal(title, text) {
  let modal = document.getElementById("info-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "info-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-card surface-card">
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
        <h3 id="info-modal-title"></h3>
        <p id="info-modal-text" class="hint"></p>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.hidden = true;
    });
    modal.querySelector(".modal-close").addEventListener("click", () => {
      modal.hidden = true;
    });
  }
  modal.querySelector("#info-modal-title").textContent = title;
  modal.querySelector("#info-modal-text").textContent = text;
  modal.hidden = false;
}

function showInstallHintModal() {
  showInfoModal(t("install_banner_title"), t("install_fallback_hint"));
}

async function triggerInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hideInstallUI();
    return;
  }
  // Der Browser hat "beforeinstallprompt" auf dieser Seite (noch) nicht
  // ausgeloest -- kommt vor, z.B. nach einem Seitenwechsel. Statt dass der
  // Klick wirkungslos bleibt, zeigen wir eine allgemeine Anleitung als Popup.
  showInstallHintModal();
}

function dismissInstallBanner() {
  localStorage.setItem("install_banner_dismissed", "1");
  document.querySelectorAll(".install-banner").forEach((el) => {
    el.hidden = true;
  });
  document.body.classList.remove("has-install-banner");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".install-btn").forEach((btn) => {
    btn.addEventListener("click", triggerInstall);
  });
  document.querySelectorAll(".install-dismiss-btn").forEach((btn) => {
    btn.addEventListener("click", dismissInstallBanner);
  });

  if (isIOS() && !isStandalone()) showInstallUI();
});

// Kopfzeile bekommt beim Scrollen einen sichtbaren Schatten (statt flach zu wirken).
const topbarEl = document.querySelector(".topbar");
if (topbarEl) {
  const onTopbarScroll = () => topbarEl.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onTopbarScroll, { passive: true });
  onTopbarScroll();
}

// Sanftes Einblenden von Blöcken, sobald sie beim Scrollen ins Bild kommen.
// Funktioniert auch fuer Blöcke, die erst spaeter (z.B. nach Login) eingeblendet
// werden, da IntersectionObserver durchgehend beobachtet, nicht nur einmalig.
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  });
} else {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  });
}

const STAR_ICON = `<svg class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2.5l2.9 6.4 7 .7-5.3 4.7 1.6 6.9L12 17.6l-6.2 3.6 1.6-6.9L2.1 9.6l7-.7L12 2.5Z"/>
</svg>`;

const PEOPLE_ICON = `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="10" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

let allCategories = [];

async function loadCategories() {
  const { data, error } = await sb.from("categories").select("*").order("created_at");
  if (!error) allCategories = data;
  return allCategories;
}

function categoryLabel(category) {
  if (!category) return "";
  return getLang() === "ar" ? category.name_ar : category.name_en;
}

// Anbieter ohne aktives (nicht abgelaufenes) Abo gelten als gesperrt --
// bleiben in der Liste sichtbar, aber ohne Details/Buchungsmoeglichkeit.
function isProviderLocked(provider) {
  if (!provider.subscription_active_until) return true;
  const today = new Date().toISOString().split("T")[0];
  return provider.subscription_active_until < today;
}

function providerName(provider) {
  return getLang() === "ar" ? provider.name_ar : provider.name_en;
}

function providerDescription(provider) {
  return getLang() === "ar" ? provider.description_ar : provider.description_en;
}

function providerInitial(provider) {
  const name = providerName(provider).trim();
  return name ? name[0].toUpperCase() : "?";
}

// Bringt eine Telefonnummer in ein wa.me-taugliches Format (nur Ziffern).
// Erwartet, dass die Nummer bereits die vollstaendige Landesvorwahl enthaelt
// (z.B. +961 71 234567 oder +49 151 23456789) -- keine automatische Annahme
// mehr, dass es sich um eine libanesische Nummer handelt.
function formatWhatsappNumber(phone) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

function buildWhatsappContactLink(phone, text) {
  return `https://wa.me/${formatWhatsappNumber(phone)}?text=${encodeURIComponent(text)}`;
}

function generateSlots(startTime, endTime, slotMinutes) {
  const slots = [];
  let [h, m] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  while (h < endH || (h === endH && m < endM)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += slotMinutes;
    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
  }
  return slots;
}

// Levenshtein-Distanz: Anzahl der Aenderungen (Buchstabe einfuegen/loeschen/ersetzen),
// um von einem Wort zum anderen zu kommen. Grundlage fuer die Tippfehler-Toleranz.
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function fuzzyMaxDistance(query) {
  if (query.length <= 3) return 1;
  if (query.length <= 7) return 2;
  return 3;
}

function fuzzyFieldMatches(field, query) {
  if (!field) return false;
  const normalized = field.toLowerCase();
  if (normalized.includes(query)) return true;

  const maxDistance = fuzzyMaxDistance(query);
  if (levenshtein(normalized, query) <= maxDistance) return true;
  return normalized.split(/\s+/).some((word) => levenshtein(word, query) <= maxDistance);
}

function searchFields(provider) {
  return [
    provider.name_ar,
    provider.name_en,
    provider.category ? provider.category.name_ar : "",
    provider.category ? provider.category.name_en : ""
  ];
}

function matchesSearch(provider, query) {
  if (!query) return true;
  return searchFields(provider).some((field) => fuzzyFieldMatches(field, query));
}

// Findet den aehnlichsten Begriff ueber alle Anbieter/Kategorien hinweg,
// fuer den "Meintest du...?"-Vorschlag, wenn die Suche nichts findet.
function closestSearchSuggestion(providers, query) {
  let best = null;
  let bestDistance = Infinity;

  providers.forEach((p) => {
    searchFields(p).forEach((field) => {
      if (!field) return;
      const distance = levenshtein(field.toLowerCase(), query);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = field;
      }
    });
  });

  return best;
}

// Erzeugt eine .ics-Kalenderdatei fuer einen Termin und startet den Download.
// "Floating time" (ohne Z/Zeitzone), da alle Nutzer in derselben Zeitzone sind.
function downloadICS({ title, description, dateStr, timeStr, durationMinutes }) {
  const pad = (n) => String(n).padStart(2, "0");
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const start = new Date(year, month - 1, day, hour, minute);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const fmt = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const escapeText = (s) => (s || "").replace(/([,;])/g, "\\$1");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "termin.ics";
  a.click();
  URL.revokeObjectURL(url);
}
