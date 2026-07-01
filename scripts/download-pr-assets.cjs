#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const baseDir = path.join(root, "img", "services", "pr");

const files = [
  { url: "https://serenity.agency/storage/m2SZFXF6C6LyUVrjR2n67q9f0clD57TKaxdzkocs.webp", dest: "hero/hero.webp" },
  { url: "https://serenity.agency/storage/RUOogYb5Cbah2HtMhbo41DZkYmiHOEI0hrfYe600.webp", dest: "hero/hero__m.webp" },
  { url: "https://serenity.agency/storage/R4hEcrEhw2nVVsDO9gz7xE6JAAOU3TiehbkEk3JU.png", dest: "strategy/illustration.png" },
  { url: "https://serenity.agency/storage/OO6VEyHovXKbTRuf4hcBkIk42ofN8T3qXufqg2RB.png", dest: "advantages/icon-years.png" },
  { url: "https://serenity.agency/storage/T3ZhwskUfMFRrkHEFVpcgLJ4Ebxy4FzGrCUsOq8C.png", dest: "advantages/icon-clients.png" },
  { url: "https://serenity.agency/storage/q7ObvVlp1kguuWXF2OxWogGA48alazPdRDZqMSPK.png", dest: "advantages/icon-rank.png" },
  { url: "https://serenity.agency/storage/W2rBdB0u3wfhjujueHqXBODzhtASP2xQCF6QzsSZ.webp", dest: "cases/idet-shou-bg.webp" },
  { url: "https://serenity.agency/storage/cKTx3BR2gqe32SWkJcy9SDttRSICwP2y238nUGLV.webp", dest: "cases/idet-shou-slide.webp" },
  { url: "https://serenity.agency/storage/QrqPlrztGzMBMMzw1Af9avVzmkh0Cpfkfv4u0ZQX.webp", dest: "cases/digitale-bg.webp" },
  { url: "https://serenity.agency/storage/gOpPt2ZRVXbQ0JrhyHY8H89V0psYbZVmPfjo0AqO.webp", dest: "cases/digitale-slide.webp" },
  { url: "https://serenity.agency/storage/fHePCBwbc2bmKVfxwPvUNOBHCBw1Xs0NutAQgx2C.webp", dest: "cases/urban-boris-bg.webp" },
  { url: "https://serenity.agency/storage/m30JrnHIPA61MjlvZqclOgSVlyBYCZnIXAPlYxU5.webp", dest: "cases/urban-boris-slide.webp" },
  { url: "https://serenity.agency/storage/EEAspDu5sORTqmjWPRJmxT23FtdkztYRvW6bfN5G.webp", dest: "cases/help-center-bg.webp" },
  { url: "https://serenity.agency/storage/7bZ4LOhQKIb40DNSwEh00D0Tb81aCDWFkkV29mcJ.webp", dest: "cases/help-center-slide.webp" },
  { url: "https://serenity.agency/storage/Z917QVGBMHrOdTrfNpieYhwtcZX356qH9Mcwv4zq.webp", dest: "cases/gio-wellness-bg.webp" },
  { url: "https://serenity.agency/storage/JKMTtmjaf42B1wMbnGim3g0FpeIgeyuHIf2tbAn7.mp4", dest: "cases/gio-wellness-video.mp4" },
  { url: "https://serenity.agency/storage/Zg38DO5GnZMfdnkgRfm6ubd4Y0FOVVPXgZqH3Dmi.webp", dest: "cases/osnova-bg.webp" },
  { url: "https://serenity.agency/storage/ovGZaJ3gHGhPu58H68QZBzb9ZKjcMlOYBDg10RuH.webp", dest: "cases/osnova-slide.webp" },
  { url: "https://serenity.agency/storage/NO2ApogyXILOcyoK4X7BZBOmJgdrPH5N07L7kcWV.png", dest: "team/marketer.png" },
  { url: "https://serenity.agency/storage/lAUqfNrVDCerOVjNDDIo9rO2dKxppgACBvOSOKC7.png", dest: "team/project-manager.png" },
  { url: "https://serenity.agency/storage/4M6erOidPr77djLpxISP1WkrXstnxmTSNRzpIxtf.png", dest: "team/strategist.png" },
  { url: "https://serenity.agency/storage/e3aU9vJISKph8aboLDjMi53fWxme9YMUhPNQOw6k.png", dest: "team/pr-manager.png" },
  { url: "https://serenity.agency/storage/BoKBOHbWBHNwmgZCprOnl0v0YBT4SXZHAcLbXhoo.png", dest: "team/copywriter.png" },
  { url: "https://serenity.agency/storage/11iWUPE8YjbzkfiJEbgKftlCaUJ3yOMuAH2i7yvM.png", dest: "team/leader.png" },
  { url: "https://serenity.agency/storage/W4rGTPQCrD1ma0xtOnhvmKGSJPytWTLhy394z4B6.png", dest: "synergy/content-desc.png" },
  { url: "https://serenity.agency/storage/LyenrN60o407eA92b6oqKKsGuUa4bKNosSIclRwL.png", dest: "synergy/content-tablet.png" },
  { url: "https://serenity.agency/storage/TwxujPPcAVrXC8IFAATCj4CsPW50ttq1OIrQQ6YA.png", dest: "synergy/content-mobile.png" },
];

async function download(url, dest) {
  const full = path.join(baseDir, dest);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (fs.existsSync(full) && fs.statSync(full).size > 0) {
    console.log("skip", dest);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(full, buf);
  console.log("ok", dest, `(${Math.round(buf.length / 1024)} KB)`);
}

async function main() {
  for (const f of files) await download(f.url, f.dest);
  console.log("download-pr-assets: done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
