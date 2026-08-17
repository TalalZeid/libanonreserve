let allProviders = [];
let activeCategoryId = "all";
let searchQuery = "";
let bookingCounts = {};
let visibleCount = 0;

const MIN_BOOKINGS_TO_SHOW = 10;
const PAGE_SIZE = 24;
const CACHE_KEY = "cached_providers_v1";

function saveProvidersCache() {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ providers: allProviders, counts: bookingCounts, savedAt: Date.now() })
  );
}

function loadProvidersCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function showOfflineBanner(savedAt) {
  const bannerEl = document.getElementById("offline-banner");
  if (!bannerEl) return;
  const date = new Date(savedAt);
  bannerEl.textContent = `${t("offline_banner")} (${date.toLocaleDateString()} ${date.toLocaleTimeString().slice(0, 5)})`;
  bannerEl.hidden = false;
}

async function loadProviders() {
  await loadCategories();

  try {
    const { data, error } = await sb
      .from("providers")
      .select("*, category:categories(*)")
      .order("created_at");
    if (error) throw error;

    const { data: counts } = await sb.rpc("get_all_booking_counts");
    bookingCounts = {};
    (counts || []).forEach((row) => {
      bookingCounts[row.provider_id] = row.booking_count;
    });

    allProviders = data;
    saveProvidersCache();
  } catch (err) {
    const cached = loadProvidersCache();
    if (!cached) {
      document.getElementById("provider-list").innerHTML = `<p>${err.message || err}</p>`;
      return;
    }
    allProviders = cached.providers;
    bookingCounts = cached.counts;
    showOfflineBanner(cached.savedAt);
  }

  visibleCount = PAGE_SIZE;
  renderFilters();
  renderProviders();
}

function renderFilters() {
  const filtersEl = document.getElementById("category-filters");
  const buttons = [`<button class="filter-btn ${activeCategoryId === "all" ? "active" : ""}" data-cat="all">${t("category_all")}</button>`]
    .concat(
      allCategories.map(
        (cat) =>
          `<button class="filter-btn ${cat.id === activeCategoryId ? "active" : ""}" data-cat="${cat.id}">${categoryLabel(cat)}</button>`
      )
    );
  filtersEl.innerHTML = buttons.join("");

  filtersEl.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategoryId = btn.getAttribute("data-cat");
      visibleCount = PAGE_SIZE;
      renderFilters();
      renderProviders();
    });
  });
}

function renderProviders() {
  const listEl = document.getElementById("provider-list");
  const suggestionEl = document.getElementById("search-suggestion");
  suggestionEl.innerHTML = "";

  const byCategory =
    activeCategoryId === "all"
      ? allProviders
      : allProviders.filter((p) => p.category_id === activeCategoryId);

  const query = searchQuery.trim().toLowerCase();
  const filtered = byCategory.filter((p) => matchesSearch(p, query));

  if (filtered.length === 0) {
    listEl.innerHTML = `<p>${t("no_providers")}</p>`;

    if (query) {
      const suggestion = closestSearchSuggestion(byCategory, query);
      if (suggestion) {
        suggestionEl.innerHTML = `${t("search_did_you_mean")} <button type="button" id="suggestion-btn">${suggestion}</button>`;
        document.getElementById("suggestion-btn").addEventListener("click", () => {
          document.getElementById("search-input").value = suggestion;
          searchQuery = suggestion;
          renderProviders();
        });
      }
    }
    return;
  }

  const visible = filtered.slice(0, visibleCount);

  listEl.innerHTML = visible
    .map((p) => {
      const count = bookingCounts[p.id] || 0;
      const locked = isProviderLocked(p);
      return `
      <a class="provider-card ${locked ? "provider-card-locked" : ""}" href="provider.html?id=${p.id}">
        ${!locked && p.featured ? `<span class="featured-badge">${STAR_ICON} ${t("featured_badge")}</span>` : ""}
        <div class="provider-card-header">
          ${
            p.image_url
              ? `<img class="provider-avatar-sm" src="${p.image_url}" alt="" loading="lazy" />`
              : `<div class="provider-avatar-sm provider-avatar-placeholder">${providerInitial(p)}</div>`
          }
          <div>
            <span class="provider-category">${categoryLabel(p.category)}</span>
            <h3>${providerName(p)}</h3>
          </div>
        </div>
        ${
          locked
            ? `<span class="provider-locked-badge">${t("provider_unavailable")}</span>`
            : `
              <p class="provider-address">${p.address || ""}</p>
              ${count >= MIN_BOOKINGS_TO_SHOW ? `<p class="booking-count">${PEOPLE_ICON} ${t("booking_count_label").replace("{count}", formatTime(String(count)))}</p>` : ""}
              <span class="book-btn">${t("provider_book_button")}</span>
            `
        }
      </a>`;
    })
    .join("");

  const loadMoreEl = document.getElementById("load-more-container");
  loadMoreEl.innerHTML = "";
  if (filtered.length > visible.length) {
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "load-more-btn";
    moreBtn.textContent = t("load_more");
    moreBtn.addEventListener("click", () => {
      visibleCount += PAGE_SIZE;
      renderProviders();
    });
    loadMoreEl.appendChild(moreBtn);
  }
}

document.getElementById("search-input").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  visibleCount = PAGE_SIZE;
  renderProviders();
});

function onLangChange() {
  renderFilters();
  renderProviders();
}

document.addEventListener("DOMContentLoaded", loadProviders);
