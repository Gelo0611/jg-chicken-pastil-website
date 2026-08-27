(() => {
  "use strict";

  const cfg = window.JG_LOCATION_CONFIG || {};
  const configured =
    typeof cfg.supabaseUrl === "string" &&
    typeof cfg.supabasePublishableKey === "string" &&
    cfg.supabaseUrl.startsWith("https://") &&
    !cfg.supabaseUrl.includes("YOUR_SUPABASE") &&
    !cfg.supabasePublishableKey.includes("YOUR_SUPABASE");

  const $ = (selector) => document.querySelector(selector);
  const loginPanel = $("#loginPanel");
  const dashboard = $("#dashboardPanel");
  const loginForm = $("#ownerLoginForm");
  const loginStatus = $("#loginStatus");
  const logout = $("#logoutButton");

  const list = $("#ownerLocationList");
  const current = $("#ownerCurrentLocation");
  const form = $("#locationForm");
  const formTitle = $("#locationFormTitle");
  const status = $("#adminStatus");
  const newBtn = $("#newLocationButton");
  const cancel = $("#cancelEditButton");

  const ownerProductList = $("#ownerProductList");
  const availabilityStatus = $("#availabilityStatus");
  const announcementForm = $("#announcementForm");
  const announcementInput = $("#announcementInput");
  const announcementPreview = $("#announcementPreview");
  const announcementStatus = $("#announcementStatus");

  const reviewForm = $("#reviewForm");
  const reviewId = $("#reviewId");
  const reviewName = $("#reviewName");
  const reviewRating = $("#reviewRating");
  const reviewText = $("#reviewText");
  const reviewPublished = $("#reviewPublished");
  const saveReviewButton = $("#saveReviewButton");
  const cancelReviewEditButton = $("#cancelReviewEditButton");
  const ownerReviewList = $("#ownerReviewList");
  const reviewStatus = $("#reviewStatus");

  let token = sessionStorage.getItem("jg-owner-access-token") || "";
  let locations = [];
  let products = [];
  let reviews = [];

  const base = () => cfg.supabaseUrl.replace(/\/+$/, "");

  function setStatus(element, message, type = "") {
    if (!element) return;
    element.textContent = message;
    element.className = `owner-status ${type}`.trim();
  }

  function showLogin() { loginPanel.hidden = false; dashboard.hidden = true; }
  function showDashboard() { loginPanel.hidden = true; dashboard.hidden = false; }

  async function request(path, options = {}, authenticated = true) {
    if (!configured) throw new Error("Supabase is not configured yet.");
    const headers = {
      apikey: cfg.supabasePublishableKey,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (authenticated) {
      if (!token) throw new Error("Please sign in again.");
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(base() + path, { ...options, headers });
    const raw = await response.text();
    let body = null;
    if (raw) {
      try { body = JSON.parse(raw); } catch { body = raw; }
    }
    if (!response.ok) {
      throw new Error(body?.msg || body?.message || body?.error_description || body?.hint || `Request failed (${response.status})`);
    }
    return body;
  }

  async function signIn(email, password) {
    const result = await request(
      "/auth/v1/token?grant_type=password",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false
    );
    if (!result?.access_token) throw new Error("No access token returned.");
    token = result.access_token;
    sessionStorage.setItem("jg-owner-access-token", token);
  }

  // LOCATIONS
  function resetLocationForm() {
    ["locationId","locationName","locationArea","locationAddress","locationLatitude","locationLongitude","locationMapsUrl"]
      .forEach((id) => { $("#" + id).value = ""; });
    formTitle.textContent = "Add a location";
    setStatus(status, "");
  }

  function editLocation(location) {
    $("#locationId").value = location.id;
    $("#locationName").value = location.name || "";
    $("#locationArea").value = location.area || "";
    $("#locationAddress").value = location.address || "";
    $("#locationLatitude").value = location.latitude ?? "";
    $("#locationLongitude").value = location.longitude ?? "";
    $("#locationMapsUrl").value = location.google_maps_url || "";
    formTitle.textContent = "Edit location";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLocations() {
    list.innerHTML = "";
    if (!locations.length) {
      list.innerHTML = '<div class="owner-empty">No locations saved yet.</div>';
      current.textContent = "No active location";
      return;
    }
    const active = locations.find((location) => location.is_active);
    current.textContent = active ? `${active.name} — ${active.address}` : "No active location selected";

    locations.forEach((location) => {
      const card = document.createElement("article");
      card.className = `owner-location-item${location.is_active ? " active" : ""}`;
      const info = document.createElement("div");
      info.className = "owner-location-info";
      const top = document.createElement("div");
      top.className = "owner-location-item-top";
      const name = document.createElement("strong");
      name.textContent = location.name;
      top.append(name);
      if (location.is_active) {
        const badge = document.createElement("span");
        badge.className = "owner-active-badge";
        badge.textContent = "CURRENT";
        top.append(badge);
      }
      const address = document.createElement("p");
      address.textContent = location.address;
      info.append(top, address);

      const actions = document.createElement("div");
      actions.className = "owner-location-actions";
      if (!location.is_active) {
        const activate = document.createElement("button");
        activate.className = "btn btn-gold owner-small-btn";
        activate.type = "button";
        activate.textContent = "Set as Current";
        activate.addEventListener("click", () => setCurrentLocation(location.id));
        actions.append(activate);
      }
      const edit = document.createElement("button");
      edit.className = "btn owner-outline-btn owner-small-btn";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editLocation(location));
      actions.append(edit);
      if (!location.is_active) {
        const remove = document.createElement("button");
        remove.className = "owner-delete-button";
        remove.type = "button";
        remove.textContent = "Delete";
        remove.addEventListener("click", () => deleteLocation(location));
        actions.append(remove);
      }
      card.append(info, actions);
      list.append(card);
    });
  }

  async function loadLocations() {
    locations = (await request("/rest/v1/business_locations?select=*&order=sort_order.asc", { method: "GET" })) || [];
    renderLocations();
  }

  async function setCurrentLocation(id) {
    try {
      setStatus(status, "Updating current location…");
      await request("/rest/v1/business_locations?is_active=eq.true", {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: false })
      });
      await request(`/rest/v1/business_locations?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ is_active: true, updated_at: new Date().toISOString() })
      });
      await loadLocations();
      setStatus(status, "Current BikeCart location updated.", "success");
    } catch (error) { setStatus(status, error.message, "error"); }
  }

  async function saveLocation(event) {
    event.preventDefault();
    const id = $("#locationId").value.trim();
    const payload = {
      name: $("#locationName").value.trim(), area: $("#locationArea").value.trim(),
      address: $("#locationAddress").value.trim(), latitude: Number($("#locationLatitude").value),
      longitude: Number($("#locationLongitude").value), google_maps_url: $("#locationMapsUrl").value.trim() || null,
      updated_at: new Date().toISOString()
    };
    if (!payload.name || !payload.area || !payload.address || !Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setStatus(status, "Please complete valid location details.", "error"); return;
    }
    try {
      setStatus(status, "Saving location…");
      if (id) {
        await request(`/rest/v1/business_locations?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload)
        });
      } else {
        await request("/rest/v1/business_locations", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ ...payload, is_active: locations.length === 0, sort_order: locations.length })
        });
      }
      resetLocationForm(); await loadLocations(); setStatus(status, "Location saved successfully.", "success");
    } catch (error) { setStatus(status, error.message, "error"); }
  }

  async function deleteLocation(location) {
    if (!window.confirm(`Delete "${location.name}"?`)) return;
    try {
      await request(`/rest/v1/business_locations?id=eq.${encodeURIComponent(location.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      await loadLocations(); setStatus(status, "Location deleted.", "success");
    } catch (error) { setStatus(status, error.message, "error"); }
  }

  // PRODUCT AVAILABILITY
  function renderProducts() {
    ownerProductList.innerHTML = "";
    if (!products.length) {
      ownerProductList.innerHTML = '<div class="owner-empty">No product data yet. Run the V6 Supabase upgrade SQL first.</div>';
      return;
    }
    products.forEach((product) => {
      const row = document.createElement("article");
      row.className = `owner-product-row${product.is_available ? "" : " unavailable"}`;
      const copy = document.createElement("div"); copy.className = "owner-product-copy";
      const name = document.createElement("strong"); name.textContent = product.product_name;
      const state = document.createElement("span"); state.textContent = product.is_available ? "Available to order" : "Sold out";
      copy.append(name, state);
      const label = document.createElement("label"); label.className = "owner-switch";
      const input = document.createElement("input"); input.type = "checkbox"; input.checked = product.is_available;
      input.setAttribute("aria-label", `${product.product_name} availability`);
      const slider = document.createElement("span"); slider.className = "owner-switch-slider";
      input.addEventListener("change", async () => {
        input.disabled = true;
        try { await updateProductAvailability(product.product_id, input.checked); } finally { input.disabled = false; }
      });
      label.append(input, slider); row.append(copy, label); ownerProductList.append(row);
    });
  }

  async function loadProducts() {
    products = (await request("/rest/v1/product_availability?select=*&order=sort_order.asc", { method: "GET" })) || [];
    renderProducts();
  }

  async function updateProductAvailability(productId, available) {
    try {
      setStatus(availabilityStatus, "Updating menu availability…");
      await request(`/rest/v1/product_availability?product_id=eq.${encodeURIComponent(productId)}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ is_available: available, updated_at: new Date().toISOString() })
      });
      await loadProducts();
      setStatus(availabilityStatus, available ? "Item marked available." : "Item marked sold out.", "success");
    } catch (error) { setStatus(availabilityStatus, error.message, "error"); await loadProducts(); }
  }

  // ANNOUNCEMENT
  async function loadAnnouncement() {
    const rows = (await request("/rest/v1/site_settings?select=setting_key,setting_value&setting_key=eq.announcement", { method: "GET" })) || [];
    const value = rows[0]?.setting_value || "🔥 Freshly served Chicken Pastil";
    announcementInput.value = value; announcementPreview.textContent = value;
  }

  async function saveAnnouncement(event) {
    event.preventDefault();
    const value = announcementInput.value.trim();
    if (!value) { setStatus(announcementStatus, "Announcement cannot be empty.", "error"); return; }
    try {
      setStatus(announcementStatus, "Updating announcement…");
      await request("/rest/v1/site_settings?setting_key=eq.announcement", {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ setting_value: value, updated_at: new Date().toISOString() })
      });
      announcementPreview.textContent = value; setStatus(announcementStatus, "Website announcement updated.", "success");
    } catch (error) { setStatus(announcementStatus, error.message, "error"); }
  }

  // REVIEWS
  function resetReviewForm() {
    reviewId.value = ""; reviewName.value = ""; reviewRating.value = "5"; reviewText.value = "";
    reviewPublished.checked = true; saveReviewButton.textContent = "Add Review"; setStatus(reviewStatus, "");
  }

  function editReview(review) {
    reviewId.value = review.id; reviewName.value = review.name; reviewRating.value = String(review.rating);
    reviewText.value = review.review_text; reviewPublished.checked = review.is_published; saveReviewButton.textContent = "Save Changes";
    reviewForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderReviews() {
    ownerReviewList.innerHTML = "";
    if (!reviews.length) { ownerReviewList.innerHTML = '<div class="owner-empty">No reviews saved yet.</div>'; return; }
    reviews.forEach((review) => {
      const card = document.createElement("article"); card.className = "owner-review-item";
      const top = document.createElement("div"); top.className = "owner-review-top";
      const identity = document.createElement("div");
      const name = document.createElement("strong"); name.textContent = review.name;
      const stars = document.createElement("span"); stars.className = "owner-review-stars";
      stars.textContent = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
      identity.append(name, stars);
      const badge = document.createElement("span"); badge.className = `owner-review-state${review.is_published ? " published" : ""}`;
      badge.textContent = review.is_published ? "PUBLISHED" : "HIDDEN"; top.append(identity, badge);
      const quote = document.createElement("p"); quote.textContent = review.review_text;
      const actions = document.createElement("div"); actions.className = "owner-review-actions";
      const edit = document.createElement("button"); edit.className = "owner-link-button"; edit.type = "button"; edit.textContent = "Edit"; edit.addEventListener("click", () => editReview(review));
      const remove = document.createElement("button"); remove.className = "owner-link-button danger"; remove.type = "button"; remove.textContent = "Delete"; remove.addEventListener("click", () => deleteReview(review));
      actions.append(edit, remove); card.append(top, quote, actions); ownerReviewList.append(card);
    });
  }

  async function loadReviews() {
    reviews = (await request("/rest/v1/customer_reviews?select=*&order=created_at.desc", { method: "GET" })) || [];
    renderReviews();
  }

  async function saveReview(event) {
    event.preventDefault();
    const id = reviewId.value.trim();
    const payload = { name: reviewName.value.trim(), rating: Number(reviewRating.value), review_text: reviewText.value.trim(), is_published: reviewPublished.checked };
    if (!payload.name || !payload.review_text || payload.rating < 1 || payload.rating > 5) { setStatus(reviewStatus, "Please complete valid review details.", "error"); return; }
    try {
      setStatus(reviewStatus, id ? "Saving review…" : "Adding review…");
      if (id) {
        await request(`/rest/v1/customer_reviews?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      } else {
        await request("/rest/v1/customer_reviews", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      }
      resetReviewForm(); await loadReviews(); setStatus(reviewStatus, id ? "Review updated." : "Review added.", "success");
    } catch (error) { setStatus(reviewStatus, error.message, "error"); }
  }

  async function deleteReview(review) {
    if (!window.confirm(`Delete review from "${review.name}"?`)) return;
    try {
      await request(`/rest/v1/customer_reviews?id=eq.${encodeURIComponent(review.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      await loadReviews(); setStatus(reviewStatus, "Review deleted.", "success");
    } catch (error) { setStatus(reviewStatus, error.message, "error"); }
  }

  async function loadDashboardData() {
    setStatus(status, "Loading dashboard…");
    try {
      await Promise.all([loadLocations(), loadProducts(), loadAnnouncement(), loadReviews()]);
      setStatus(status, "");
    } catch (error) { setStatus(status, error.message, "error"); throw error; }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!configured) { setStatus(loginStatus, "Complete the Supabase setup first.", "error"); return; }
    try {
      setStatus(loginStatus, "Signing in…");
      await signIn($("#ownerEmail").value.trim(), $("#ownerPassword").value);
      showDashboard(); await loadDashboardData(); setStatus(loginStatus, "");
    } catch (error) {
      token = ""; sessionStorage.removeItem("jg-owner-access-token"); showLogin(); setStatus(loginStatus, error.message, "error");
    }
  });

  form.addEventListener("submit", saveLocation);
  newBtn.addEventListener("click", resetLocationForm);
  cancel.addEventListener("click", resetLocationForm);
  announcementForm.addEventListener("submit", saveAnnouncement);
  announcementInput.addEventListener("input", () => { announcementPreview.textContent = announcementInput.value.trim() || "Your announcement preview"; });
  reviewForm.addEventListener("submit", saveReview);
  cancelReviewEditButton.addEventListener("click", resetReviewForm);

  logout.addEventListener("click", () => {
    token = ""; sessionStorage.removeItem("jg-owner-access-token"); resetLocationForm(); resetReviewForm(); showLogin(); setStatus(loginStatus, "Signed out.", "success");
  });

  (async () => {
    if (!configured) { showLogin(); setStatus(loginStatus, "One-time setup required: configure location-config.js.", "error"); return; }
    if (!token) { showLogin(); return; }
    try { showDashboard(); await loadDashboardData(); }
    catch { token = ""; sessionStorage.removeItem("jg-owner-access-token"); showLogin(); setStatus(loginStatus, "Your session expired or the V6 database upgrade is not installed yet."); }
  })();
})();
