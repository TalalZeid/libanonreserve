let editingProviderId = null;
let adminProviders = [];
let adminProviderOwners = {};
let locationMap = null;
let locationMarker = null;
let selectedLat = null;
let selectedLng = null;

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Verkleinert und komprimiert ein Bild im Browser, bevor es hochgeladen wird,
// damit das 1GB-Speicherlimit von Supabase moeglichst lange reicht.
async function compressImage(file, maxDimension = 1280, targetBytes = 200 * 1024) {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

  let quality = 0.8;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > targetBytes && quality > 0.3) {
    quality -= 0.15;
    blob = await canvasToBlob(canvas, quality);
  }
  return blob;
}

const DEFAULT_CENTER = [34.4346, 35.8362]; // Tripoli, Libanon als Fallback

async function activateAdminPanel() {
  await loadCategories();
  renderCategoryOptions();
  renderWorkingDaysCheckboxes();
  initLocationMap();
  await loadAdminProviders();
  await loadProviderOwners();
}

async function loadProviderOwners() {
  const { data, error } = await sb.from("provider_owners").select("*");
  adminProviderOwners = {};
  if (!error) {
    data.forEach((row) => {
      adminProviderOwners[row.provider_id] = row.email;
    });
  }
}

function renderCategoryOptions() {
  const select = document.getElementById("category");
  const previousValue = select.value;
  select.innerHTML = allCategories
    .map((c) => `<option value="${c.id}">${categoryLabel(c)}</option>`)
    .join("");
  if (previousValue) select.value = previousValue;
}

function renderWorkingDaysCheckboxes(selectedDays) {
  const days = selectedDays || [0, 1, 2, 3, 4, 5];
  const container = document.getElementById("working-days");
  container.innerHTML = [0, 1, 2, 3, 4, 5, 6]
    .map(
      (d) => `
      <label class="day-checkbox">
        <input type="checkbox" value="${d}" ${days.includes(d) ? "checked" : ""} />
        ${t("weekday_" + d)}
      </label>`
    )
    .join("");
}

function initLocationMap() {
  if (locationMap) return;

  locationMap = L.map("location-map").setView(DEFAULT_CENTER, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(locationMap);

  locationMap.on("click", (e) => {
    setLocation(e.latlng.lat, e.latlng.lng);
  });

  document.getElementById("location-coords").addEventListener("change", (e) => {
    const parsed = parseDMS(e.target.value);
    if (!parsed) return;
    setLocation(parsed.lat, parsed.lng);
    locationMap.setView([parsed.lat, parsed.lng], 16);
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      locationMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
    });
  }
}

// Wandelt eine Dezimalgrad-Koordinate in einen DMS-String um (z.B. 34.4443 -> 34°26'39.5"N).
function decimalToDMS(deg, isLat) {
  const hemisphere = isLat ? (deg >= 0 ? "N" : "S") : (deg >= 0 ? "E" : "W");
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const minFloat = (abs - d) * 60;
  const m = Math.floor(minFloat);
  const s = (minFloat - m) * 60;
  return d + "°" + m + "'" + s.toFixed(1) + '"' + hemisphere;
}

function coordsToDMSString(lat, lng) {
  return decimalToDMS(lat, true) + " " + decimalToDMS(lng, false);
}

