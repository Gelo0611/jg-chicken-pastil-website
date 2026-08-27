(() => {
  "use strict";

  const cfg = window.JG_LOCATION_CONFIG || {};
  const configured =
    typeof cfg.supabaseUrl === "string" &&
    typeof cfg.supabasePublishableKey === "string" &&
    cfg.supabaseUrl.startsWith("https://") &&
    !cfg.supabaseUrl.includes("YOUR_SUPABASE") &&
    !cfg.supabasePublishableKey.includes("YOUR_SUPABASE");

  const fallback = {
    name: "Pio Val, Marulas",
    area: "Valenzuela City, Metro Manila",
    address: "Pio Val, Marulas, Valenzuela City",
    latitude: 14.675873,
    longitude: 120.9842109,
    google_maps_url: "https://www.google.com/maps?q=14.675873,120.9842109"
  };

  const el = (id) => document.getElementById(id);
  const num = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  function mapsUrl(location) {
    if (location.google_maps_url && /^https?:\/\//i.test(location.google_maps_url)) {
      return location.google_maps_url;
    }

    const lat = num(location.latitude);
    const lng = num(location.longitude);

    return lat !== null && lng !== null
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : "#contact";
  }

  function embedUrl(location) {
    const lat = num(location.latitude);
    const lng = num(location.longitude);

    if (lat !== null && lng !== null) {
      return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=17&output=embed`;
    }

    const query = location.address || location.name || "Marulas, Valenzuela City";
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
  }

  function apply(location) {
    const data = { ...fallback, ...location };

    if (el("announcementLocation")) {
      el("announcementLocation").textContent = `Today's BikeCart Location: ${data.name}`;
    }
    if (el("currentLocationName")) el("currentLocationName").textContent = data.name;
    if (el("currentLocationAddress")) el("currentLocationAddress").textContent = data.address;
    if (el("contactLocationText")) el("contactLocationText").textContent = data.address;
    if (el("locationCardTitle")) el("locationCardTitle").textContent = data.name;
    if (el("locationCardSubtitle")) el("locationCardSubtitle").textContent = data.area || data.address;

    if (el("locationMapFrame")) {
      el("locationMapFrame").src = embedUrl(data);
      el("locationMapFrame").title = `J&G Chicken Pastil current location — ${data.name}`;
    }

    if (el("mapsLink")) el("mapsLink").href = mapsUrl(data);
  }

  async function load() {
    if (!configured) {
      apply(fallback);
      return;
    }

    const base = cfg.supabaseUrl.replace(/\/+$/, "");
    const url =
      `${base}/rest/v1/business_locations` +
      `?select=id,name,area,address,latitude,longitude,google_maps_url,is_active` +
      `&is_active=eq.true&order=sort_order.asc&limit=1`;

    try {
      const response = await fetch(url, {
        headers: {
          apikey: cfg.supabasePublishableKey,
          Accept: "application/json"
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rows = await response.json();
      apply(rows[0] || fallback);
    } catch (error) {
      console.warn("Location service unavailable; using fallback.", error);
      apply(fallback);
    }
  }

  load();
})();
