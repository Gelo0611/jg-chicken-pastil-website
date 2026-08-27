// ======================================================
// J&G CHICKEN PASTIL — BUSINESS SETTINGS
// Update only this section when your details change.
// ======================================================
const BUSINESS = {
  facebookUrl: "https://www.facebook.com/profile.php?id=61576281657176",
  messengerUrl: "https://m.me/61576281657176",
  phoneNumber: "0963-032-6793",
  googleMapsUrl: "https://www.google.com/maps/place/JM+Ocasla+Hardware/@14.6758408,120.9817245,17z/data=!4m14!1m7!3m6!1s0x3397b41e67c2800f:0x5ae643476f6fa9fb!2sJM+Ocasla+Hardware!8m2!3d14.675873!4d120.9842109!16s%2Fg%2F1hc77jysv!3m5!1s0x3397b41e67c2800f:0x5ae643476f6fa9fb!8m2!3d14.675873!4d120.9842109!16s%2Fg%2F1hc77jysv?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D",

  // IMPORTANT:
  // Do not guess your business hours. Replace null with a range only
  // after you confirm the actual schedule.
  //
  // Example:
  // monday: "15:00-23:00"
  //
  // Use "closed" if you are closed for the whole day.
  hours: {
    sunday: "15:00-23:00",
    monday: "15:00-23:00",
    tuesday: "15:00-23:00",
    wednesday: "15:00-23:00",
    thursday: "closed",
    friday: "15:00-23:00",
    saturday: "15:00-23:00"
  }
};

// Add REAL customer reviews here when you have permission to publish them.
// Example:
// {
//   name: "Customer Name",
//   rating: 5,
//   text: "Masarap at sulit ang serving!"
// }
let REVIEWS = [
  {
   name: "Jernz Torregosa",
   rating: 5,
   text: "Yummy"
  },
  {
   name: "Melanie M. Canas III",
   rating: 5,
   text: "Yummy 😋"
  }
];

// ======================================================
// SMALL HELPERS
// ======================================================
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const SUPABASE_CONFIG = window.JG_LOCATION_CONFIG || {};
const SUPABASE_PUBLIC_READY =
  typeof SUPABASE_CONFIG.supabaseUrl === "string" &&
  typeof SUPABASE_CONFIG.supabasePublishableKey === "string" &&
  SUPABASE_CONFIG.supabaseUrl.startsWith("https://") &&
  !SUPABASE_CONFIG.supabaseUrl.includes("YOUR_SUPABASE") &&
  !SUPABASE_CONFIG.supabasePublishableKey.includes("YOUR_SUPABASE");

