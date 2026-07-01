#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const slug = "lending_na_tilda";
const baseDir = path.join(root, "img", "services", slug);

const files = [
  {
    url: "https://serenity.agency/storage/jw2wR7TNbDigxIlZYL67Y2ww0ZeybUcSMT4Uhiiu.mp4",
    dest: "hero/hero-desktop.mp4",
  },
  {
    url: "https://serenity.agency/storage/CzTCT5MVedd0CHWMhWL2Q7CmUvO4uHwJZ8qdWheK.mp4",
    dest: "hero/hero-mobile.mp4",
  },
  {
    url: "https://serenity.agency/storage/sgayOz09zOkVdsCkJ2f95nRDA2qrtc6kkMi9oJGk.png",
    dest: "approach/illustration.png",
  },
  {
    url: "https://serenity.agency/storage/BEi2CgRKMh2ijtBgOVCXeaY8bd6Hx0acAg1EymMa.webp",
    dest: "cases/bez-ramok-bg.webp",
  },
  {
    url: "https://serenity.agency/storage/XllxV3BzEjZss8VdEyZ7aJztVlVOTxw2TOUMw9Ky.mp4",
    dest: "cases/bez-ramok-video.mp4",
  },
  {
    url: "https://serenity.agency/storage/Uu4Xagz0O6M36vmfTxeuFpzEvR0wi914ohSfW2da.webp",
    dest: "cases/voice-bg.webp",
  },
  {
    url: "https://serenity.agency/storage/FUs06yU0NKEMJBumbYwvtNClsKtiKQFYJSxGGpK0.mp4",
    dest: "cases/voice-video.mp4",
  },
  {
    url: "https://serenity.agency/storage/evCP2cdqsMYBTKhk3qZVhMQVIScIDrA95ZbISyjt.webp",
    dest: "cases/ihelp-pro-bg.webp",
  },
  {
    url: "https://serenity.agency/storage/C8gNuPThKhoGCBe5ITRaJnxhO1iPHBE9BKCevODA.mp4",
    dest: "cases/ihelp-pro-video.mp4",
  },
];

async function download(url, dest) {
  const full = path.join(baseDir, dest);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(full, buf);
  console.log("ok", dest, `(${Math.round(buf.length / 1024)} KB)`);
}

async function main() {
  for (const f of files) await download(f.url, f.dest);
  console.log("download-lending-na-tilda-assets: done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