// Liest einen String wie 34°26'39.7"N 35°49'55.4"E ein und gibt {lat, lng} zurueck, sonst null.
function parseDMS(str) {
  const re = /(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)?\s*'?\s*(\d+(?:\.\d+)?)?\s*"?\s*([NSEWnsew])/g;
  const matches = [...str.matchAll(re)];
  if (matches.length < 2) return null;

  const toDecimal = (match) => {
    const degrees = parseFloat(match[1]) || 0;
    const minutes = parseFloat(match[2]) || 0;
    const seconds = parseFloat(match[3]) || 0;
    let decimal = degrees + minutes / 60 + seconds / 3600;
    const hemisphere = match[4].toUpperCase();
    if (hemisphere === "S" || hemisphere === "W") decimal = -decimal;
    return decimal;
  };

  let lat = null;
  let lng = null;
  matches.forEach((match) => {
    const hemisphere = match[4].toUpperCase();
    if (hemisphere === "N" || hemisphere === "S") lat = toDecimal(match);
    else lng = toDecimal(match);
  });

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function setLocation(lat, lng) {
  selectedLat = lat;
  selectedLng = lng;
  if (locationMarker) {
    locationMarker.setLatLng([lat, lng]);
  } else {
    locationMarker = L.marker([lat, lng]).addTo(locationMap);
  }
  document.getElementById("location-readout").textContent =
    t("admin_location_selected") + " " + lat.toFixed(6) + ", " + lng.toFixed(6);
  document.getElementById("location-coords").value = coordsToDMSString(lat, lng);
}

function clearLocation() {
  selectedLat = null;
  selectedLng = null;
  if (locationMarker) {
    locationMap.removeLayer(locationMarker);
    locationMarker = null;
  }
  document.getElementById("location-readout").textContent = "";
  document.getElementById("location-coords").value = "";
}

async function loadAdminProviders() {
  const { data, error } = await sb
    .from("providers")
    .select("*, category:categories(*)")
    .order("created_at");
  const listEl = document.getElementById("admin-provider-list");

  if (error) {
    listEl.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  adminProviders = data;
  renderAdminProviderList();
}

const TRASH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const QR_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="3" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="14" y="3" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="3" y="14" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z"/>
</svg>`;

const BELL_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 19a2 2 0 0 0 4 0" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function sendTestPush(provider) {
  const { data, error } = await sb.functions.invoke("notify-new-booking", {
    body: {
      record: {
        provider_id: provider.id,
        customer_name: t("admin_test_push_customer_name"),
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_time: "00:00:00",
        blocked: false
      }
    }
  });

  if (error) {
    showInfoModal(providerName(provider), t("admin_test_push_error") + " (" + error.message + ")");
    return;
  }
  if (data === "no push token") {
    showInfoModal(providerName(provider), t("admin_test_push_no_token"));
    return;
  }
  showInfoModal(providerName(provider), t("admin_test_push_sent"));
}

const QR_CARD_W = 1024;
const QR_CARD_H = 1536;
const QR_CARD_SLOT = { x: 0.2432, y: 0.2233, w: 0.5117, h: 0.3411 };
const QR_CARD_LOGO_SLOT = { x: 0.0926, y: 0.065, w: 0.1234, h: 0.0823 };

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Zeichnet die Druckkarte (Hintergrund + QR + Name) in voller Aufloesung fuer Download/Druck.
async function buildQrPrintCard(url, name) {
  await document.fonts.load('700 54px "Scheherazade New"');

  const canvas = document.createElement("canvas");
  canvas.width = QR_CARD_W;
  canvas.height = QR_CARD_H;
  const ctx = canvas.getContext("2d");

  const [bg, logo] = await Promise.all([
    loadImageEl("assets/qr-card-bg.jpg"),
    loadImageEl("assets/icon.png")
  ]);
  ctx.drawImage(bg, 0, 0, QR_CARD_W, QR_CARD_H);

  const logoX = QR_CARD_W * QR_CARD_LOGO_SLOT.x;
  const logoY = QR_CARD_H * QR_CARD_LOGO_SLOT.y;
  const logoW = QR_CARD_W * QR_CARD_LOGO_SLOT.w;
  const logoH = QR_CARD_H * QR_CARD_LOGO_SLOT.h;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(logoX + logoW / 2, logoY + logoH / 2, logoW / 2, logoH / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  ctx.restore();

  const qrSize = Math.round(QR_CARD_W * QR_CARD_SLOT.w * 0.82);
  const qrHolder = document.createElement("div");
  new QRCode(qrHolder, { text: url, width: qrSize, height: qrSize, correctLevel: QRCode.CorrectLevel.M });
  const qrCanvas = qrHolder.querySelector("canvas");

  const slotX = QR_CARD_W * QR_CARD_SLOT.x;
  const slotY = QR_CARD_H * QR_CARD_SLOT.y;
  const slotW = QR_CARD_W * QR_CARD_SLOT.w;
  const slotH = QR_CARD_H * QR_CARD_SLOT.h;
  ctx.drawImage(qrCanvas, slotX + (slotW - qrSize) / 2, slotY + (slotH - qrSize) / 2, qrSize, qrSize);

  ctx.textAlign = "center";
  ctx.fillStyle = "#1e7a5f";
  ctx.font = '700 56px "Scheherazade New", serif';
  ctx.fillText(name, QR_CARD_W / 2, QR_CARD_H * 0.645);

  return canvas.toDataURL("image/png");
}

function showQrModal(provider) {
  const url = `${window.location.origin}/booking/provider.html?id=${provider.id}`;
  const name = providerName(provider);
  document.getElementById("qr-modal-title").textContent = name;
  document.getElementById("qr-modal-url").textContent = url;
  document.getElementById("qr-print-card-name").textContent = name;

  const container = document.getElementById("qr-canvas");
  container.innerHTML = "";
  new QRCode(container, {
    text: url,
    width: 240,
    height: 240,
    correctLevel: QRCode.CorrectLevel.M
  });

  document.getElementById("qr-modal").hidden = false;

  buildQrPrintCard(url, name).then((dataUrl) => {
    document.getElementById("qr-download-btn").href = dataUrl;
  });
}

document.getElementById("qr-modal-close").addEventListener("click", () => {
  document.getElementById("qr-modal").hidden = true;
});

document.getElementById("qr-print-btn").addEventListener("click", () => {
  const dataUrl = document.getElementById("qr-download-btn").href;
  if (!dataUrl.startsWith("data:")) return;
  const win = window.open("", "_blank");
  win.document.write(
    `<html><head><title>${document.getElementById("qr-modal-title").textContent}</title>
    <style>@page{margin:0}body{margin:0;display:flex;align-items:center;justify-content:center}img{width:100%;max-width:420px}</style>
    </head><body><img src="${dataUrl}" onload="window.print()" /></body></html>`
  );
  win.document.close();
});

function renderAdminProviderList() {
  const listEl = document.getElementById("admin-provider-list");
  const countLabel = document.getElementById("provider-count-label");
  countLabel.textContent = adminProviders.length;

  if (adminProviders.length === 0) {
    listEl.innerHTML = `<p class="hint">${t("admin_no_providers_yet")}</p>`;
    return;
  }

  listEl.innerHTML = adminProviders
    .map(
      (p) => `
      <div class="provider-list-item ${p.id === editingProviderId ? "active" : ""}">
        <div class="provider-list-item-main" data-edit="${p.id}">
          ${
            p.image_url
              ? `<img class="provider-avatar-sm" src="${p.image_url}" alt="" />`
              : `<div class="provider-avatar-sm provider-avatar-placeholder">${providerInitial(p)}</div>`
          }
          <div class="provider-list-item-text">
            <strong>${providerName(p)} ${p.featured ? STAR_ICON : ""}</strong>
            <span class="provider-category">${categoryLabel(p.category)}</span>
          </div>
        </div>
        <div class="provider-list-item-actions">
          <button type="button" class="icon-btn" data-appts="${p.id}" title="${t("admin_appointments_button")}">${CALENDAR_ICON}</button>
          <button type="button" class="icon-btn" data-test-push="${p.id}" title="${t("admin_test_push_button")}">${BELL_ICON}</button>
          <button type="button" class="icon-btn" data-qr="${p.id}" title="${t("admin_qr_button")}">${QR_ICON}</button>
          <button type="button" class="icon-btn danger" data-delete="${p.id}" title="${t("admin_delete")}">${TRASH_ICON}</button>
        </div>
      </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.getAttribute("data-edit")));
  });
  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteProvider(btn.getAttribute("data-delete")));
  });
  listEl.querySelectorAll("[data-appts]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = adminProviders.find((x) => x.id === btn.getAttribute("data-appts"));
      if (p) showAppointmentsModal(p);
    });
  });
  listEl.querySelectorAll("[data-test-push]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = adminProviders.find((x) => x.id === btn.getAttribute("data-test-push"));
      if (p) sendTestPush(p);
    });
  });
  listEl.querySelectorAll("[data-qr]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = adminProviders.find((x) => x.id === btn.getAttribute("data-qr"));
      if (p) showQrModal(p);
    });
  });
}

