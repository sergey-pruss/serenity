#!/usr/bin/env node
/**
 * Починка publish/index.html: убрать <base> (он ломает локальный роутинг и уводит на прод)
 * и абсолютизировать только пути статики (_nuxt, fonts, …).
 *
 * MIRROR_STRIP_TRACKERS=1 — опционально убрать сторонние счётчики; по умолчанию не трогаем.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  stripBaseTag,
  fixMirrorTypos,
  absolutizeStaticAssets,
  injectWebpackPublicPath,
  stripFontPreloadCrossorigin,
  rewriteSvgsetToLocal,
  relaxMirrorHeader,
  injectMirrorDesktopNavFix,
  injectMirrorBandArtifactFix,
  stripMirrorTrackers,
} from "./asset-urls.mjs";
import { writeSvgsetFromOrigin } from "./fetch-svgset.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "publish", "index.html");
const publishDir = path.join(__dirname, "..", "publish");
const origin = (process.env.CAPTURE_BASE_HREF || "https://serenity.agency").replace(/\/+$/, "");

let html = fs.readFileSync(file, "utf8");
html = stripBaseTag(html);
if (process.env.MIRROR_STRIP_TRACKERS === "1") html = stripMirrorTrackers(html);
html = absolutizeStaticAssets(html, origin);
html = injectWebpackPublicPath(html, origin);
html = stripFontPreloadCrossorigin(html);
html = rewriteSvgsetToLocal(html, origin);
html = relaxMirrorHeader(html);
html = injectMirrorDesktopNavFix(html);
html = injectMirrorBandArtifactFix(html);
fs.writeFileSync(file, html, "utf8");
try {
  await writeSvgsetFromOrigin(origin, path.join(publishDir, "svgset.svg"));
  console.log("OK: svgset.svg");
} catch (e) {
  console.warn("svgset.svg:", e.message);
}
console.log("OK:", file);
