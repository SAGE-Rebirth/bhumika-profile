// Builds site/ from src/ and public/:
// - copies public/ and fingerprints everything under assets/ (safe to cache forever)
// - bakes contact details into the HTML, swaps icon-font spans for an inline SVG sprite
// - inlines the compiled CSS; main.js ships as a fingerprinted file so the CSP header
//   in vercel.json can stay "script-src 'self'" with no inline-script hashes
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://empathy-and-mind.vercel.app";
const OUT = "site";
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const sha = (data, enc = "hex") => crypto.createHash("sha256").update(data).digest(enc);

const contact = JSON.parse(read("./contact.json"));
for (const key of ["phone", "phoneDisplay", "email", "address", "hours"]) {
  if (typeof contact[key] !== "string" || !contact[key].trim()) throw new Error(`contact.json: missing "${key}"`);
}
const sprite = read("./icons.svg");
const css = read("./fonts.css") + fs.readFileSync(".build/styles.css", "utf8");

// ---------- 1. Static files + fingerprinted assets ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync("public", OUT, { recursive: true });
fs.copyFileSync(new URL("./main.js", import.meta.url), path.join(OUT, "assets", "main.js"));
// Downloadable PDFs keep stable, shareable URLs (not fingerprinted); see vercel.json for headers.
fs.cpSync("pdf", path.join(OUT, "downloads"), { recursive: true, filter: (f) => !path.basename(f).startsWith(".") });

const assetMap = new Map(); // "/assets/a.webp" -> "/assets/a.1f2e3d4c5b.webp"
(function fingerprint(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fingerprint(file);
      continue;
    }
    const { name, ext } = path.parse(entry.name);
    const hashed = path.join(dir, `${name}.${sha(fs.readFileSync(file)).slice(0, 10)}${ext}`);
    fs.renameSync(file, hashed);
    const url = (p) => "/" + path.relative(OUT, p).split(path.sep).join("/");
    assetMap.set(url(file), url(hashed));
  }
})(path.join(OUT, "assets"));

function rewriteAssetUrls(text, label) {
  // Longest first so no URL is a prefix of another during replacement.
  for (const [from, to] of [...assetMap].sort((a, b) => b[0].length - a[0].length)) text = text.split(from).join(to);
  const unknown = [...text.matchAll(/\/assets\/[\w./-]+\.\w+/g)]
    .map((m) => m[0])
    .filter((u) => !fs.existsSync(path.join(OUT, u)));
  if (unknown.length) throw new Error(`${label} references missing assets: ${[...new Set(unknown)].join(", ")}`);
  return text;
}

// ---------- 2. Page ----------
let html = read("./index.html");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const waLink = (text) => `https://wa.me/${contact.phone.replace(/\D/g, "")}${text ? `?text=${text}` : ""}`;
const hrefFor = {
  tel: `tel:${contact.phone}`,
  mailto: `mailto:${contact.email}`,
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`,
};

// Rewrite contact attributes on each opening tag.
html = html.replace(/<(a|button|span|p)\b([^>]*)>/g, (tag, name, attrs) => {
  const get = (k) => attrs.match(new RegExp(`\\s${k}(?:="([^"]*)")?(?=[\\s>]|$)`));
  const setHref = (url, external) => {
    attrs = attrs.replace(/\shref="[^"]*"/, "").replace(/\s(target|rel)="[^"]*"/g, "");
    attrs += ` href="${esc(url)}"` + (external ? ' target="_blank" rel="noopener"' : "");
  };
  let m;
  if ((m = get("data-href"))) setHref(hrefFor[m[1]], m[1] === "maps");
  if ((m = get("data-wa"))) setHref(waLink(m[1]), true);
  if ((m = get("data-mail"))) setHref(`mailto:${contact.email}?${m[1]}`, false);
  if ((m = get("data-copy")) && m[1] in contact) attrs = attrs.replace(m[0], ` data-copy="${esc(contact[m[1]])}"`);
  attrs = attrs.replace(/\sdata-(href|wa|mail)(="[^"]*")?/g, "");
  return `<${name}${attrs}>`;
});
html = html.replace(/(data-text="(\w+)"[^>]*>)[^<]*</g, (_, open, key) => `${open}${esc(contact[key])}<`);
html = html.replace(/<span data-year>\d+<\/span>/, String(new Date().getFullYear()));