async function publicSupabaseRequest(path) {
  if (!SUPABASE_PUBLIC_READY) return null;
  const base = SUPABASE_CONFIG.supabaseUrl.replace(/\/+$/, "");
  const response = await fetch(base + path, {
    headers: { apikey: SUPABASE_CONFIG.supabasePublishableKey, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return response.json();
}

function clampNumber(value, min, max, fallback = min) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Continue to fallback below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (_) {
    copied = false;
  }

  textarea.remove();
  return copied;
}

// ======================================================
// BUSINESS LINKS
// ======================================================
const facebookLink = $("#facebookLink");
const messengerLink = $("#messengerLink");
const phoneLink = $("#phoneLink");
const contactNumberText = $("#contactNumberText");
const mapsLink = $("#mapsLink");
const floatingMessenger = $("#floatingMessenger");
const footerFacebookLink = $("#footerFacebookLink");
const footerMessengerLink = $("#footerMessengerLink");
const jarMessengerLink = $("#jarMessengerLink");
const reviewsFacebookLink = $("#reviewsFacebookLink");
const reviewsMessengerLink = $("#reviewsMessengerLink");

[
  facebookLink,
  footerFacebookLink,
  reviewsFacebookLink
].filter(Boolean).forEach((link) => {
  link.href = BUSINESS.facebookUrl;
});

[
  messengerLink,
  floatingMessenger,
  footerMessengerLink,
  jarMessengerLink,
  reviewsMessengerLink
].filter(Boolean).forEach((link) => {
  link.href = BUSINESS.messengerUrl;
});

if (mapsLink) mapsLink.href = BUSINESS.googleMapsUrl;

if (BUSINESS.phoneNumber.trim()) {
  const cleanedPhone = BUSINESS.phoneNumber.replace(/[^+\d]/g, "");

  if (phoneLink) phoneLink.href = `tel:${cleanedPhone}`;
  if (contactNumberText) contactNumberText.textContent = BUSINESS.phoneNumber;
} else if (phoneLink) {
  phoneLink.href = "#contact";
  phoneLink.addEventListener("click", (event) => {
    event.preventDefault();
    showToast("Add your business phone number in script.js first.");
  });
}

// ======================================================
// CURRENT YEAR
// ======================================================
const year = $("#year");
if (year) year.textContent = new Date().getFullYear();

// ======================================================
// IMAGE FIT / FALLBACK HANDLING
// ======================================================
$$(".image-shell img").forEach((img) => {
  const shell = img.closest(".image-shell");
  if (!shell) return;

  const markLoaded = () => {
    shell.classList.remove("image-error");
    shell.classList.add("image-loaded");
  };

  const markError = () => {
    shell.classList.remove("image-loaded");
    shell.classList.add("image-error");
  };

  if (img.complete) {
    if (img.naturalWidth > 0) markLoaded();
    else markError();
  } else {
    img.addEventListener("load", markLoaded, { once: true });
    img.addEventListener("error", markError, { once: true });
  }
});

// Dedicated menu photos:
// if the new menu image does not exist yet, use an existing project image.
$$(".menu-photo img").forEach((img) => {
  const photo = img.closest(".menu-photo");
  if (!photo) return;

  const markLoaded = () => {
    photo.classList.remove("image-error");
  };

  const tryFallback = () => {
    const fallback = img.dataset.fallback;

    if (fallback && img.dataset.fallbackTried !== "true") {
      img.dataset.fallbackTried = "true";
      img.src = fallback;
      return;
    }

    photo.classList.add("image-error");
  };

  if (img.complete) {
    if (img.naturalWidth > 0) markLoaded();
    else tryFallback();
  }

  img.addEventListener("load", markLoaded);
  img.addEventListener("error", tryFallback);
});

// ======================================================
// MOBILE NAVIGATION
// ======================================================
const menuToggle = $("#menuToggle");
const navLinks = $("#navLinks");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  $$("a, button", navLinks).forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    if (!navLinks.classList.contains("open")) return;
    if (navLinks.contains(event.target) || menuToggle.contains(event.target)) return;

    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
}

// ======================================================
// ACTIVE NAVIGATION / SCROLLSPY
// ======================================================
const sectionNavLinks = $$(".nav-link[data-section]");
const trackedSections = sectionNavLinks
  .map((link) => document.getElementById(link.dataset.section))
  .filter(Boolean);

const siteHeader = $(".site-header");

function setActiveSection(sectionId) {
  sectionNavLinks.forEach((link) => {
    const isActive = link.dataset.section === sectionId;
    link.classList.toggle("active", isActive);

    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function updateActiveSection() {
  if (!trackedSections.length) return;

  const headerHeight = siteHeader ? siteHeader.offsetHeight : 0;
  const marker = window.scrollY + headerHeight + 150;
  let currentSection = trackedSections[0].id;

  trackedSections.forEach((section) => {
    if (section.offsetTop <= marker) currentSection = section.id;
  });

  const nearBottom =
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - 120;

  if (nearBottom && document.getElementById("contact")) {
    currentSection = "contact";
  }

  setActiveSection(currentSection);
}

sectionNavLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setActiveSection(link.dataset.section);
  });
});

let scrollTicking = false;

window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;

    scrollTicking = true;
    window.requestAnimationFrame(() => {
      updateActiveSection();
      scrollTicking = false;
    });
  },
  { passive: true }
);

window.addEventListener("resize", updateActiveSection);
window.addEventListener("load", updateActiveSection);
updateActiveSection();