function startEdit(id) {
  const p = adminProviders.find((x) => x.id === id);
  if (!p) return;

  editingProviderId = id;
  document.getElementById("name-ar").value = p.name_ar;
  document.getElementById("name-en").value = p.name_en;
  document.getElementById("category").value = p.category_id;
  document.getElementById("phone").value = p.phone_whatsapp;
  document.getElementById("description-ar").value = p.description_ar || "";
  document.getElementById("description-en").value = p.description_en || "";
  document.getElementById("address").value = p.address || "";
  document.getElementById("start-time").value = p.start_time.slice(0, 5);
  document.getElementById("end-time").value = p.end_time.slice(0, 5);
  document.getElementById("slot-minutes").value = p.slot_minutes;
  document.getElementById("owner-email").value = adminProviderOwners[p.id] || "";
  document.getElementById("toggle-reset-password").hidden = !adminProviderOwners[p.id];
  document.getElementById("featured-toggle").checked = !!p.featured;
  document.getElementById("subscription-until").value = p.subscription_active_until || "";
  updateSubscriptionHint();
  renderWorkingDaysCheckboxes(p.working_days);

  setImagePreview(p.image_url);

  if (p.latitude != null && p.longitude != null) {
    locationMap.setView([p.latitude, p.longitude], 16);
    setLocation(p.latitude, p.longitude);
  } else {
    clearLocation();
  }

  document.getElementById("provider-form-title").textContent = t("admin_edit_provider_title");
  document.getElementById("provider-form-submit").textContent = t("admin_update_button");
  document.getElementById("cancel-edit-btn").hidden = false;
  document.getElementById("provider-form-result").textContent = "";
  document.getElementById("provider-form").scrollIntoView({ behavior: "smooth" });
  renderAdminProviderList();
}

