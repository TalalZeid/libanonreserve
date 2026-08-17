const params = new URLSearchParams(window.location.search);
const providerId = params.get("id");
const MIN_BOOKINGS_TO_SHOW = 10;

let currentProvider = null;
let selectedSlot = null;
let currentBookingCount = 0;

function findCachedProvider(id) {
  try {
    const cache = JSON.parse(localStorage.getItem("cached_providers_v1"));
    return (cache && cache.providers.find((p) => p.id === id)) || null;
  } catch {
    return null;
  }
}

async function loadProvider() {
  if (!providerId) {
    window.location.href = "index.html";
    return;
  }

  const infoEl = document.getElementById("provider-info");
  const { data, error } = await sb
    .from("providers")
    .select("*, category:categories(*)")
    .eq("id", providerId)
    .single();

  if (error || !data) {
    if (!navigator.onLine) {
      const cached = findCachedProvider(providerId);
      if (cached) {
        currentProvider = cached;
        currentBookingCount = 0;
        const bannerEl = document.getElementById("offline-banner");
        if (bannerEl) {
          bannerEl.textContent = t("offline_banner_provider");
          bannerEl.hidden = false;
        }
        renderProviderInfo();
        return;
      }
    }
    infoEl.innerHTML = `<p>${error ? error.message : "Not found"}</p>`;
    return;
  }

  currentProvider = data;

  if (isProviderLocked(data)) {
    currentBookingCount = 0;
    renderProviderInfo();
    return;
  }

  const { data: countResult } = await sb.rpc("get_booking_count", { p_provider_id: providerId });
  currentBookingCount = countResult || 0;
  renderProviderInfo();
  document.getElementById("booking-section").hidden = false;

  const dateInput = document.getElementById("date-input");
  const today = new Date().toISOString().split("T")[0];
  dateInput.min = today;
  dateInput.value = params.get("date") || today;
  dateInput.addEventListener("change", loadSlotsForSelectedDate);
  loadSlotsForSelectedDate();
  checkCancelRequest();
}