// ======================================================
// MODAL HELPERS
// ======================================================
let lastFocusedElement = null;

function openModal(modal) {
  if (!modal) return;

  lastFocusedElement = document.activeElement;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const firstFocusable = $("button, a, input, textarea, select", modal);
  if (firstFocusable) {
    window.requestAnimationFrame(() => firstFocusable.focus());
  }
}

function closeModal(modal) {
  if (!modal) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");

  if (!$(".modal.active")) {
    document.body.classList.remove("modal-open");
  }

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

// ======================================================
// MENU DETAILS MODAL
// ======================================================
const menuModal = $("#menuModal");
const modalTitle = $("#modalTitle");
const modalPrice = $("#modalPrice");
const modalDesc = $("#modalDesc");
const modalOrderButton = $("#modalOrderButton");

let currentDetailProductId = "chicken-pastil";

$$('.open-menu-modal').forEach((button) => {
  button.addEventListener('click', () => {
    currentDetailProductId = button.dataset.productId || "chicken-pastil";

    if (modalTitle) modalTitle.textContent = button.dataset.name || "Menu Item";
    if (modalPrice) modalPrice.textContent = button.dataset.price || "";
    if (modalDesc) modalDesc.textContent = button.dataset.desc || "";

    if (modalOrderButton) {
      const available = isProductAvailable(currentDetailProductId);
      modalOrderButton.disabled = !available;
      modalOrderButton.textContent = available ? "Add to Cart" : "Sold Out";
    }

    openModal(menuModal);
  });
});

$$('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', () => closeModal(menuModal));
});

// ======================================================
// MULTI-ITEM ORDER CART
// ======================================================
const PRODUCTS = [
  { id: "chicken-pastil", name: "Chicken Pastil", price: 35, category: "Meals" },
  { id: "value-meal", name: "Value Meal", price: 45, category: "Meals" },
  { id: "busog-meal", name: "Busog Meal", price: 50, category: "Meals" },
  { id: "premium-meal", name: "Premium Meal", price: 60, category: "Meals" },
  { id: "extra-busog", name: "Extra Busog", price: 50, category: "Meals" },
  { id: "tusok-tusok", name: "Tusok-Tusok", price: 20, category: "Meals" },
  { id: "extra-rice", name: "Extra Rice", price: 15, category: "Add-ons" },
  { id: "boiled-egg", name: "Boiled Egg", price: 15, category: "Add-ons" },
  { id: "gulaman", name: "Gulaman", price: 10, category: "Add-ons" },
  { id: "pastil-jar", name: "Chicken Pastil in a Jar", price: 195, category: "Take Home" }
];

const productMap = new Map(PRODUCTS.map((product) => [product.id, product]));
const PRODUCT_AVAILABILITY = new Map(PRODUCTS.map((product) => [product.id, true]));
const CART_STORAGE_KEY = "jg-chicken-pastil-cart-v1";

function isProductAvailable(productId) {
  return PRODUCT_AVAILABILITY.get(productId) !== false;
}

const orderModal = $("#orderModal");
const orderCatalog = $("#orderCatalog");
const cartItems = $("#cartItems");
const cartEmpty = $("#cartEmpty");
const cartTotal = $("#cartTotal");
const cartItemCount = $("#cartItemCount");
const headerCartButton = $("#headerCartButton");
const headerCartCount = $("#headerCartCount");
const clearCartButton = $("#clearCartButton");
const orderNotes = $("#orderNotes");
const orderMessagePreview = $("#orderMessagePreview");
const copyOrderButton = $("#copyOrderButton");
const openMessengerOrderButton = $("#openMessengerOrderButton");

let cart = {};

function formatPeso(value) {
  return `₱${Number(value).toLocaleString("en-PH")}`;
}

function loadCart() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};

    const cleanCart = {};
    Object.entries(saved).forEach(([id, quantity]) => {
      if (!productMap.has(id)) return;
      const safeQuantity = clampNumber(quantity, 0, 99, 0);
      if (safeQuantity > 0) cleanCart[id] = safeQuantity;
    });

    return cleanCart;
  } catch (_) {
    return {};
  }
}

