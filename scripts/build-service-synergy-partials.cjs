#!/usr/bin/env node
/**
 * Синергия услуг: оболочка (_service-synergy.shell.html) + json/services/<slug>/synergy.json.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const shellPath = path.join(root, "html", "partials", "services", "_service-synergy.shell.html");
const partialsDir = path.join(root, "html", "partials", "services");

const SERVICES = [
  {
    slug: "kontekstnaya_reklama",
    partial: "synergy-kontekstnaya-reklama.html",
    mountId: "kontekst-synergy-mounted",
    rootClass: "kontekst-synergy-root",
    comment:
      "<!-- Синергия: json/services/kontekstnaya_reklama/synergy.json + стили services-unified (главная). -->\n",
  },
  {
    slug: "targeting",
    partial: "synergy-targeting.html",
    mountId: "kontekst-synergy-mounted",
    rootClass: "kontekst-synergy-root",
    comment:
      "<!-- Синергия targeting: json/services/targeting/synergy.json (карточки своей услуги). -->\n",
  },
  {
    slug: "marketing",
    partial: "synergy-marketing.html",
    mountId: "kontekst-synergy-mounted",
    rootClass: "kontekst-synergy-root",
    comment:
      "<!-- Синергия marketing: json/services/marketing/synergy.json (карточки своей услуги). -->\n",
  },
  {
    slug: "korporativnyj_sajt",
    partial: "synergy-korporativnyj-sajt.html",
    mountId: "kontekst-synergy-mounted",
    rootClass: "kontekst-synergy-root",
    comment:
      "<!-- Синергия korporativnyj_sajt: json/services/korporativnyj_sajt/synergy.json. -->\n",
  },
];

function extractBodyFromPartial(html, mountId) {
  const openRe = new RegExp(`<section[^>]*\\bid="${mountId}"[^>]*>`, "i");
  const m = html.match(openRe);
  if (!m) throw new Error(`mount #${mountId} не найден в partial`);
  const start = m.index + m[0].length;
  const close = html.lastIndexOf("</section>");
  if (close < start) throw new Error("нет закрывающего </section>");
  return html.slice(start, close).trim();
}

function writeJsonFromPartial(svc) {
  const partialPath = path.join(partialsDir, svc.partial);
  const html = fs.readFileSync(partialPath, "utf8");
  const bodyHtml = extractBodyFromPartial(html, svc.mountId);
  const jsonPath = path.join(root, "json", "services", svc.slug, "synergy.json");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  const data = {
    mountId: svc.mountId,
    rootClass: svc.rootClass,
    bodyHtml,
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(root, jsonPath));
}

function buildPartial(svc) {
  const jsonPath = path.join(root, "json", "services", svc.slug, "synergy.json");
  if (!fs.existsSync(jsonPath)) {
    writeJsonFromPartial(svc);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const shell = fs.readFileSync(shellPath, "utf8");
  const out =
    (svc.comment || "") +
    shell
      .replace(/__ROOT_CLASS__/g, data.rootClass)
      .replace(/__MOUNT_ID__/g, data.mountId)
      .replace("__BODY_HTML__", data.bodyHtml);
  const outPath = path.join(partialsDir, svc.partial);
  fs.writeFileSync(outPath, out, "utf8");
  console.log("Wrote", path.relative(root, outPath));
}

function main() {
  const extractOnly = process.argv.includes("--extract");
  if (!fs.existsSync(shellPath)) throw new Error(`Нет shell: ${shellPath}`);
  for (const svc of SERVICES) {
    if (extractOnly) writeJsonFromPartial(svc);
    else buildPartial(svc);
  }
}

main();