const PIN_ICON = `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="10" r="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ROUTE_ICON = `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M4 19h4l1-14h6l1 14h4M9 5h6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SHARE_ICON = `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="18" cy="5" r="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="6" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="18" cy="19" r="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const CHECK_SHIELD_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function floatCard(kind, icon, title, sub) {
  return `<div class="float-card ${kind}">
    <span class="float-icon">${icon}</span>
    <span><b>${title}</b><small>${sub}</small></span>
  </div>`;
}

function buildRecommendLink() {
  const url = `${window.location.origin}${window.location.pathname}?id=${providerId}`;
  const providerLabel = providerName(currentProvider);
  const message =
    getLang() === "ar"
      ? `شاهد ${providerLabel} على مواعيد، يمكنك حجز موعد مباشرة من هنا:\n${url}`
      : `Check out ${providerLabel}, you can book an appointment directly here:\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function renderProviderInfo() {
  const p = currentProvider;
  const locked = isProviderLocked(p);
  const hasLocation = !locked && p.latitude != null && p.longitude != null;
  const description = !locked ? providerDescription(p) : "";

  document.getElementById("provider-info").innerHTML = `
    <div class="provider-header">
      ${
        !locked
          ? `<div class="float-badges-row">
              ${p.featured ? floatCard("featured", STAR_ICON, t("featured_badge"), t("featured_badge_sub")) : ""}
              ${floatCard("verified", CHECK_SHIELD_ICON, t("verified_badge"), t("verified_badge_sub"))}
            </div>`
          : ""
      }
      ${
        p.image_url
          ? `<img class="provider-avatar" src="${p.image_url}" alt="" />`
          : `<div class="provider-avatar provider-avatar-placeholder">${providerInitial(p)}</div>`
      }
      <span class="provider-category">${categoryLabel(p.category)}</span>
      <h1 class="provider-name">${providerName(p)}</h1>
      ${!locked && currentBookingCount >= MIN_BOOKINGS_TO_SHOW ? `<p class="booking-count">${PEOPLE_ICON} ${t("booking_count_label").replace("{count}", formatTime(String(currentBookingCount)))}</p>` : ""}
    </div>
    ${
      locked
        ? `<div class="provider-info-body">
            <p class="provider-locked-notice">${t("provider_unavailable_notice")}</p>
          </div>`
        : `<div class="provider-info-body">
            ${description ? `<p class="provider-description">${description}</p>` : ""}
            ${p.address ? `<p class="provider-address">${PIN_ICON} ${p.address}</p>` : ""}
            ${
              hasLocation
                ? `<div id="provider-map" class="provider-map"></div>
                   <div class="directions-links">
                     <a class="directions-btn" target="_blank" rel="noopener"
                        href="https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}">${ROUTE_ICON} Google Maps</a>
                   </div>`
                : ""
            }
            <a class="recommend-btn" target="_blank" rel="noopener" href="${buildRecommendLink()}">
              ${SHARE_ICON} ${t("recommend_button")}
            </a>
          </div>`
    }
  `;

  if (locked) return;

  if (hasLocation) {
    const map = L.map("provider-map", { zoomControl: false, attributionControl: false }).setView(
      [p.latitude, p.longitude],
      16
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    L.marker([p.latitude, p.longitude]).addTo(map);
  }

  const waFab = document.getElementById("whatsapp-fab");
  if (waFab) {
    const inquiryText =
      getLang() === "ar"
        ? `مرحبا، عندي سؤال بخصوص ${providerName(p)}`
        : `Hi, I have a question about ${providerName(p)}`;
    waFab.href = buildWhatsappContactLink(p.phone_whatsapp, inquiryText);
    waFab.hidden = false;
  }
}

async function loadSlotsForSelectedDate() {
  const date = document.getElementById("date-input").value;
  const statusEl = document.getElementById("slots-status");
  const slotsEl = document.getElementById("slots-list");
  slotsEl.innerHTML = "";
  hideBookingForm();

  const dayOfWeek = new Date(date + "T00:00:00").getDay();
  if (!currentProvider.working_days.includes(dayOfWeek)) {
    statusEl.textContent = t("provider_not_working_day");
    return;
  }

  const allSlots = generateSlots(
    currentProvider.start_time.slice(0, 5),
    currentProvider.end_time.slice(0, 5),
    currentProvider.slot_minutes
  );

  const { data: booked, error } = await sb.rpc("get_booked_slots", {
    p_provider_id: providerId,
    p_date: date
  });

  if (error) {
    statusEl.textContent = error.message;
    return;
  }

  const bookedTimes = new Set((booked || []).map((b) => b.appointment_time.slice(0, 5)));

  const now = new Date();
  const isToday = date === now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const isPast = (s) => isToday && s <= currentTime;

  const freeCount = allSlots.filter((s) => !bookedTimes.has(s) && !isPast(s)).length;

  statusEl.textContent = freeCount === 0 ? t("provider_no_slots") : "";
  slotsEl.innerHTML = allSlots
    .map((s) => {
      const isUnavailable = bookedTimes.has(s) || isPast(s);
      return `<button type="button" class="slot-btn ${isUnavailable ? "booked" : ""}" data-slot="${s}" ${isUnavailable ? "disabled" : ""}>${formatTime(s)}</button>`;
    })
    .join("");

  slotsEl.querySelectorAll(".slot-btn:not(.booked)").forEach((btn) => {
    btn.addEventListener("click", () => selectSlot(btn.getAttribute("data-slot")));
  });
}

function selectSlot(slot) {
  selectedSlot = slot;
  document.querySelectorAll(".slot-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.getAttribute("data-slot") === slot);
  });
  document.getElementById("selected-slot-label").textContent = formatTime(slot);
  document.getElementById("booking-form").hidden = false;
  document.getElementById("booking-result").textContent = "";
}

