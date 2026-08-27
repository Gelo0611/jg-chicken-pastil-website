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

  let token = sessionStorage.getItem("jg-owner-access-token") || "";
  let locations = [];

  const base = () => cfg.supabaseUrl.replace(/\/+$/, "");

  function setStatus(element, message, type = "") {
    if (!element) return;
    element.textContent = message;
    element.className = `owner-status ${type}`.trim();
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
  }

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
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }

    if (!response.ok) {
      throw new Error(
        body?.msg ||
        body?.message ||
        body?.error_description ||
        body?.hint ||
        `Request failed (${response.status})`
      );
    }

    return body;
  }

  async function signIn(email, password) {
    const result = await request(
      "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        body: JSON.stringify({ email, password })
      },
      false
    );

    if (!result?.access_token) throw new Error("No access token returned.");

    token = result.access_token;
    sessionStorage.setItem("jg-owner-access-token", token);
  }

  function resetForm() {
    [
      "locationId",
      "locationName",
      "locationArea",
      "locationAddress",
      "locationLatitude",
      "locationLongitude",
      "locationMapsUrl"
    ].forEach((id) => {
      $("#" + id).value = "";
    });

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
    setStatus(status, "");

    window.scrollTo({
      top: Math.max(0, form.getBoundingClientRect().top + window.scrollY - 30),
      behavior: "smooth"
    });
  }

  function renderLocations() {
    list.innerHTML = "";

    if (!locations.length) {
      list.innerHTML = '<div class="owner-empty">No locations saved yet.</div>';
      current.textContent = "No active location";
      return;
    }

    const active = locations.find((location) => location.is_active);
    current.textContent = active
      ? `${active.name} — ${active.address}`
      : "No active location selected";

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
    setStatus(status, "Loading locations…");

    locations =
      (await request(
        "/rest/v1/business_locations?select=*&order=sort_order.asc",
        { method: "GET" }
      )) || [];

    renderLocations();
    setStatus(status, "");
  }

  async function setCurrentLocation(id) {
    try {
      setStatus(status, "Updating current location…");

      await request(
        "/rest/v1/business_locations?is_active=eq.true",
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ is_active: false })
        }
      );

      await request(
        `/rest/v1/business_locations?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            is_active: true,
            updated_at: new Date().toISOString()
          })
        }
      );

      await loadLocations();
      setStatus(
        status,
        "Current BikeCart location updated. Customers will see it after refresh.",
        "success"
      );
    } catch (error) {
      setStatus(status, error.message, "error");
    }
  }

  async function saveLocation(event) {
    event.preventDefault();

    const id = $("#locationId").value.trim();
    const payload = {
      name: $("#locationName").value.trim(),
      area: $("#locationArea").value.trim(),
      address: $("#locationAddress").value.trim(),
      latitude: Number($("#locationLatitude").value),
      longitude: Number($("#locationLongitude").value),
      google_maps_url: $("#locationMapsUrl").value.trim() || null,
      updated_at: new Date().toISOString()
    };

    if (
      !payload.name ||
      !payload.area ||
      !payload.address ||
      !Number.isFinite(payload.latitude) ||
      !Number.isFinite(payload.longitude)
    ) {
      setStatus(status, "Please complete valid location details.", "error");
      return;
    }

    try {
      setStatus(status, "Saving location…");

      if (id) {
        await request(
          `/rest/v1/business_locations?id=eq.${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify(payload)
          }
        );
      } else {
        await request(
          "/rest/v1/business_locations",
          {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              ...payload,
              is_active: locations.length === 0,
              sort_order: locations.length
            })
          }
        );
      }

      resetForm();
      await loadLocations();
      setStatus(status, "Location saved successfully.", "success");
    } catch (error) {
      setStatus(status, error.message, "error");
    }
  }

  async function deleteLocation(location) {
    if (!window.confirm(`Delete "${location.name}"?`)) return;

    try {
      await request(
        `/rest/v1/business_locations?id=eq.${encodeURIComponent(location.id)}`,
        {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        }
      );

      await loadLocations();
      setStatus(status, "Location deleted.", "success");
    } catch (error) {
      setStatus(status, error.message, "error");
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!configured) {
      setStatus(
        loginStatus,
        "Complete the one-time Supabase setup first.",
        "error"
      );
      return;
    }

    try {
      setStatus(loginStatus, "Signing in…");
      await signIn($("#ownerEmail").value.trim(), $("#ownerPassword").value);
      showDashboard();
      await loadLocations();
      setStatus(loginStatus, "");
    } catch (error) {
      token = "";
      sessionStorage.removeItem("jg-owner-access-token");
      showLogin();
      setStatus(loginStatus, error.message, "error");
    }
  });

  form.addEventListener("submit", saveLocation);
  newBtn.addEventListener("click", resetForm);
  cancel.addEventListener("click", resetForm);

  logout.addEventListener("click", () => {
    token = "";
    sessionStorage.removeItem("jg-owner-access-token");
    resetForm();
    showLogin();
    setStatus(loginStatus, "Signed out.", "success");
  });

  (async () => {
    if (!configured) {
      showLogin();
      setStatus(
        loginStatus,
        "One-time setup required: configure location-config.js.",
        "error"
      );
      return;
    }

    if (!token) {
      showLogin();
      return;
    }

    try {
      showDashboard();
      await loadLocations();
    } catch {
      token = "";
      sessionStorage.removeItem("jg-owner-access-token");
      showLogin();
      setStatus(loginStatus, "Your session expired. Please sign in again.");
    }
  })();
})();
