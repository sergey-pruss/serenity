#!/usr/bin/env node
/**
 * Кейсы (more-case-wr): json/services/<slug>/more-cases.json → partial.
 * Разметка целиком в bodyHtml (секция page-constructor__section).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const shellPath = path.join(root, "html", "partials", "services", "_service-more-cases.shell.html");
const partialsDir = path.join(root, "html", "partials", "services");

const SERVICES = [
  {
    slug: "kontekstnaya_reklama",
    partial: "more-cases-kontekstnaya-from-services.html",
    comment:
      "<!-- Кейсы: json/services/kontekstnaya_reklama/more-cases.json (листинг /services/). -->\n",
  },
  {
    slug: "targeting",
    partial: "more-cases-targeting.html",
    comment: "<!-- Кейсы targeting: json/services/targeting/more-cases.json (prod capture). -->\n",
  },
  {
    slug: "marketing",
    partial: "more-cases-marketing.html",
    comment: "<!-- Кейсы marketing: json/services/marketing/more-cases.json. -->\n",
  },
];

function stripLeadingComment(html) {
  return html.replace(/^<!--[\s\S]*?-->\s*/, "").trim();
}

function extractBodyFromPartial(partialPath) {
  const html = fs.readFileSync(partialPath, "utf8");
  return stripLeadingComment(html);
}

function writeJsonFromPartial(svc) {
  const partialPath = path.join(partialsDir, svc.partial);
  if (!fs.existsSync(partialPath)) {
    throw new Error(`Нет partial: ${partialPath}`);
  }
  const bodyHtml = extractBodyFromPartial(partialPath);
  const jsonPath = path.join(root, "json", "services", svc.slug, "more-cases.json");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  const data = { bodyHtml };
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(root, jsonPath));
}

function buildPartial(svc) {
  const jsonPath = path.join(root, "json", "services", svc.slug, "more-cases.json");
  if (!fs.existsSync(jsonPath)) {
    writeJsonFromPartial(svc);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!data.bodyHtml) {
    throw new Error(`${jsonPath}: нужен bodyHtml`);
  }
  const shell = fs.readFileSync(shellPath, "utf8");
  const out = (svc.comment || "") + shell.replace("__BODY_HTML__", data.bodyHtml.trim());
  const outPath = path.join(partialsDir, svc.partial);
  fs.writeFileSync(outPath, `${out.trim()}\n`, "utf8");
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
