// Contact details used across the page. Edit here; every link, label and copy button updates.
const CONTACT = {
  phone: "+919179058011", // WhatsApp + mobile, digits with country code
  phoneDisplay: "+91 91790 58011",
  email: "bhumikaverma.inneralchemy@gmail.com",
  address: "Arera Colony, Bhopal, Madhya Pradesh",
  hours: "Consultations by prior appointment",
};

const waLink = (encodedText) =>
  `https://wa.me/${CONTACT.phone.replace(/\D/g, "")}${encodedText ? `?text=${encodedText}` : ""}`;

const hrefFor = {
  tel: () => `tel:${CONTACT.phone}`,
  mailto: () => `mailto:${CONTACT.email}`,
  maps: () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address)}`,
};

document.querySelectorAll("[data-text]").forEach((el) => {
  el.textContent = CONTACT[el.dataset.text];
});

document.querySelectorAll("[data-href]").forEach((el) => {
  el.href = hrefFor[el.dataset.href]();
});

document.querySelectorAll("[data-wa]").forEach((el) => {
  el.href = waLink(el.dataset.wa);
  el.target = "_blank";
  el.rel = "noopener";
});

document.querySelectorAll("[data-mail]").forEach((el) => {
  el.href = `mailto:${CONTACT.email}?${el.dataset.mail}`;
});

document.querySelectorAll("[data-toolkit]").forEach((el) => {
  el.href = waLink(
    encodeURIComponent(
      "Hello Empathy & Mind, I'd like to receive the free Child Emotional Regulation & Inclusive Learning Toolkit (PDF)."
    )
  );
  el.target = "_blank";
  el.rel = "noopener";
});

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Toast
const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("opacity-0", "translate-y-3");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("opacity-0", "translate-y-3"), 2400);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await copyText(CONTACT[btn.dataset.copy]);
    showToast(`Copied: ${CONTACT[btn.dataset.copy]}`);
  });
});

const draft = document.getElementById("inquiry-draft");
document.querySelectorAll("[data-copy-draft]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    // Skip the "Inquiry draft" heading line.
    const lines = [...draft.querySelectorAll("p")].slice(1).map((p) => p.textContent.trim());
    await copyText(lines.join("\n"));
    showToast("Inquiry draft copied — paste it into WhatsApp or email.");
  });
});

// Mobile menu
const menuBtn = document.getElementById("menu-toggle");
const menu = document.getElementById("mobile-menu");
function setMenu(open) {
  menu.classList.toggle("hidden", !open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menuBtn.querySelector(".material-symbols-outlined").textContent = open ? "close" : "menu";
}
menuBtn.addEventListener("click", () => setMenu(menu.classList.contains("hidden")));
menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});
window.matchMedia("(min-width: 1280px)").addEventListener("change", (e) => e.matches && setMenu(false));