function setImagePreview(url) {
  const preview = document.getElementById("current-image-preview");
  const placeholder = document.getElementById("dropzone-placeholder");
  if (url) {
    preview.src = url;
    preview.hidden = false;
    placeholder.hidden = true;
  } else {
    preview.hidden = true;
    placeholder.hidden = false;
  }
}

function resetForm() {
  editingProviderId = null;
  document.getElementById("provider-form").reset();
  setImagePreview(null);
  renderWorkingDaysCheckboxes();
  clearLocation();
  updateSubscriptionHint();
  document.getElementById("provider-form-title").textContent = t("admin_add_provider_title");
  document.getElementById("provider-form-submit").textContent = t("admin_save_button");
  document.getElementById("cancel-edit-btn").hidden = true;
  document.getElementById("new-category-box").hidden = true;
  document.getElementById("new-owner-box").hidden = true;
  document.getElementById("toggle-reset-password").hidden = true;
  document.getElementById("reset-password-box").hidden = true;
  renderAdminProviderList();
}

document.getElementById("cancel-edit-btn").addEventListener("click", resetForm);
document.getElementById("new-provider-btn").addEventListener("click", resetForm);

document.getElementById("toggle-reset-password").addEventListener("click", () => {
  const box = document.getElementById("reset-password-box");
  box.hidden = !box.hidden;
});

document.getElementById("reset-owner-password-btn").addEventListener("click", async () => {
  const email = document.getElementById("owner-email").value.trim();
  const password = document.getElementById("reset-owner-password").value;
  const resultEl = document.getElementById("reset-owner-password-result");
  if (!email || !password) return;

  resultEl.textContent = "...";
  const { error } = await sb.functions.invoke("create-provider-user", {
    body: { email, password }
  });

  if (error) {
    resultEl.textContent = t("admin_reset_owner_password_error") + " (" + error.message + ")";
    return;
  }

  resultEl.textContent = t("admin_reset_owner_password_success");
  document.getElementById("reset-owner-password").value = "";
});

