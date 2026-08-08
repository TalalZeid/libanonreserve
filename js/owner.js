let ownerProviderId = null;
let ownerProvider = null;
let ownerSelectedDate = null;

const CALENDAR_ICON = `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="5" width="18" height="16" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M3 10h18M8 3v4M16 3v4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const WHATSAPP_ICON = `<svg class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.2.2-.3.2-.5.1-1.4-.7-2.3-1.3-3.2-2.8-.2-.4.2-.4.6-1.2.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.4-.3Z"/>
</svg>`;

function contactCustomerLink(appt) {
  const text =
    getLang() === "ar"
      ? `مرحبًا ${appt.customer_name}، بخصوص موعدك بتاريخ ${appt.appointment_date} الساعة ${formatTime(appt.appointment_time.slice(0, 5))}`
      : `Hi ${appt.customer_name}, regarding your appointment on ${appt.appointment_date} at ${appt.appointment_time.slice(0, 5)}`;
  return buildWhatsappContactLink(appt.customer_phone, text);
}

function computeOwnerStats(appointments) {
  const real = appointments.filter((a) => !a.blocked);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const thisWeek = real.filter((a) => {
    const d = new Date(a.appointment_date + "T00:00:00");
    return d >= startOfWeek && d < endOfWeek;
  }).length;

  return { total: real.length, thisWeek };
}

function renderOwnerStats(appointments) {
  const statsEl = document.getElementById("owner-stats");
  if (!statsEl) return;
  const { total, thisWeek } = computeOwnerStats(appointments);
  statsEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-value">${formatTime(String(total))}</span>
      <span class="stat-label">${t("stats_total_bookings")}</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">${formatTime(String(thisWeek))}</span>
      <span class="stat-label">${t("stats_this_week")}</span>
    </div>
  `;
}

// Gibt true zurueck, wenn die eingeloggte E-Mail einer Firma zugeordnet ist,
// und laedt dann deren Dashboard. Sonst false (login.js zeigt dann den
// "kein Konto gefunden"-Hinweis).
async function loadOwnerProvider() {
  const { data: ownerRow, error: ownerError } = await sb
    .from("provider_owners")
    .select("provider_id, push_token")
    .single();

  if (ownerError || !ownerRow) {
    return false;
  }
  ownerProviderId = ownerRow.provider_id;
  updatePushButtonLabel(!!ownerRow.push_token);

  const { data: provider } = await sb
    .from("providers")
    .select("*, category:categories(*)")
    .eq("id", ownerProviderId)
    .single();
  ownerProvider = provider;
  renderOwnerHeader();

  const dateInput = document.getElementById("owner-date-input");
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
  dateInput.addEventListener("change", loadOwnerDay);
  loadOwnerDay();
  loadClosedDays();
  loadAllAppointments();
  return true;
}

function renderOwnerHeader() {
  document.getElementById("owner-provider-header").innerHTML = `
    ${
      ownerProvider.image_url
        ? `<img class="provider-avatar-sm" src="${ownerProvider.image_url}" alt="" />`
        : `<div class="provider-avatar-sm provider-avatar-placeholder">${providerInitial(ownerProvider)}</div>`
    }
    <div class="provider-list-item-text">
      <strong>${providerName(ownerProvider)}</strong>
      <span class="provider-category">${categoryLabel(ownerProvider.category)}</span>
    </div>
  `;
}

document.querySelectorAll(".owner-nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".owner-nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.getAttribute("data-view");
    document.querySelectorAll(".owner-view").forEach((v) => {
      v.hidden = v.id !== `owner-view-${view}`;
    });
  });
});

