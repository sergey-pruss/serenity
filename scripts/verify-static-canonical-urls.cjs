#!/usr/bin/env node
/**
 * Канон URL статического контура: без завершающего слэша (включая главную).
 * Запуск: node scripts/verify-static-canonical-urls.cjs
 * После выкладки: ORIGIN=https://serenity.agency node scripts/verify-static-canonical-urls.cjs
 */
const fs = require("fs");
const path = require("path");
const { pathnameNoTrailingSlash } = require("./lib/canonical-url.cjs");

const root = path.join(__dirname, "..");
const ORIGIN = "https://serenity.agency";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(dir, acc = []) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const name of fs.readdirSync(abs)) {
    if (name === ".DS_Store") continue;
    const rel = path.join(dir, name);
    const st = fs.statSync(path.join(root, rel));
    if (st.isDirectory()) walk(rel, acc);
    else if (name === "index.html") acc.push(rel);
  }
  return acc;
}

function fileToPath(rel) {
  const dir = path.dirname(rel).replace(/\\/g, "/");
  if (dir === ".") return "/";
  return `/${dir}`;
}

function canonFromHtml(html) {
  const m = html.match(/rel="canonical"\s+href="([^"]+)"/i);
  return m ? m[1] : null;
}

function expectNoSlashPath(p) {
  return p === "/" || !p.endsWith("/");
}

function canonicalHrefOk(href) {
  return typeof href === "string" && !href.endsWith("/");
}

const htmlFiles = [
  "index.html",
  "404.html",
  "services/index.html",
  "services/marketing/index.html",
  "targeting/index.html",
  "kontekstnaya_reklama/index.html",
  ...walk("blog", []),
  ...walk("case/all", []),
];

const issues = [];

for (const rel of htmlFiles) {
  const html = read(rel);
  const canon = canonFromHtml(html);
  if (!canon) continue;
  let canonPath;
  try {
    canonPath = new URL(canon).pathname;
  } catch {
    issues.push({ rel, type: "bad-canonical", canon });
    continue;
  }
  if (!canonicalHrefOk(canon)) {
    issues.push({ rel, type: "canonical-has-slash", canon });
  }
}

const sitemap = read("sitemap.xml");
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const loc = m[1].trim();
  if (loc.endsWith("/")) {
    issues.push({ type: "sitemap-has-slash", loc });
  }
}

const header = read("html/partials/header.html");
for (const bad of ['href="/blog/"', 'href="/case/all/"', 'href="/services/"', 'href="/targeting/"', 'href="/kontekstnaya_reklama/"']) {
  if (header.includes(bad)) issues.push({ type: "header-href-slash", href: bad });
}

async function liveChecks() {
  const origin = process.env.ORIGIN?.replace(/\/+$/, "");
  if (!origin) return;
  const samples = [
    "/blog",
    "/blog/",
    "/blog/article/kak-uvelichit-trafik-sajta",
    "/blog/article/kak-uvelichit-trafik-sajta/",
    "/case/all",
    "/case/all/",
    "/services",
    "/services/",
    "/targeting",
    "/targeting/",
    "/services/marketing",
    "/services/marketing/",
  ];
  for (const p of samples) {
    const res = await fetch(`${origin}${p}`, { redirect: "manual" });
    const slash = p.endsWith("/") && p.length > 1;
    if (!slash && p !== "/" && res.status !== 200) {
      issues.push({ type: "live-no-slash-not-200", path: p, status: res.status });
    }
    if (slash && res.status !== 301 && res.status !== 308) {
      issues.push({ type: "live-slash-not-redirect", path: p, status: res.status });
    }
    if (slash && (res.status === 301 || res.status === 308)) {
      const loc = res.headers.get("location") || "";
      const locPath = new URL(loc, origin).pathname;
      if (!expectNoSlashPath(locPath)) {
        issues.push({ type: "live-bad-redirect-target", from: p, location: loc });
      }
    }
  }
}

(async () => {
  await liveChecks();
  if (issues.length) {
    console.error("verify-static-canonical-urls: failures:\n", JSON.stringify(issues.slice(0, 40), null, 2));
    if (issues.length > 40) console.error(`… +${issues.length - 40}`);
    process.exit(1);
  }
  console.log(
    `OK: static canonical/sitemap/href — ${htmlFiles.length} HTML, без слэша${process.env.ORIGIN ? `; live ${process.env.ORIGIN}` : ""}.`,
  );
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