// Zeigt an, ob das Abo aktiv/bald ablaufend/abgelaufen ist, direkt unter dem Datumsfeld.
function updateSubscriptionHint() {
  const hintEl = document.getElementById("subscription-status-hint");
  const value = document.getElementById("subscription-until").value;
  if (!value) {
    hintEl.textContent = t("admin_subscription_none");
    return;
  }
  const daysLeft = Math.ceil((new Date(value + "T00:00:00") - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (daysLeft < 0) hintEl.textContent = t("admin_subscription_expired");
  else if (daysLeft <= 7) hintEl.textContent = t("admin_subscription_expiring").replace("{days}", formatTime(String(daysLeft)));
  else hintEl.textContent = t("admin_subscription_active").replace("{days}", formatTime(String(daysLeft)));
}

document.getElementById("subscription-until").addEventListener("change", updateSubscriptionHint);

function extendSubscription(days) {
  const input = document.getElementById("subscription-until");
  const base = input.value && new Date(input.value + "T00:00:00") > new Date() ? new Date(input.value + "T00:00:00") : new Date();
  base.setDate(base.getDate() + days);
  input.value = base.toISOString().split("T")[0];
  updateSubscriptionHint();
}

document.getElementById("extend-30-btn").addEventListener("click", () => extendSubscription(30));
document.getElementById("extend-90-btn").addEventListener("click", () => extendSubscription(90));

document.getElementById("image").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) setImagePreview(URL.createObjectURL(file));
});

async function deleteProvider(id) {
  if (!confirm(t("admin_delete_confirm"))) return;
  const { error } = await sb.from("providers").delete().eq("id", id);
  if (!error) {
    if (editingProviderId === id) resetForm();
    loadAdminProviders();
  }
}

document.getElementById("toggle-new-category").addEventListener("click", () => {
  const box = document.getElementById("new-category-box");
  box.hidden = !box.hidden;
});

document.getElementById("toggle-new-owner").addEventListener("click", () => {
  const box = document.getElementById("new-owner-box");
  box.hidden = !box.hidden;
});

document.getElementById("create-owner-btn").addEventListener("click", async () => {
  const email = document.getElementById("new-owner-email").value.trim();
  const password = document.getElementById("new-owner-password").value;
  const resultEl = document.getElementById("create-owner-result");
  if (!email || !password) return;

  resultEl.textContent = "...";
  const { data, error } = await sb.functions.invoke("create-provider-user", {
    body: { email, password }
  });

  if (error) {
    resultEl.textContent = t("admin_create_owner_error") + " (" + error.message + ")";
    return;
  }

  resultEl.textContent = t("admin_create_owner_success");
  document.getElementById("owner-email").value = email;
  document.getElementById("new-owner-email").value = "";
  document.getElementById("new-owner-password").value = "";
  document.getElementById("new-owner-box").hidden = true;
});

document.getElementById("add-category-btn").addEventListener("click", async () => {
  const nameAr = document.getElementById("new-category-ar").value.trim();
  const nameEn = document.getElementById("new-category-en").value.trim();
  if (!nameAr || !nameEn) return;

  const { data, error } = await sb
    .from("categories")
    .insert({ name_ar: nameAr, name_en: nameEn })
    .select()
    .single();

  if (error) return;

  await loadCategories();
  renderCategoryOptions();
  document.getElementById("category").value = data.id;
  document.getElementById("new-category-ar").value = "";
  document.getElementById("new-category-en").value = "";
  document.getElementById("new-category-box").hidden = true;
});

