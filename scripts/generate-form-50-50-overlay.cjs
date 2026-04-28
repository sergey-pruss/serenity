/**
 * Снимок для сравнения мобильной формы: оригинал vs стейджинг.
 * Результат (после запуска смотри в папке compare/):
 *   compare/form-mobile-side-by-side.png — слева оригинал, справа наш
 *   compare/form-mobile-blend-50.png      — одно изображение, 50% наложение (PIL Image.blend)
 *
 * Запуск: npm run capture:form-parity
 * Требуется: npx playwright install chromium, python3 + Pillow (pip install pillow)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");

const ORIGIN = "https://serenity.agency/";
const STAGING = "https://serenity.sergeyprus.workers.dev/";
const VIEWPORT = { width: 390, height: 844 };
const OUT_DIR = path.join(__dirname, "..", "compare");
const TMP_ORIG = path.join(OUT_DIR, "_tmp_origin.png");
const TMP_STG = path.join(OUT_DIR, "_tmp_staging.png");
const OUT_SIDE = path.join(OUT_DIR, "form-mobile-side-by-side.png");
const OUT_BLEND = path.join(OUT_DIR, "form-mobile-blend-50.png");

const ORDER_MODAL_SEL = ".modal.order-popup";

async function openOriginForm(page) {
  await page.goto(ORIGIN, { waitUntil: "load", timeout: 90_000 });
  await page.setViewportSize(VIEWPORT);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(900);
  await page.locator(".btns.white .btns__item_open").click({ force: true });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const a = [...document.querySelectorAll(".btns__modal a")].find((x) =>
      (x.textContent || "").includes("Отправить заявку"),
    );
    a?.click();
  });
  await page.waitForSelector(ORDER_MODAL_SEL, { state: "visible", timeout: 25_000 });
  await page.waitForTimeout(500);
}

async function openStagingForm(page) {
  await page.goto(STAGING, { waitUntil: "load", timeout: 90_000 });
  await page.setViewportSize(VIEWPORT);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(600);
  await page.locator("#body.body-application .footer__link.application").click({ force: true });
  await page.waitForSelector("#desktop-order-popup", { state: "visible", timeout: 25_000 });
  await page.waitForTimeout(500);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page1 = await browser.newPage();
    await openOriginForm(page1);
    await page1.screenshot({ path: TMP_ORIG, type: "png" });
    await page1.close();

    const page2 = await browser.newPage();
    await openStagingForm(page2);
    await page2.screenshot({ path: TMP_STG, type: "png" });
    await page2.close();
  } finally {
    await browser.close();
  }

  const esc = (p) => p.replace(/\\/g, "/");
  const py = `
from PIL import Image, ImageDraw, ImageFont

w, h = ${VIEWPORT.width}, ${VIEWPORT.height}
orig = Image.open(r"""${esc(TMP_ORIG)}""").convert("RGBA")
stg = Image.open(r"""${esc(TMP_STG)}""").convert("RGBA")
orig = orig.resize((w, h), Image.LANCZOS)
stg = stg.resize((w, h), Image.LANCZOS)

side = Image.new("RGBA", (w * 2 + 4, h + 36), (24, 24, 26, 255))
side.paste(orig, (0, 36))
side.paste(stg, (w + 4, 36))
d = ImageDraw.Draw(side)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)
except Exception:
    font = ImageFont.load_default()
d.text((8, 10), "serenity.agency", fill=(220, 220, 220), font=font)
d.text((w + 12, 10), "serenity.sergeyprus.workers.dev", fill=(220, 220, 220), font=font)
d.rectangle([(w, 36), (w + 3, h + 36)], fill=(255, 60, 60, 255))
side.save(r"""${esc(OUT_SIDE)}""")

blend = Image.blend(orig, stg, 0.5)
blend.save(r"""${esc(OUT_BLEND)}""")
print("ok")
`;
  const r = spawnSync("python3", ["-c", py], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error("Python/Pillow: pip install pillow");
  }

  for (const f of [TMP_ORIG, TMP_STG]) {
    try {
      fs.unlinkSync(f);
    } catch (_) {
      /* ignore */
    }
  }

  console.log("Готово (абсолютные пути):");
  console.log(fs.realpathSync(OUT_SIDE));
  console.log(fs.realpathSync(OUT_BLEND));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