async function loadOwnerDay() {
  const date = document.getElementById("owner-date-input").value;
  ownerSelectedDate = date;
  const statusEl = document.getElementById("owner-day-status");
  const slotsEl = document.getElementById("owner-slots-list");
  const closeDayBtn = document.getElementById("close-day-btn");
  document.getElementById("owner-slot-detail").innerHTML = "";
  slotsEl.innerHTML = "";

  const { data: closedRows } = await sb
    .from("closed_days")
    .select("id")
    .eq("provider_id", ownerProviderId)
    .eq("date", date);
  const closedRow = closedRows && closedRows[0];

  closeDayBtn.textContent = closedRow ? t("owner_reopen_day_button") : t("owner_close_day_button");
  closeDayBtn.dataset.closedId = closedRow ? closedRow.id : "";

  if (closedRow) {
    statusEl.textContent = t("owner_day_closed_status");
    return;
  }

  const dayOfWeek = new Date(date + "T00:00:00").getDay();
  if (!ownerProvider.working_days.includes(dayOfWeek)) {
    statusEl.textContent = t("provider_not_working_day");
    return;
  }

  const allSlots = generateSlots(
    ownerProvider.start_time.slice(0, 5),
    ownerProvider.end_time.slice(0, 5),
    ownerProvider.slot_minutes
  );

  const { data: appts, error } = await sb
    .from("appointments")
    .select("*")
    .eq("provider_id", ownerProviderId)
    .eq("appointment_date", date);

  if (error) {
    statusEl.textContent = error.message;
    return;
  }

  const apptByTime = {};
  (appts || []).forEach((a) => {
    apptByTime[a.appointment_time.slice(0, 5)] = a;
  });

  statusEl.textContent = "";
  slotsEl.innerHTML = allSlots
    .map((s) => {
      const appt = apptByTime[s];
      let cls = "slot-btn";
      if (appt && appt.blocked) cls += " owner-blocked";
      else if (appt) cls += " owner-booked";
      return `<button type="button" class="${cls}" data-slot="${s}">${formatTime(s)}</button>`;
    })
    .join("");

  slotsEl.querySelectorAll(".slot-btn").forEach((btn) => {
    const slot = btn.getAttribute("data-slot");
    btn.addEventListener("click", () => showOwnerSlotDetail(slot, apptByTime[slot]));
  });
}

function showOwnerSlotDetail(slot, appt) {
  const detailEl = document.getElementById("owner-slot-detail");

  if (!appt) {
    detailEl.innerHTML = `
      <div class="surface-card owner-slot-detail-card">
        <p><strong>${formatTime(slot)}</strong> — ${t("owner_slot_free")}</p>
        <button type="button" id="block-slot-btn">${t("owner_block_slot_button")}</button>
      </div>`;
    document.getElementById("block-slot-btn").addEventListener("click", async () => {
      const { error } = await sb.from("appointments").insert({
        provider_id: ownerProviderId,
        appointment_date: ownerSelectedDate,
        appointment_time: slot,
        blocked: true
      });
      if (!error) loadOwnerDay();
    });
    return;
  }

  if (appt.blocked) {
    detailEl.innerHTML = `
      <div class="surface-card owner-slot-detail-card">
        <p><strong>${formatTime(slot)}</strong> — ${t("owner_slot_blocked_by_you")}</p>
        <button type="button" id="unblock-slot-btn">${t("owner_unblock_slot_button")}</button>
      </div>`;
    document.getElementById("unblock-slot-btn").addEventListener("click", async () => {
      const { error } = await sb.from("appointments").delete().eq("id", appt.id);
      if (!error) loadOwnerDay();
    });
    return;
  }

  detailEl.innerHTML = `
    <div class="surface-card owner-slot-detail-card">
      <p><strong>${formatTime(slot)}</strong></p>
      <p>${appt.customer_name} — ${appt.customer_phone}</p>
      <a class="whatsapp-btn" target="_blank" rel="noopener" href="${contactCustomerLink(appt)}">${WHATSAPP_ICON} ${t("contact_customer")}</a>
      <button type="button" id="add-to-calendar-detail-btn">${CALENDAR_ICON} ${t("add_to_calendar")}</button>
      <button type="button" id="cancel-booking-btn" class="danger-btn">${t("owner_cancel_booking_button")}</button>
    </div>`;
  document.getElementById("add-to-calendar-detail-btn").addEventListener("click", () => {
    downloadICS({
      title: `${providerName(ownerProvider)} — ${appt.customer_name}`,
      description: appt.customer_phone || "",
      dateStr: ownerSelectedDate,
      timeStr: slot,
      durationMinutes: ownerProvider.slot_minutes
    });
  });
  document.getElementById("cancel-booking-btn").addEventListener("click", async () => {
    if (!confirm(t("owner_cancel_booking_confirm"))) return;
    const { error } = await sb.from("appointments").delete().eq("id", appt.id);
    if (!error) {
      loadOwnerDay();
      loadAllAppointments();
    }
  });
}

