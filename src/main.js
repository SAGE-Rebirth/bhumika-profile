// Contact details live in src/contact.json and are baked into the HTML at build time.
// One delegated click listener handles every interactive element, so nothing needs
// per-element listeners and nothing is left behind if markup changes.

const toast = document.getElementById("toast");
const draft = document.getElementById("inquiry-draft");
const menuBtn = document.getElementById("menu-toggle");
const menu = document.getElementById("mobile-menu");
const menuIcon = menuBtn?.querySelector("use");

let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("opacity-0", "translate-y-3");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("opacity-0", "translate-y-3"), 2400);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function isMenuOpen() {
  return menu ? !menu.classList.contains("hidden") : false;
}

function setMenu(open) {
  if (!menu || !menuBtn) return;
  menu.classList.toggle("hidden", !open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menuIcon?.setAttribute("href", open ? "#i-close" : "#i-menu");
}

document.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  if (target.closest("#menu-toggle")) {
    setMenu(!isMenuOpen());
    return;
  }
  if (target.closest("#mobile-menu a")) setMenu(false);

  const copyBtn = target.closest("[data-copy]");
  if (copyBtn) {
    const value = copyBtn.getAttribute("data-copy");
    showToast((await copyText(value)) ? `Copied: ${value}` : "Couldn't copy — please select the text instead.");
    return;
  }

  if (target.closest("[data-copy-draft]") && draft) {
    // Skip the "Inquiry draft" heading line.
    const lines = [...draft.querySelectorAll("p")].slice(1).map((p) => p.textContent.trim());
    showToast(
      (await copyText(lines.join("\n")))
        ? "Inquiry draft copied — paste it into WhatsApp or email."
        : "Couldn't copy — please select the text instead."
    );
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMenuOpen()) {
    setMenu(false);
    menuBtn?.focus();
  }
});

window.matchMedia("(min-width: 1280px)").addEventListener("change", (e) => e.matches && setMenu(false));

// Pause decorative SVG animations while they are off screen.
if ("IntersectionObserver" in window) {
  const animObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle("anim-paused", !entry.isIntersecting);
  });
  document.querySelectorAll("[data-anim]").forEach((el) => animObserver.observe(el));
}
