#!/usr/bin/env node
/**
 * FAQ услуг: общая оболочка (_service-faq.shell.html) + контент json/services/<slug>/faq.json.
 */
const fs = require("fs");
const path = require("path");
const {
  extractFaqPairsFromHtml,
  syncFaqBodyHtmlJsonLd,
  stripNuxtScopedAttrs,
} = require("./lib/build-faq-page-jsonld.cjs");

const root = path.resolve(__dirname, "..");
const shellPath = path.join(root, "html", "partials", "services", "_service-faq.shell.html");
const partialsDir = path.join(root, "html", "partials", "services");

const SERVICES = [
  {
    slug: "kontekstnaya_reklama",
    partial: "faq-kontekstnaya-reklama.html",
    mountId: "kontekst-faq-mounted",
    sectionClass: "kontekst-faq-section",
    rootClass: "kontekst-faq-root kontekst-faq-root--always-visible",
    comment: "<!-- FAQ «Вопрос-ответ»: partial + css/sections/service-faq.css. -->\n",
  },
  {
    slug: "targeting",
    partial: "faq-targeting.html",
    mountId: "targeting-faq-mounted",
    sectionClass: "targeting-faq-section",
    rootClass: "targeting-faq-root targeting-faq-root--always-visible",
    comment: "<!-- FAQ targeting: json/services/targeting/faq.json + service-faq.css. -->\n",
  },
  {
    slug: "marketing",
    partial: "faq-marketing.html",
    mountId: "targeting-faq-mounted",
    sectionClass: "targeting-faq-section",
    rootClass: "targeting-faq-root",
    comment: "<!-- FAQ marketing: json/services/marketing/faq.json + service-faq.css. -->\n",
  },
  {
    slug: "korporativnyj_sajt",
    partial: "faq-korporativnyj-sajt.html",
    mountId: "korporativnyj-faq-mounted",
    sectionClass: "korporativnyj-faq-section",
    rootClass: "korporativnyj-faq-root korporativnyj-faq-root--always-visible",
    comment: "<!-- FAQ korporativnyj_sajt: json/services/korporativnyj_sajt/faq.json + service-faq.css. -->\n",
  },
  {
    slug: "sozdanie-internet-magazina",
    partial: "faq-sozdanie-internet-magazina.html",
    mountId: "korporativnyj-faq-mounted",
    sectionClass: "korporativnyj-faq-section",
    rootClass: "korporativnyj-faq-root korporativnyj-faq-root--always-visible",
    comment:
      "<!-- FAQ sozdanie-internet-magazina: json/services/sozdanie-internet-magazina/faq.json + service-faq.css. -->\n",
  },
  {
    slug: "seo",
    partial: "faq-seo.html",
    mountId: "korporativnyj-faq-mounted",
    sectionClass: "korporativnyj-faq-section",
    rootClass: "korporativnyj-faq-root korporativnyj-faq-root--always-visible",
    comment:
      "<!-- FAQ seo: json/services/seo/faq.json + service-faq.css (дизайн kompleksnoye/korporativnyj). -->\n",
  },
  {
    slug: "prodvizhenie-yandex-karty-2gis",
    partial: "faq-prodvizhenie-yandex-karty-2gis.html",
    mountId: "kontekst-faq-mounted",
    sectionClass: "kontekst-faq-section",
    rootClass: "kontekst-faq-root kontekst-faq-root--always-visible",
    comment:
      "<!-- FAQ prodvizhenie-yandex-karty-2gis: json/services/prodvizhenie-yandex-karty-2gis/faq.json + service-faq.css. -->\n",
  },
  {
    slug: "prodvizhenie-statey-v-dzene-i-promostranitsah",
    partial: "faq-prodvizhenie-statey-v-dzene-i-promostranitsah.html",
    mountId: "kontekst-faq-mounted",
    sectionClass: "kontekst-faq-section",
    rootClass: "kontekst-faq-root kontekst-faq-root--always-visible",
    comment:
      "<!-- FAQ prodvizhenie-statey-v-dzene-i-promostranitsah: json/services/prodvizhenie-statey-v-dzene-i-promostranitsah/faq.json + service-faq.css. -->\n",
  },
  {
    slug: "tehnicheskaya-podderzhka-saita",
    partial: "faq-tehnicheskaya-podderzhka-saita.html",
    mountId: "tehpod-faq-mounted",
    sectionClass: "tehpod-faq-section",
    rootClass: "tehpod-faq-root tehpod-faq-root--always-visible",
    comment:
      "<!-- FAQ tehnicheskaya-podderzhka-saita: json/services/tehnicheskaya-podderzhka-saita/faq.json + service-faq.css. -->\n",
  },
  {
    slug: "lending_na_tilda",
    partial: "faq-lending-na-tilda.html",
    mountId: "lending-tilda-faq-mounted",
    sectionClass: "lending-tilda-faq-section korporativnyj-faq-section",
    rootClass: "lending-tilda-faq-root korporativnyj-faq-root korporativnyj-faq-root--always-visible",
    comment:
      "<!-- FAQ lending_na_tilda: json/services/lending_na_tilda/faq.json + service-faq.css. -->\n",
  },
];

function extractBodyFromPartial(html, mountId) {
  const openRe = new RegExp(`<div id="${mountId}"[^>]*>`, "i");
  const m = html.match(openRe);
  if (!m) throw new Error(`mount #${mountId} не найден`);
  const start = m.index + m[0].length;
  const scriptClose = html.indexOf("</script>", start);
  if (scriptClose < 0) throw new Error("нет </script> в FAQ partial");
  return html.slice(start, scriptClose + "</script>".length).trim();
}

function writeJsonFromPartial(svc) {
  const partialPath = path.join(partialsDir, svc.partial);
  const html = fs.readFileSync(partialPath, "utf8");
  const bodyHtml = extractBodyFromPartial(html, svc.mountId);
  const jsonPath = path.join(root, "json", "services", svc.slug, "faq.json");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  const data = {
    mountId: svc.mountId,
    sectionClass: svc.sectionClass,
    rootClass: svc.rootClass,
    bodyHtml,
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(root, jsonPath));
}

function buildPartial(svc) {
  const jsonPath = path.join(root, "json", "services", svc.slug, "faq.json");
  if (!fs.existsSync(jsonPath)) {
    writeJsonFromPartial(svc);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const bodyHtml = stripNuxtScopedAttrs(syncFaqBodyHtmlJsonLd(data.bodyHtml));
  if (bodyHtml !== data.bodyHtml) {
    data.bodyHtml = bodyHtml;
    fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log("Synced FAQPage JSON-LD in", path.relative(root, jsonPath));
  }
  const shell = fs.readFileSync(shellPath, "utf8");
  const out =
    (svc.comment || "") +
    shell
      .replace(/__SECTION_CLASS__/g, data.sectionClass)
      .replace(/__MOUNT_ID__/g, data.mountId)
      .replace(/__ROOT_CLASS__/g, data.rootClass)
      .replace("__BODY_HTML__", bodyHtml);
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