function saveCart() {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (_) {
    // Cart still works for the current page if storage is blocked.
  }
}

function getCartCount() {
  return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
}

function getCartTotal() {
  return Object.entries(cart).reduce((sum, [id, quantity]) => {
    const product = productMap.get(id);
    return product ? sum + product.price * quantity : sum;
  }, 0);
}

function getCartEntries() {
  return PRODUCTS
    .map((product) => ({ ...product, quantity: cart[product.id] || 0 }))
    .filter((product) => product.quantity > 0);
}

function updateCartCountBadges() {
  const count = getCartCount();

  if (cartItemCount) cartItemCount.textContent = String(count);

  if (headerCartCount) {
    headerCartCount.textContent = String(count);
    headerCartCount.classList.toggle("has-items", count > 0);
  }

  if (headerCartButton) {
    headerCartButton.setAttribute(
      "aria-label",
      `Open shopping cart, ${count} item${count === 1 ? "" : "s"}`
    );
    headerCartButton.classList.toggle("has-items", count > 0);
  }
}

function setCartQuantity(productId, quantity) {
  if (!productMap.has(productId)) return;

  const requestedQuantity = clampNumber(quantity, 0, 99, 0);
  if (requestedQuantity > 0 && !isProductAvailable(productId)) {
    const product = productMap.get(productId);
    showToast(`${product?.name || "This item"} is currently sold out.`);
    return;
  }
  const safeQuantity = requestedQuantity;

  if (safeQuantity <= 0) delete cart[productId];
  else cart[productId] = safeQuantity;

  saveCart();
  renderCartUI();
}

function addToCart(productId, amount = 1) {
  const product = productMap.get(productId);
  if (!product) return;
  if (!isProductAvailable(productId)) {
    showToast(`${product.name} is currently sold out.`);
    return;
  }

  const nextQuantity = clampNumber((cart[productId] || 0) + amount, 0, 99, 1);
  setCartQuantity(productId, nextQuantity);
  showToast(`${product.name} added to cart.`);
}

function buildOrderMessage() {
  const entries = getCartEntries();
  const notes = orderNotes?.value.trim() || "";

  if (!entries.length) {
    return "Hi J&G Chicken Pastil! I would like to ask about your menu and availability.";
  }

  const lines = entries.map((item) => {
    const lineTotal = item.price * item.quantity;
    return `${item.quantity} x ${item.name} — ${formatPeso(lineTotal)}`;
  });

  let message =
    "Hi J&G Chicken Pastil! I would like to order:\n\n" +
    lines.join("\n") +
    `\n\nEstimated item total: ${formatPeso(getCartTotal())}`;

  if (notes) message += `\nNotes: ${notes}`;

  const pickup = window.JG_CURRENT_LOCATION;
  if (pickup?.name) {
    message += `\n\nPickup location: ${pickup.name}`;
    if (pickup.address && pickup.address !== pickup.name) message += `\n${pickup.address}`;
    if (pickup.googleMapsUrl && pickup.googleMapsUrl !== "#contact") message += `\nMap: ${pickup.googleMapsUrl}`;
  }

  message += "\n\nPlease confirm availability and final total. Thank you!";
  return message;
}

function updateOrderPreview() {
  if (orderMessagePreview) orderMessagePreview.textContent = buildOrderMessage();
}