// Icon font spans -> inline SVG <use>.
const used = new Set(["menu", "close"]);
html = html.replace(
  /<span class="material-symbols-outlined([^"]*)"([^>]*)>\s*([a-z_]+)\s*<\/span>/g,
  (_, cls, attrs, name) => {
    let id = name;
    attrs = attrs.replace(/\saria-hidden="true"/, "");
    const style = attrs.match(/\sstyle="([^"]*)"/);
    if (style) {
      if (/'FILL' 1/.test(style[1])) id = `${name}-fill`;
      const rest = style[1].replace(/font-variation-settings:[^;"]*;?/, "").trim();
      attrs = attrs.replace(style[0], rest ? ` style="${rest}"` : "");
    }
    used.add(id);
    return `<svg class="icon${cls}"${attrs} aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
  }
);
for (const id of used) if (!sprite.includes(`id="i-${id}"`)) throw new Error(`icon missing from sprite: ${id}`);
const spriteUsed = sprite.replace(/<symbol id="i-([\w-]+)"[^]*?<\/symbol>\n?/g, (s, id) => (used.has(id) ? s : ""));

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#practice`,
      name: "Empathy & Mind",
      description:
        "Evidence-based child psychology and educational consulting for parents, schools and EdTech teams in Bhopal and online.",
      url: `${SITE_URL}/`,
      image: `${SITE_URL}/assets/og-image.jpg`,
      telephone: contact.phone,
      email: contact.email,
      priceRange: "₹1,499–₹2,499",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bhopal",
        addressRegion: "Madhya Pradesh",
        addressCountry: "IN",
        streetAddress: "Arera Colony",
      },
      areaServed: ["Bhopal", "Madhya Pradesh", "India"],
      founder: { "@id": `${SITE_URL}/#bhumika` },
      knowsAbout: [
        "Child development",
        "Educational psychology",
        "Emotional regulation",
        "Math anxiety",
        "Neuro-inclusive classrooms",
        "Parenting guidance",
      ],
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#bhumika`,
      name: "Bhumika Verma",
      jobTitle: "Child Psychology & Educational Consultant",
      image: `${SITE_URL}/assets/bhumika-portrait.webp`,
      email: contact.email,
      telephone: contact.phone,
      alumniOf: { "@type": "CollegeOrUniversity", name: "Institute for Excellence in Higher Education (IEHE), Bhopal" },
      worksFor: { "@id": `${SITE_URL}/#practice` },
    },
  ],
};

// Collapse whitespace before inlining CSS/JS so their contents stay untouched.
html = html.replace(/\s{2,}/g, " ").replace(/>\s+</g, (m) => (m.includes("\n") ? "><" : m));
html = html
  .replace("<!--STYLES-->", () => `<style>${css}</style>`)
  .replace("<!--JSONLD-->", () => `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`)
  .replace(/(<body[^>]*>)/, (b) => `${b}${spriteUsed.replace(/\n/g, "")}`);
html = rewriteAssetUrls(html, "index.html");

for (const [, href] of html.matchAll(/href="(\/downloads\/[^"]+)"/g)) {
  if (!fs.existsSync(path.join(OUT, decodeURIComponent(href)))) throw new Error(`download link points to a missing file: ${href}`);
}

// The CSP header (vercel.json) allows no inline scripts; JSON-LD is data, not script.
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/g)];
if (inlineScripts.length) throw new Error(`inline <script> would be blocked by the CSP: ${inlineScripts[0][0]}`);

for (const marker of ["<!--STYLES-->", "<!--JSONLD-->", "material-symbols-outlined"]) {
  if (html.includes(marker)) throw new Error(`build left ${marker} in output`);
}
fs.writeFileSync(path.join(OUT, "index.html"), html);

// ---------- 3. Other pages and files that reference assets ----------
const notFound = read("./404.html").replace("<!--FONTS-->", () => `<style>${read("./fonts.css")}</style>`);
fs.writeFileSync(path.join(OUT, "404.html"), rewriteAssetUrls(notFound, "404.html"));
const manifest = path.join(OUT, "site.webmanifest");
fs.writeFileSync(manifest, rewriteAssetUrls(fs.readFileSync(manifest, "utf8"), "site.webmanifest"));

console.log(
  `site/index.html ${(html.length / 1024).toFixed(1)} KB, ${used.size} icons, ${assetMap.size} fingerprinted assets`
);
