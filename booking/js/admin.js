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

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      locationMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
    });
  }
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
}

function clearLocation() {
  selectedLat = null;
  selectedLng = null;
  if (locationMarker) {
    locationMap.removeLayer(locationMarker);
    locationMarker = null;
  }
  document.getElementById("location-readout").textContent = "";
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

function showQrModal(provider) {
  const url = `${window.location.origin}/provider.html?id=${provider.id}`;
  document.getElementById("qr-modal-title").textContent = providerName(provider);
  document.getElementById("qr-modal-url").textContent = url;

  const container = document.getElementById("qr-canvas");
  container.innerHTML = "";
  new QRCode(container, {
    text: url,
    width: 220,
    height: 220,
    correctLevel: QRCode.CorrectLevel.M
  });

  const canvas = container.querySelector("canvas");
  if (canvas) {
    document.getElementById("qr-download-btn").href = canvas.toDataURL("image/png");
  }

  document.getElementById("qr-modal").hidden = false;
}

document.getElementById("qr-modal-close").addEventListener("click", () => {
  document.getElementById("qr-modal").hidden = true;
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
        <button type="button" class="icon-btn" data-qr="${p.id}" title="${t("admin_qr_button")}">${QR_ICON}</button>
        <button type="button" class="icon-btn danger" data-delete="${p.id}" title="${t("admin_delete")}">${TRASH_ICON}</button>
      </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.getAttribute("data-edit")));
  });
  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteProvider(btn.getAttribute("data-delete")));
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
  renderAdminProviderList();
}

document.getElementById("cancel-edit-btn").addEventListener("click", resetForm);
document.getElementById("new-provider-btn").addEventListener("click", resetForm);

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
    phone_whatsapp: document.getElementById("phone").value.trim(),
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