function renderOrderCatalog() {
  if (!orderCatalog) return;

  orderCatalog.innerHTML = "";
  const categories = [...new Set(PRODUCTS.map((product) => product.category))];

  categories.forEach((category) => {
    const group = document.createElement("section");
    group.className = "order-category";

    const heading = document.createElement("h4");
    heading.textContent = category;
    group.appendChild(heading);

    const list = document.createElement("div");
    list.className = "order-choice-list";

    PRODUCTS.filter((product) => product.category === category).forEach((product) => {
      const row = document.createElement("div");
      const available = isProductAvailable(product.id);
      row.className = `order-choice${available ? "" : " sold-out"}`;
      row.dataset.productId = product.id;

      const info = document.createElement("div");
      info.className = "order-choice-info";

      const name = document.createElement("strong");
      name.textContent = product.name;

      const price = document.createElement("span");
      price.textContent = available ? formatPeso(product.price) : `${formatPeso(product.price)} • SOLD OUT`;

      info.append(name, price);

      const control = document.createElement("div");
      control.className = "cart-quantity-control";
      control.setAttribute("aria-label", `${product.name} quantity`);

      const minus = document.createElement("button");
      minus.type = "button";
      minus.dataset.cartAction = "decrease";
      minus.dataset.productId = product.id;
      minus.setAttribute("aria-label", `Remove one ${product.name}`);
      minus.textContent = "−";
      minus.disabled = !available;

      const quantity = document.createElement("span");
      quantity.className = "cart-quantity-value";
      quantity.dataset.cartQuantity = product.id;
      quantity.textContent = String(cart[product.id] || 0);
      quantity.setAttribute("aria-live", "polite");

      const plus = document.createElement("button");
      plus.type = "button";
      plus.dataset.cartAction = "increase";
      plus.dataset.productId = product.id;
      plus.setAttribute("aria-label", `Add one ${product.name}`);
      plus.textContent = "+";
      plus.disabled = !available;

      control.append(minus, quantity, plus);
      row.append(info, control);
      list.appendChild(row);
    });

    group.appendChild(list);
    orderCatalog.appendChild(group);
  });
}

function renderCartSummary() {
  if (!cartItems || !cartEmpty || !cartTotal) return;

  cartItems.innerHTML = "";
  const entries = getCartEntries();
  cartEmpty.hidden = entries.length > 0;

  entries.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = item.name;
    const meta = document.createElement("span");
    meta.textContent = `${item.quantity} × ${formatPeso(item.price)}`;
    copy.append(name, meta);

    const amount = document.createElement("strong");
    amount.className = "cart-item-total";
    amount.textContent = formatPeso(item.price * item.quantity);

    row.append(copy, amount);
    cartItems.appendChild(row);
  });

  cartTotal.textContent = formatPeso(getCartTotal());
}

function syncCatalogQuantities() {
  $$('[data-cart-quantity]', orderCatalog || document).forEach((element) => {
    const productId = element.dataset.cartQuantity;
    element.textContent = String(cart[productId] || 0);
  });
}

function renderCartUI() {
  updateCartCountBadges();
  syncCatalogQuantities();
  renderCartSummary();
  updateOrderPreview();

  const hasItems = getCartCount() > 0;
  if (clearCartButton) clearCartButton.disabled = !hasItems;
  if (copyOrderButton) copyOrderButton.disabled = !hasItems;
  if (openMessengerOrderButton) openMessengerOrderButton.disabled = !hasItems;
}

function openOrderModal() {
  renderCartUI();
  if (menuModal?.classList.contains("active")) closeModal(menuModal);
  openModal(orderModal);
}

cart = loadCart();
renderOrderCatalog();
renderCartUI();

$$('.order-trigger').forEach((button) => {
  button.addEventListener('click', openOrderModal);
});

$$('.add-to-cart').forEach((button) => {
  button.addEventListener('click', () => {
    addToCart(button.dataset.productId, 1);
  });
});

if (modalOrderButton) {
  modalOrderButton.addEventListener('click', () => {
    addToCart(currentDetailProductId, 1);
    closeModal(menuModal);
    openOrderModal();
  });
}

if (orderCatalog) {
  orderCatalog.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;

    const productId = button.dataset.productId;
    const currentQuantity = cart[productId] || 0;

    if (button.dataset.cartAction === 'increase') {
      setCartQuantity(productId, currentQuantity + 1);
    } else if (button.dataset.cartAction === 'decrease') {
      setCartQuantity(productId, currentQuantity - 1);
    }
  });
}

$$('[data-close-order-modal]').forEach((button) => {
  button.addEventListener('click', () => closeModal(orderModal));
});

if (clearCartButton) {
  clearCartButton.addEventListener('click', () => {
    cart = {};
    saveCart();
    renderCartUI();
    showToast('Cart cleared.');
  });
}

