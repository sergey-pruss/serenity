#!/usr/bin/env node
/**
 * Постер + webp-фон и сжатый mp4 для слайда La vivion (/sozdanie-internet-magazina).
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const ff = require("@ffmpeg-installer/ffmpeg").path;
const src =
  process.env.LAVIVION_SOURCE ||
  path.join(process.env.USERPROFILE || "", "Downloads", "la vivion скринкаст (интернет-магазин).mov");
const posterPng = path.join(root, "tmp", "lavivion-case-poster.png");
const outMp4 = path.join(root, "video", "services", "sozdanie-internet-magazina", "lavivion-case.mp4");
const outWebp = path.join(root, "img", "services", "sozdanie-internet-magazina", "cases", "lavivion-bg.webp");
const crf = process.env.LAVIVION_WEB_CRF || "23";
const posterSs = process.env.LAVIVION_POSTER_SS || "00:00:08";

if (!fs.existsSync(src)) {
  console.error("Источник не найден:", src);
  process.exit(1);
}
if (!fs.existsSync(ff)) {
  console.error("ffmpeg не найден:", ff);
  process.exit(1);
}

fs.mkdirSync(path.dirname(posterPng), { recursive: true });
fs.mkdirSync(path.dirname(outMp4), { recursive: true });
fs.mkdirSync(path.dirname(outWebp), { recursive: true });

console.log("Постер из", src, "(@", posterSs, ")");
execFileSync(ff, ["-y", "-i", src, "-ss", posterSs, "-vframes", "1", posterPng], { stdio: "inherit" });

console.log("Кодирую mp4 →", outMp4, `(CRF ${crf})`);
execFileSync(
  ff,
  [
    "-y",
    "-i",
    src,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    "-vf",
    "scale='min(906,iw)':-2",
    outMp4,
  ],
  { stdio: "inherit" },
);

execFileSync(ff, ["-v", "error", "-i", outMp4, "-f", "null", "-"], { stdio: "inherit" });

const sharp = require("sharp");
sharp(posterPng)
  .resize({ width: 1920, withoutEnlargement: true })
  .modulate({ brightness: 0.52, saturation: 0.92 })
  .webp({ quality: 78 })
  .toFile(outWebp)
  .then(() => {
    const mp4Size = fs.statSync(outMp4).size;
    const webpSize = fs.statSync(outWebp).size;
    console.log("ok mp4", (mp4Size / 1024 / 1024).toFixed(2), "MB");
    console.log("ok webp", (webpSize / 1024).toFixed(0), "KB →", path.relative(root, outWebp));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
