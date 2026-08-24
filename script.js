// ===============================
// J&G BUSINESS CONTACT SETTINGS
// Change these values only when needed.
// ===============================
const BUSINESS = {
  facebookUrl: "https://www.facebook.com/profile.php?id=61576281657176",
  phoneNumber: "0963-032-6793",
  googleMapsUrl: "https://www.google.com/maps/place/JM+Ocasla+Hardware/@14.6758408,120.9817245,17z/data=!4m14!1m7!3m6!1s0x3397b41e67c2800f:0x5ae643476f6fa9fb!2sJM+Ocasla+Hardware!8m2!3d14.675873!4d120.9842109!16s%2Fg%2F1hc77jysv!3m5!1s0x3397b41e67c2800f:0x5ae643476f6fa9fb!8m2!3d14.675873!4d120.9842109!16s%2Fg%2F1hc77jysv?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D"
};

// ===============================
// BUSINESS LINKS
// ===============================
const facebookLink = document.getElementById("facebookLink");
const phoneLink = document.getElementById("phoneLink");
const contactNumberText = document.getElementById("contactNumberText");
const mapsLink = document.getElementById("mapsLink");

if (facebookLink) facebookLink.href = BUSINESS.facebookUrl;
if (mapsLink) mapsLink.href = BUSINESS.googleMapsUrl;

if (BUSINESS.phoneNumber.trim()) {
  const cleanedPhone = BUSINESS.phoneNumber.replace(/[^+\d]/g, "");
  if (phoneLink) phoneLink.href = `tel:${cleanedPhone}`;
  if (contactNumberText) contactNumberText.textContent = BUSINESS.phoneNumber;
} else if (phoneLink) {
  phoneLink.href = "#contact";
  phoneLink.addEventListener("click", (event) => {
    event.preventDefault();
    alert("Add your business phone number in script.js first.");
  });
}

// ===============================
// CURRENT YEAR
// ===============================
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// ===============================
// IMAGE FIT / FALLBACK HANDLING
// The placeholder only appears when an image is missing.
// ===============================
document.querySelectorAll(".image-shell img").forEach((img) => {
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

// ===============================
// MOBILE NAVIGATION
// ===============================
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// ===============================
// ACTIVE NAVIGATION / SCROLLSPY
// Highlights Home, About, Menu, etc. based on the current section.
// ===============================
const sectionNavLinks = [...document.querySelectorAll(".nav-link[data-section]")];
const trackedSections = sectionNavLinks
  .map((link) => document.getElementById(link.dataset.section))
  .filter(Boolean);
const siteHeader = document.querySelector(".site-header");

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

  // Make sure Contact becomes active when the user reaches the bottom.
  const nearBottom =
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - 120;

  if (nearBottom && document.getElementById("contact")) {
    currentSection = "contact";
  }

  setActiveSection(currentSection);
}

sectionNavLinks.forEach((link) => {
  link.addEventListener("click", () => setActiveSection(link.dataset.section));
});

let scrollTicking = false;
window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        updateActiveSection();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  },
  { passive: true }
);

window.addEventListener("resize", updateActiveSection);
window.addEventListener("load", updateActiveSection);
updateActiveSection();

// ===============================
// MENU DETAILS MODAL
// ===============================
const menuModal = document.getElementById("menuModal");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDesc = document.getElementById("modalDesc");

function openModal(modal) {
  if (!modal) return;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal.active")) {
    document.body.classList.remove("modal-open");
  }
}

document.querySelectorAll(".open-menu-modal").forEach((button) => {
  button.addEventListener("click", () => {
    if (modalTitle) modalTitle.textContent = button.dataset.name;
    if (modalPrice) modalPrice.textContent = button.dataset.price;
    if (modalDesc) modalDesc.textContent = button.dataset.desc;
    openModal(menuModal);
  });
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(menuModal));
});

// ===============================
// GALLERY IMAGE MODAL
// ===============================
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalImageTitle = document.getElementById("modalImageTitle");

document.querySelectorAll(".gallery-item").forEach((item) => {
  item.addEventListener("click", () => {
    if (modalImage) {
      modalImage.src = item.dataset.image;
      modalImage.alt = item.dataset.title;
    }
    if (modalImageTitle) modalImageTitle.textContent = item.dataset.title;
    openModal(imageModal);
  });
});

document.querySelectorAll("[data-close-image-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(imageModal));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal(menuModal);
    closeModal(imageModal);
  }
});

// ===============================
// SCROLL REVEAL ANIMATION
// ===============================
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

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});