document.getElementById("provider-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const resultEl = document.getElementById("provider-form-result");

  const workingDays = Array.from(
    document.querySelectorAll("#working-days input:checked")
  ).map((el) => Number(el.value));

  let imageUrl = editingProviderId
    ? (adminProviders.find((p) => p.id === editingProviderId) || {}).image_url || null
    : null;
  const oldImageUrl = imageUrl;

  const file = document.getElementById("image").files[0];
  if (file) {
    const compressed = await compressImage(file);
    const path = `${Date.now()}.jpg`;
    const { error: uploadError } = await sb.storage
      .from("provider-images")
      .upload(path, compressed, { contentType: "image/jpeg" });
    if (uploadError) {
      resultEl.textContent = t("admin_save_error") + " (" + uploadError.message + ")";
      return;
    }
    imageUrl = sb.storage.from("provider-images").getPublicUrl(path).data.publicUrl;

    // Altes Bild loeschen, damit im Storage-Bucket keine verwaisten Dateien liegen bleiben.
    if (oldImageUrl) {
      const oldPath = oldImageUrl.split("/provider-images/")[1];
      if (oldPath) await sb.storage.from("provider-images").remove([oldPath]);
    }
  }

  const payload = {
    name_ar: document.getElementById("name-ar").value.trim(),
    name_en: document.getElementById("name-en").value.trim(),
    category_id: document.getElementById("category").value,
    phone_whatsapp: normalizeLebanonPhoneDigits(document.getElementById("phone").value.trim()),
    description_ar: document.getElementById("description-ar").value.trim(),
    description_en: document.getElementById("description-en").value.trim(),
    address: document.getElementById("address").value.trim(),
    image_url: imageUrl,
    latitude: selectedLat,
    longitude: selectedLng,
    working_days: workingDays,
    start_time: document.getElementById("start-time").value,
    end_time: document.getElementById("end-time").value,
    slot_minutes: Number(document.getElementById("slot-minutes").value),
    featured: document.getElementById("featured-toggle").checked,
    subscription_active_until: document.getElementById("subscription-until").value || null
  };

  const { data: savedProvider, error } = editingProviderId
    ? await sb.from("providers").update(payload).eq("id", editingProviderId).select().single()
    : await sb.from("providers").insert(payload).select().single();

  if (error) {
    resultEl.textContent = t("admin_save_error") + " (" + error.message + ")";
    return;
  }

  const ownerEmail = document.getElementById("owner-email").value.trim();
  if (ownerEmail) {
    await sb.from("provider_owners").upsert({ provider_id: savedProvider.id, email: ownerEmail });
  } else {
    await sb.from("provider_owners").delete().eq("provider_id", savedProvider.id);
  }

  resultEl.textContent = t("admin_save_success");
  resetForm();
  loadAdminProviders();
  loadProviderOwners();
});

async function showAppointmentsModal(provider) {
  document.getElementById("appt-modal-title").textContent = providerName(provider);
  const listEl = document.getElementById("appt-modal-list");
  listEl.innerHTML = `<p class="hint">${t("admin_appointments_loading")}</p>`;
  document.getElementById("appt-modal").hidden = false;

  const { data, error } = await sb
    .from("appointments")
    .select("*")
    .eq("provider_id", provider.id)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (error || !data || data.length === 0) {
    listEl.className = "";
    listEl.innerHTML = `<p>${t("owner_no_appointments")}</p>`;
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = data.filter((a) => a.appointment_date >= today);
  const past = data
    .filter((a) => a.appointment_date < today)
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date) || a.appointment_time.localeCompare(b.appointment_time));
  const ordered = [...upcoming, ...past];

  const groups = [];
  ordered.forEach((a) => {
    const last = groups[groups.length - 1];
    if (last && last.date === a.appointment_date) {
      last.items.push(a);
    } else {
      groups.push({ date: a.appointment_date, items: [a] });
    }
  });

  listEl.className = "appt-groups";
  listEl.innerHTML = groups
    .map(
      (group) => `
        <div class="appt-group">
          <h3 class="appt-group-title">${groupDateLabel(group.date)}</h3>
          <div class="appt-list">
            ${group.items.map((a) => adminAppointmentRowHTML(a)).join("")}
          </div>
        </div>`
    )
    .join("");
}

// Wie appointmentRowHTML() in owner.js, aber ohne WhatsApp-/Kalender-Aktionen --
// der Admin soll Kunden nicht direkt anschreiben koennen.
function adminAppointmentRowHTML(a) {
  const label = a.blocked ? t("owner_slot_blocked_by_you") : a.customer_name;
  return `
    <div class="appt-row ${a.blocked ? "blocked" : ""}">
      <span class="appt-row-time">${formatTime(a.appointment_time.slice(0, 5))}</span>
      <span class="appt-row-customer">${label}</span>
    </div>`;
}

document.getElementById("appt-modal-close").addEventListener("click", () => {
  document.getElementById("appt-modal").hidden = true;
});

