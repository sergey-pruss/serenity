#!/usr/bin/env node
/**
 * Канон URL услуг на статике: без завершающего слэша (sitemap, canonical, href, nginx).
 * Запуск: node scripts/verify-service-page-urls.cjs
 * С продом после выкладки: ORIGIN=https://serenity.agency node scripts/verify-service-page-urls.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const services = [
  { slug: "targeting", path: "/targeting" },
  { slug: "kontekstnaya_reklama", path: "/kontekstnaya_reklama" },
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

async function main() {
  const canonUrl = (p) => `https://serenity.agency${p}`;

  for (const { slug, path: canonPath } of services) {
    const slashPath = `${canonPath}/`;
    const html = read(`${slug}/index.html`);
    const url = canonUrl(canonPath);
    assert(
      html.includes(`rel="canonical" href="${url}"`) || html.includes(`content="${url}"`),
      `${slug}/index.html: canonical/og на ${url}`,
    );
    assert(!html.includes(canonUrl(slashPath)), `${slug}: URL со слэшем в canonical/og запрещён`);

    const sitemap = read("sitemap.xml");
    assert(sitemap.includes(`<loc>${url}</loc>`), `sitemap: ${canonPath}`);
    assert(!sitemap.includes(`<loc>${canonUrl(slashPath)}</loc>`), `sitemap: ${slashPath} запрещён`);

    const cfg = JSON.parse(read(`json/services/${slug}/service.config.json`));
    assert(cfg.urlPath === canonPath, `service.config.json urlPath для ${slug}`);
  }

  const indexHtml = read("index.html");
  assert(indexHtml.includes('href="/targeting"'), "index.html: ссылка /targeting");
  assert(!indexHtml.includes('href="/targeting/"'), "index.html: без /targeting/");
  assert(indexHtml.includes('href="/kontekstnaya_reklama"'), "index.html: ссылка kontekstnaya");
  assert(!indexHtml.includes('href="/kontekstnaya_reklama/"'), "index.html: без kontekstnaya со слэшем");

  const origin = process.env.ORIGIN?.replace(/\/+$/, "");
  if (origin) {
    const check = async (urlPath, expectStatus, locationSuffix) => {
      const res = await fetch(`${origin}${urlPath}`, { redirect: "manual" });
      assert(res.status === expectStatus, `${urlPath}: ожидали HTTP ${expectStatus}, получили ${res.status}`);
      if (locationSuffix) {
        const loc = res.headers.get("location") || "";
        assert(loc.includes(locationSuffix), `${urlPath}: Location ${loc} не содержит ${locationSuffix}`);
      }
    };
    for (const { path: canonPath } of services) {
      await check(canonPath, 200);
      await check(`${canonPath}/`, 301, canonPath);
      await check(`${canonPath}/index.html`, 301, canonPath);
    }
    console.log(`OK: live HTTP checks on ${origin}`);
  }

  console.log("OK: service page URL invariants (files" + (origin ? " + origin" : "") + ").");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