if (orderNotes) {
  orderNotes.addEventListener('input', updateOrderPreview);
}

if (copyOrderButton) {
  copyOrderButton.addEventListener('click', async () => {
    if (!getCartCount()) {
      showToast('Add at least one item to your cart first.');
      return;
    }

    const copied = await copyText(buildOrderMessage());
    showToast(copied ? 'Order details copied.' : 'Could not copy automatically. Please copy the preview manually.');
  });
}

if (openMessengerOrderButton) {
  openMessengerOrderButton.addEventListener('click', async () => {
    if (!getCartCount()) {
      showToast('Add at least one item to your cart first.');
      return;
    }

    const copied = await copyText(buildOrderMessage());
    showToast(copied ? 'Order copied. Paste it in Messenger.' : 'Messenger is opening. Copy the preview manually if needed.');
    window.open(BUSINESS.messengerUrl, '_blank', 'noopener,noreferrer');
  });
}

// ======================================================
// BUSINESS HOURS / OPEN-CLOSED STATUS
// ======================================================
const businessStatusText = $("#businessStatusText");
const businessStatusDetail = $("#businessStatusDetail");
const statusDot = $("#statusDot");
const announcementStatus = $("#announcementStatus");
const hoursToggle = $("#hoursToggle");
const hoursList = $("#hoursList");

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

function formatTime24(time) {
  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function parseHoursRange(value) {
  if (!value || value === "closed" || !value.includes("-")) return null;

  const [open, close] = value.split("-").map((part) => part.trim());
  if (!open || !close) return null;

  return { open, close };
}

function getManilaDateParts() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(new Date());
  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });

  return {
    weekday: String(values.weekday || "").toLowerCase(),
    hour: Number(values.hour || 0),
    minute: Number(values.minute || 0)
  };
}

function minutesFromTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isOpenForRange(currentMinutes, openMinutes, closeMinutes) {
  if (openMinutes === closeMinutes) return false;

  if (closeMinutes > openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  // Supports overnight hours, e.g. 18:00-01:00.
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}

function renderBusinessHours() {
  if (!hoursList) return;

  hoursList.innerHTML = "";

  DAYS.forEach((day) => {
    const row = document.createElement("div");
    row.className = "hours-row";

    const dayLabel = document.createElement("strong");
    dayLabel.textContent = day.charAt(0).toUpperCase() + day.slice(1);

    const valueLabel = document.createElement("span");
    const value = BUSINESS.hours[day];

    if (value === "closed") {
      valueLabel.textContent = "Closed";
    } else {
      const range = parseHoursRange(value);
      valueLabel.textContent = range
        ? `${formatTime24(range.open)} – ${formatTime24(range.close)}`
        : "Message us to confirm";
    }

    row.append(dayLabel, valueLabel);
    hoursList.appendChild(row);
  });
}

function updateBusinessStatus() {
  const { weekday, hour, minute } = getManilaDateParts();
  const todayValue = BUSINESS.hours[weekday];

  if (!todayValue) {
    if (businessStatusText) businessStatusText.textContent = "Message us for today's hours";
    if (businessStatusDetail) businessStatusDetail.textContent = "Today's operating hours have not been published on the website yet.";
    if (announcementStatus) announcementStatus.textContent = "Message us for today's availability";

    if (statusDot) {
      statusDot.classList.remove("open", "closed");
      statusDot.classList.add("neutral");
    }
    return;
  }

  if (todayValue === "closed") {
    if (businessStatusText) businessStatusText.textContent = "Closed today";
    if (businessStatusDetail) businessStatusDetail.textContent = "Message us on Facebook for the next available schedule.";
    if (announcementStatus) announcementStatus.textContent = "Closed today";

    if (statusDot) {
      statusDot.classList.remove("open", "neutral");
      statusDot.classList.add("closed");
    }
    return;
  }

  const range = parseHoursRange(todayValue);

  if (!range) {
    if (businessStatusText) businessStatusText.textContent = "Message us for today's hours";
    if (businessStatusDetail) businessStatusDetail.textContent = "Please confirm today's availability through Messenger.";
    if (announcementStatus) announcementStatus.textContent = "Message us for today's availability";
    return;
  }

  const currentMinutes = hour * 60 + minute;
  const openMinutes = minutesFromTime(range.open);
  const closeMinutes = minutesFromTime(range.close);
  const isOpen = isOpenForRange(currentMinutes, openMinutes, closeMinutes);

  if (businessStatusText) businessStatusText.textContent = isOpen ? "Open now" : "Closed now";

  if (businessStatusDetail) {
    businessStatusDetail.textContent =
      `${formatTime24(range.open)} – ${formatTime24(range.close)} today`;
  }

  if (announcementStatus) {
    announcementStatus.textContent = isOpen
      ? `Open now until ${formatTime24(range.close)}`
      : `Today's hours: ${formatTime24(range.open)} – ${formatTime24(range.close)}`;
  }

  if (statusDot) {
    statusDot.classList.remove("neutral", isOpen ? "closed" : "open");
    statusDot.classList.add(isOpen ? "open" : "closed");
  }
}

renderBusinessHours();
updateBusinessStatus();

if (hoursToggle && hoursList) {
  hoursToggle.addEventListener("click", () => {
    const isExpanded = hoursToggle.getAttribute("aria-expanded") === "true";
    hoursToggle.setAttribute("aria-expanded", String(!isExpanded));
    hoursList.hidden = isExpanded;
    hoursToggle.textContent = isExpanded ? "View business hours" : "Hide business hours";
  });
}

// Refresh status every minute if hours are configured later.
window.setInterval(updateBusinessStatus, 60_000);

// ======================================================
// REAL CUSTOMER REVIEWS ONLY
// ======================================================
const reviewsGrid = $("#reviewsGrid");
const reviewsEmpty = $("#reviewsEmpty");

function renderReviews() {
  if (!reviewsGrid || !reviewsEmpty) return;

  reviewsGrid.innerHTML = "";

  const validReviews = REVIEWS.filter((review) => {
    return review &&
      typeof review.name === "string" &&
      typeof review.text === "string" &&
      review.name.trim() &&
      review.text.trim();
  });

  if (!validReviews.length) {
    reviewsEmpty.classList.remove("hidden");
    return;
  }

  reviewsEmpty.classList.add("hidden");

  validReviews.forEach((review) => {
    const card = document.createElement("article");
    card.className = "review-card reveal visible";

    const stars = document.createElement("div");
    stars.className = "review-stars";

    const rating = clampNumber(review.rating, 1, 5, 5);
    stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);
    stars.setAttribute("aria-label", `${rating} out of 5 stars`);

    const quote = document.createElement("blockquote");
    quote.textContent = review.text;

    const footer = document.createElement("footer");
    footer.textContent = `— ${review.name}`;

    card.append(stars, quote, footer);
    reviewsGrid.appendChild(card);
  });
}

renderReviews();

// ======================================================
// OWNER-MANAGED WEBSITE DATA
// ======================================================
const businessAnnouncement = $("#businessAnnouncement");

function applyProductAvailabilityToWebsite() {
  PRODUCTS.forEach((product) => {
    const available = isProductAvailable(product.id);
    const card = document.querySelector(`[data-product-card="${product.id}"]`);
    if (card) card.classList.toggle("sold-out", !available);

    $$(`.add-to-cart[data-product-id="${product.id}"]`).forEach((button) => {
      button.disabled = !available;
      button.setAttribute("aria-disabled", String(!available));
      button.textContent = product.id === "pastil-jar"
        ? (available ? "Add Jar to Cart" : "Sold Out")
        : (available ? "Add to Cart" : "Sold Out");
    });

    $$(`[data-addon-product="${product.id}"]`).forEach((element) => {
      element.classList.toggle("sold-out", !available);
    });
  });

  const jarSection = document.querySelector('[data-product-section="pastil-jar"]');
  if (jarSection) jarSection.classList.toggle("product-sold-out", !isProductAvailable("pastil-jar"));
}