document.getElementById("close-day-btn").addEventListener("click", async () => {
  const closedId = document.getElementById("close-day-btn").dataset.closedId;
  if (closedId) {
    await sb.from("closed_days").delete().eq("id", closedId);
  } else {
    await sb.from("closed_days").insert({ provider_id: ownerProviderId, date: ownerSelectedDate });
  }
  loadOwnerDay();
  loadClosedDays();
});

async function loadClosedDays() {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await sb
    .from("closed_days")
    .select("*")
    .eq("provider_id", ownerProviderId)
    .gte("date", today)
    .order("date");

  const listEl = document.getElementById("closed-days-list");
  if (!data || data.length === 0) {
    listEl.innerHTML = `<p>${t("owner_no_closed_days")}</p>`;
    return;
  }

  listEl.innerHTML = data
    .map(
      (d) => `
      <div class="admin-provider-row">
        <span>${d.date}</span>
        <button type="button" class="link-btn danger" data-reopen="${d.id}">${t("owner_reopen_day_button")}</button>
      </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-reopen]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await sb.from("closed_days").delete().eq("id", btn.getAttribute("data-reopen"));
      loadClosedDays();
      loadOwnerDay();
    });
  });
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = formatTime(String(d.getDate()).padStart(2, "0"));
  const month = d.toLocaleDateString(getLang() === "ar" ? "ar" : "en", { month: "short" });
  return { day, month };
}

async function loadAllAppointments() {
  const { data, error } = await sb
    .from("appointments")
    .select("*")
    .eq("provider_id", ownerProviderId)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  renderOwnerStats(data || []);

  const listEl = document.getElementById("all-appointments-list");
  if (error || !data || data.length === 0) {
    listEl.className = "";
    listEl.innerHTML = `<p>${t("owner_no_appointments")}</p>`;
    return;
  }

  listEl.className = "appointments-grid";
  listEl.innerHTML = data
    .map((a) => {
      const { day, month } = formatShortDate(a.appointment_date);
      const label = a.blocked ? t("owner_slot_blocked_by_you") : a.customer_name;
      return `
        <div class="appointment-card ${a.blocked ? "blocked" : ""}">
          <div class="appointment-card-date">
            <span class="appointment-day">${day}</span>
            <span class="appointment-month">${month}</span>
          </div>
          <strong class="appointment-time">${formatTime(a.appointment_time.slice(0, 5))}</strong>
          <span class="appointment-customer">${label}</span>
          <div class="appointment-card-actions">
            ${
              a.blocked
                ? ""
                : `<a class="icon-btn" target="_blank" rel="noopener" href="${contactCustomerLink(a)}" title="${t("contact_customer")}">${WHATSAPP_ICON}</a>`
            }
            <button type="button" class="icon-btn" data-calendar="${a.id}" title="${t("add_to_calendar")}">${CALENDAR_ICON}</button>
            <button type="button" class="icon-btn danger" data-cancel="${a.id}" title="${t("admin_delete")}">${TRASH_ICON}</button>
          </div>
        </div>`;
    })
    .join("");

  listEl.querySelectorAll("[data-calendar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const appt = data.find((a) => a.id === btn.getAttribute("data-calendar"));
      if (!appt) return;
      downloadICS({
        title: appt.blocked
          ? `${providerName(ownerProvider)} — ${t("owner_slot_blocked_by_you")}`
          : `${providerName(ownerProvider)} — ${appt.customer_name}`,
        description: appt.customer_phone || "",
        dateStr: appt.appointment_date,
        timeStr: appt.appointment_time.slice(0, 5),
        durationMinutes: ownerProvider.slot_minutes
      });
    });
  });

  listEl.querySelectorAll("[data-cancel]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm(t("owner_cancel_booking_confirm"))) return;
      await sb.from("appointments").delete().eq("id", btn.getAttribute("data-cancel"));
      loadAllAppointments();
      loadOwnerDay();
      loadClosedDays();
    });
  });
}

function updatePushButtonLabel(enabled) {
  const label = document.getElementById("enable-push-label");
  const btn = document.getElementById("enable-push-btn");
  if (!label || !btn) return;
  label.textContent = enabled ? t("owner_push_enabled") : t("owner_enable_push");
  btn.classList.toggle("enabled", enabled);
}

document.getElementById("enable-push-btn").addEventListener("click", async () => {
  const token = await requestPushToken();
  if (!token) {
    alert(t("owner_push_denied"));
    return;
  }
  await sb.from("provider_owners").update({ push_token: token }).eq("provider_id", ownerProviderId);
  updatePushButtonLabel(true);
});

