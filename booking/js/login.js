// Zentrale Steuerung: ein Login fuer alle. Nach dem Einloggen wird geprueft,
// ob die E-Mail zum Super-Admin gehoert (admins-Tabelle) oder zu einer
// bestimmten Firma (provider_owners-Tabelle), und die passende Ansicht
// gezeigt.

document.getElementById("toggle-login-password").addEventListener("click", () => {
  const input = document.getElementById("login-password");
  input.type = input.type === "password" ? "text" : "password";
});

async function checkSession() {
  const { data } = await sb.auth.getSession();
  const loggedIn = !!data.session;

  document.getElementById("login-form").hidden = loggedIn;
  document.getElementById("session-bar").hidden = !loggedIn;
  document.getElementById("admin-panel").hidden = true;
  document.getElementById("owner-panel").hidden = true;
  document.getElementById("no-account-message").hidden = true;
  document.getElementById("enable-push-btn").hidden = true;

  if (!loggedIn) return;

  document.getElementById("session-label").textContent = data.session.user.email;

  const { data: isAdminResult } = await sb.rpc("is_admin");
  if (isAdminResult) {
    document.getElementById("admin-panel").hidden = false;
    await activateAdminPanel();
    return;
  }

  const foundOwner = await loadOwnerProvider();
  if (foundOwner) {
    document.getElementById("owner-panel").hidden = false;
    return;
  }

  document.getElementById("no-account-message").hidden = false;
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = t("admin_login_error");
    return;
  }
  errorEl.textContent = "";
  checkSession();
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await sb.auth.signOut();
  checkSession();
});

function onLangChange() {
  if (!document.getElementById("admin-panel").hidden) {
    renderCategoryOptions();
    renderWorkingDaysCheckboxes();
    renderAdminProviderList();
  }
  if (!document.getElementById("owner-panel").hidden) {
    renderOwnerHeader();
    loadOwnerDay();
    loadClosedDays();
    loadAllAppointments();
  }
}

document.addEventListener("DOMContentLoaded", checkSession);