function removeUnavailableItemsFromCart() {
  let changed = false;
  Object.keys(cart).forEach((productId) => {
    if (!isProductAvailable(productId)) {
      delete cart[productId];
      changed = true;
    }
  });
  if (changed) {
    saveCart();
    showToast("Sold-out items were removed from your cart.");
  }
}

async function loadOwnerManagedWebsiteData() {
  if (!SUPABASE_PUBLIC_READY) return;
  try {
    const [availabilityRows, settingRows, reviewRows] = await Promise.all([
      publicSupabaseRequest("/rest/v1/product_availability?select=product_id,is_available&order=sort_order.asc"),
      publicSupabaseRequest("/rest/v1/site_settings?select=setting_key,setting_value&setting_key=eq.announcement"),
      publicSupabaseRequest("/rest/v1/customer_reviews?select=id,name,rating,review_text,created_at&is_published=eq.true&order=created_at.desc")
    ]);

    if (Array.isArray(availabilityRows)) {
      availabilityRows.forEach((row) => {
        if (productMap.has(row.product_id)) PRODUCT_AVAILABILITY.set(row.product_id, row.is_available !== false);
      });
      removeUnavailableItemsFromCart();
      applyProductAvailabilityToWebsite();
      renderOrderCatalog();
      renderCartUI();
    }

    if (Array.isArray(settingRows) && settingRows[0]?.setting_value && businessAnnouncement) {
      businessAnnouncement.textContent = settingRows[0].setting_value;
    }

    if (Array.isArray(reviewRows)) {
      REVIEWS = reviewRows.map((row) => ({ name: row.name, rating: row.rating, text: row.review_text }));
      renderReviews();
    }
  } catch (error) {
    console.warn("Owner-managed website data could not be loaded. Using website fallbacks.", error);
  }
}

loadOwnerManagedWebsiteData();

// ======================================================
// GALLERY IMAGE MODAL + PREV / NEXT
// ======================================================
const imageModal = $("#imageModal");
const modalImage = $("#modalImage");
const modalImageTitle = $("#modalImageTitle");
const galleryPrev = $("#galleryPrev");
const galleryNext = $("#galleryNext");
const galleryItems = $$(".gallery-item");

let activeGalleryIndex = 0;

function showGalleryImage(index) {
  if (!galleryItems.length || !modalImage || !modalImageTitle) return;

  activeGalleryIndex =
    (index + galleryItems.length) % galleryItems.length;

  const item = galleryItems[activeGalleryIndex];

  modalImage.src = item.dataset.image || "";
  modalImage.alt = item.dataset.title || "Gallery preview";
  modalImageTitle.textContent = item.dataset.title || "";
}

galleryItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    showGalleryImage(index);
    openModal(imageModal);
  });
});

if (galleryPrev) {
  galleryPrev.addEventListener("click", () => {
    showGalleryImage(activeGalleryIndex - 1);
  });
}

if (galleryNext) {
  galleryNext.addEventListener("click", () => {
    showGalleryImage(activeGalleryIndex + 1);
  });
}

$$("[data-close-image-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(imageModal));
});

// ======================================================
// ESCAPE + KEYBOARD GALLERY NAVIGATION
// ======================================================
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (orderModal?.classList.contains("active")) closeModal(orderModal);
    if (menuModal?.classList.contains("active")) closeModal(menuModal);
    if (imageModal?.classList.contains("active")) closeModal(imageModal);
  }

  if (imageModal?.classList.contains("active")) {
    if (event.key === "ArrowLeft") showGalleryImage(activeGalleryIndex - 1);
    if (event.key === "ArrowRight") showGalleryImage(activeGalleryIndex + 1);
  }
});

// ======================================================
// SCROLL REVEAL ANIMATION
// ======================================================
const supportsIntersectionObserver = "IntersectionObserver" in window;

if (supportsIntersectionObserver) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  $$(".reveal").forEach((element) => {
    revealObserver.observe(element);
  });
} else {
  $$(".reveal").forEach((element) => {
    element.classList.add("visible");
  });
}