function hideBookingForm() {
  selectedSlot = null;
  document.getElementById("booking-form").hidden = true;
  document.getElementById("booking-result").textContent = "";
}

function buildWhatsappLink(name, date, time) {
  const providerLabel = providerName(currentProvider);
  const message =
    getLang() === "ar"
      ? `حجز جديد لدى ${providerLabel}\nالاسم: ${name}\nالتاريخ: ${date}\nالوقت: ${formatTime(time)}`
      : `New booking for ${providerLabel}\nName: ${name}\nDate: ${date}\nTime: ${time}`;
  return `https://wa.me/${currentProvider.phone_whatsapp}?text=${encodeURIComponent(message)}`;
}

document.getElementById("booking-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("date-input").value;
  const name = document.getElementById("customer-name").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  const resultEl = document.getElementById("booking-result");
  const appointmentId = crypto.randomUUID();

  let pushToken = null;
  if (document.getElementById("reminder-checkbox").checked) {
    pushToken = await requestPushToken();
  }

  const { error } = await sb.from("appointments").insert({
    id: appointmentId,
    provider_id: providerId,
    customer_name: name,
    customer_phone: phone,
    appointment_date: date,
    appointment_time: selectedSlot,
    push_token: pushToken
  });

  if (error) {
    if (error.code === "23505") {
      resultEl.textContent = t("provider_slot_taken");
      loadSlotsForSelectedDate();
    } else {
      resultEl.textContent = t("provider_booking_error");
    }
    return;
  }

  const waLink = buildWhatsappLink(name, date, selectedSlot);
  const cancelUrl = `${window.location.origin}${window.location.pathname}?id=${providerId}&cancel=${appointmentId}&date=${date}&time=${selectedSlot}`;
  resultEl.innerHTML = `
    <p>${t("provider_booking_success")}</p>
    <a class="whatsapp-btn" href="${waLink}" target="_blank" rel="noopener">${t("provider_send_whatsapp")}</a>
    <button type="button" id="add-to-calendar-btn" class="calendar-btn">${t("add_to_calendar")}</button>
    <p class="cancel-hint">
      ${t("provider_cancel_hint")}<br />
      <a href="${cancelUrl}">${t("provider_cancel_link")}</a>
    </p>
  `;
  document.getElementById("add-to-calendar-btn").addEventListener("click", () => {
    downloadICS({
      title: `${t("provider_book_button")} — ${providerName(currentProvider)}`,
      description: currentProvider.address || "",
      dateStr: date,
      timeStr: selectedSlot,
      durationMinutes: currentProvider.slot_minutes
    });
  });
  document.getElementById("booking-form").hidden = true;
  loadSlotsForSelectedDate();
});

async function checkCancelRequest() {
  const cancelId = params.get("cancel");
  const date = params.get("date");
  const time = params.get("time");
  if (!cancelId || !date || !time) return;

  const box = document.createElement("div");
  box.className = "cancel-box surface-card";
  box.innerHTML = `
    <p>${t("provider_cancel_confirm_text")} <strong>${date} · ${formatTime(time)}</strong></p>
    <button type="button" id="confirm-cancel-btn">${t("provider_cancel_button")}</button>
    <p id="cancel-result"></p>
  `;
  document.querySelector(".provider-layout").before(box);

  document.getElementById("confirm-cancel-btn").addEventListener("click", async () => {
    const { error } = await sb.from("appointments").delete().eq("id", cancelId);
    const cancelResult = document.getElementById("cancel-result");
    if (error) {
      cancelResult.textContent = t("provider_cancel_error");
      return;
    }
    cancelResult.textContent = t("provider_cancel_success");
    document.getElementById("confirm-cancel-btn").hidden = true;
    loadSlotsForSelectedDate();
  });
}

function onLangChange() {
  renderProviderInfo();
  loadSlotsForSelectedDate();
}

document.addEventListener("DOMContentLoaded", loadProvider);
