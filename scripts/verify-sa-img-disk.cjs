#!/usr/bin/env node
/**
 * Проверка: все упоминания /_sa/img/... из собранного HTML и ключевых JSON
 * указывают на существующие файлы в репозитории; нет fetchpriority=high + loading=lazy
 * на одном <img> (ломало приоритет загрузки после оптимизаций LCP).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      walk(p, exts, out);
    } else if (exts.some((e) => ent.name.endsWith(e))) out.push(p);
  }
  return out;
}

/** `/_sa/img/...` → путь к файлу от корня репозитория */
function diskPathFromSaUrl(u) {
  const raw = String(u || "")
    .trim()
    .split(/[?#]/)[0]
    .replace(/^["']+|["']+$/g, "");
  if (!raw.startsWith("/_sa/")) return "";
  const rel = raw.replace(/^\//, "").replace(/^_sa\//, "");
  return path.join(root, rel);
}

function collectUrlsFromText(text, bucket) {
  const rePath = /\/_sa\/img\/[a-zA-Z0-9_./-]+/g;
  let m;
  while ((m = rePath.exec(text))) {
    bucket.add(m[0]);
  }
  const srcsetRe = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(text))) {
    const raw = m[1];
    for (const part of raw.split(",")) {
      const token = part.trim().split(/\s+/)[0];
      if (token && token.startsWith("/_sa/img/")) bucket.add(token);
    }
  }
}

function htmlScanFiles() {
  const files = new Set();
  for (const p of walk(path.join(root, "blog"), [".html"])) files.add(p);
  for (const p of walk(path.join(root, "case"), [".html"])) files.add(p);
  for (const p of walk(path.join(root, "html"), [".html"])) files.add(p);
  for (const rel of ["index.html", "404.html", "kontekstnaya_reklama/index.html", "services/index.html"]) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) files.add(p);
  }
  return [...files];
}

function jsonScanFiles() {
  const out = [
    path.join(root, "json", "blogs-all.json"),
    path.join(root, "json", "cases-all.json"),
    path.join(root, "json", "blog-posts-manual.json"),
  ].filter((p) => fs.existsSync(p));
  const baDir = path.join(root, "json", "blog-articles");
  if (fs.existsSync(baDir)) {
    for (const ent of fs.readdirSync(baDir, { withFileTypes: true })) {
      if (ent.isFile() && ent.name.endsWith(".json")) out.push(path.join(baDir, ent.name));
    }
  }
  const capDir = path.join(root, "json", "case-all-pages");
  if (fs.existsSync(capDir)) {
    walk(capDir, [".json"], out);
  }
  return out;
}

/** fetchpriority=high и loading=lazy на одном img — недопустимо */
function assertNoHighFetchLazyHtml(filePath, body) {
  const re = /<img\b[\s\S]*?>/gi;
  let m;
  while ((m = re.exec(body))) {
    const tag = m[0];
    if (!/fetchpriority\s*=\s*["']high["']/i.test(tag)) continue;
    if (!/\bloading\s*=\s*["']lazy["']/i.test(tag)) continue;
    throw new Error(`${path.relative(root, filePath)}: <img> с fetchpriority=high и loading=lazy — замените на loading=eager`);
  }
}

function main() {
  const urls = new Set();
  for (const fp of htmlScanFiles()) {
    const body = fs.readFileSync(fp, "utf8");
    collectUrlsFromText(body, urls);
    assertNoHighFetchLazyHtml(fp, body);
  }
  for (const fp of jsonScanFiles()) {
    collectUrlsFromText(fs.readFileSync(fp, "utf8"), urls);
  }

  const missing = [];
  for (const u of urls) {
    const disk = diskPathFromSaUrl(u);
    if (!disk) continue;
    if (!fs.existsSync(disk)) missing.push(u);
  }
  assert(missing.length === 0, `Отсутствуют файлы под /_sa/img:\n${missing.slice(0, 40).join("\n")}${missing.length > 40 ? `\n… +${missing.length - 40}` : ""}`);

  console.log(`OK: verify-sa-img-disk (${urls.size} уникальных путей /_sa/img/…, HTML без high+lazy)`);
}

main();
