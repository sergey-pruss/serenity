#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const layout = read("html/index.layout.html");
const topPartial = read("html/partials/page-main-top.html");
const mobileCss = read("css/css__home-snapshot__overrides.mobile.css");
const app = read("js/app.js");

assert(
  /css__home-snapshot__overrides\.mobile\.css\?v=20260430o/.test(layout),
  "html/index.layout.html: mobile CSS cache-bust должен быть 20260430o",
);
assert(
  /src="\/_sa\/js\/app\.js\?v=20260503revertClientsKeepBlogCta"/.test(layout),
  "html/index.layout.html: app.js cache-bust должен быть 20260503revertClientsKeepBlogCta",
);
assert(
  /rel="preload"[\s\S]*?\/_sa\/css\/sections\/header\.css/.test(layout) &&
    /<noscript><link rel="stylesheet" href="\/_sa\/css\/sections\/header\.css/.test(layout),
  "html/index.layout.html: header.css должен быть preload style с noscript fallback",
);
assert(
  /component-block\[data-v-135dc442\][\s\S]*?display:\s*none\s*!important/.test(layout) &&
    /component-block\[data-v-135dc442\][\s\S]*?display:\s*none\s*!important/.test(mobileCss),
  "mobile critical CSS: декоративный блок героя должен скрываться на <=620px в inline и external CSS",
);
assert(
  /fetchpriority="auto"[\s\S]*?<source[\s\S]*?data-src-mobile="\/_sa\/img\/video__home-hero-lite\.mp4"/.test(topPartial),
  "page-main-top: hero video должен иметь fetchpriority=auto и data-src-mobile",
);
assert(
  /video-mobile-disabled/.test(app) && /isMobileViewport[\s\S]*?return;/.test(app),
  "js/app.js: мобильный hero video должен отключаться после показа постера",
);
assert(
  /document\.hidden/.test(app) && /isStripVisible/.test(app),
  "js/app.js: autoplay ленты клиентов должен останавливаться вне viewport/hidden tab",
);
assert(
  /saveData/.test(app) && /slowNetwork/.test(app) && /allowHydration/.test(app),
  "js/app.js: lazy case video hydration должна учитывать saveData/slow network",
);

const mimes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

function resolveStaticFile(urlPath) {
  let cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  if (cleanPath.startsWith("/_sa/")) cleanPath = `/${cleanPath.slice(5)}`;
  if (cleanPath === "/") return path.join(root, "index.html");
  const candidate = path.join(root, cleanPath.replace(/^\/+/, ""));
  if (!candidate.startsWith(root)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    const indexFile = path.join(candidate, "index.html");
    if (fs.existsSync(indexFile)) return indexFile;
  }
  return null;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const file = resolveStaticFile(req.url || "/");
      if (!file) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.setHeader("Content-Type", mimes[path.extname(file).toLowerCase()] || "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function verifyMobileRuntime() {
  const server = await startServer();
  const { port } = server.address();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const runtimeErrors = [];

  try {
    page.on("pageerror", (err) => runtimeErrors.push(String(err)));
    await page.route("https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.css", (route) =>
      route.fulfill({ status: 200, contentType: "text/css", body: "" }),
    );
    await page.route("https://cdnjs.cloudflare.com/ajax/libs/Swiper/8.4.7/swiper-bundle.min.js", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.Swiper=function(){return {destroy:function(){}}};",
      }),
    );
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(
      () => document.querySelector(".video-block")?.classList.contains("video-mobile-disabled"),
      { timeout: 10000 },
    );
    const state = await page.evaluate(() => {
      const block = document.querySelector(".video-block");
      const video = block?.querySelector("video.video-iframe");
      const source = video?.querySelector("source");
      return {
        disabled: block?.classList.contains("video-mobile-disabled") || false,
        loading: block?.classList.contains("is-loading") || false,
        sourceSrc: source?.getAttribute("src") || "",
        sourceDataSrc: source?.getAttribute("data-src") || "",
        sourceDataSrcMobile: source?.getAttribute("data-src-mobile") || "",
        currentSrc: video?.currentSrc || "",
      };
    });
    assert(state.disabled, "runtime mobile: hero video должен получить video-mobile-disabled");
    assert(!state.loading, "runtime mobile: is-loading должен сниматься после отключения видео");
    assert(!state.sourceSrc && !state.currentSrc, `runtime mobile: video не должен гидрировать mp4, got ${JSON.stringify(state)}`);
    assert(state.sourceDataSrc && state.sourceDataSrcMobile, "runtime mobile: data-src должны остаться негидрированными");
    assert(runtimeErrors.length === 0, `runtime mobile: JS errors:\n${runtimeErrors.join("\n")}`);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  await verifyMobileRuntime();
  console.log("OK: mobile optimization contract passed");
})().catch((error) => {
  console.error(`mobile optimization check failed:\n${error.stack || error.message}`);
  process.exit(1);
});
