// Firebase Cloud Messaging: verarbeitet Push-Nachrichten im Hintergrund
// (wenn die Seite nicht offen ist). importScripts funktioniert in Service
// Workern auch fuer klassische, nicht-modulare Skripte wie firebase-config.js.
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");
importScripts("js/firebase-config.js");

firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "assets/icon.png"
  });
});

const CACHE_NAME = "mawa3id-cache-v1";
const APP_SHELL = [
  "index.html",
  "provider.html",
  "css/style.css",
  "js/app.js",
  "js/i18n.js",
  "js/index.js",
  "js/provider.js",
  "js/supabase-config.js",
  "js/firebase-config.js",
  "assets/icon.png",
  "manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Netzwerk zuerst (damit Aenderungen sofort ankommen, wenn online),
// bei Fehler (kein Internet) aus dem Cache bedienen. Nur eigene Dateien --
// Supabase-API und externe CDNs werden nicht abgefangen.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
