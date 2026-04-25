/**
 * Поведение CTA «Оставить заявку» (header, меню, нижний .btns).
 * Запуск: npm run test:leave-cta
 * URL: env LEAVE_CTA_TEST_BASE_URL или http://127.0.0.1:18765/
 */
const { chromium } = require("playwright");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const base = process.env.LEAVE_CTA_TEST_BASE_URL || "http://127.0.0.1:18765/";

(async () => {
  const browser = await chromium.launch();
  try {
    {
      const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("header.header", { state: "attached", timeout: 20_000 });
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(400);

      const [popup1] = await Promise.all([
        page.waitForEvent("popup", { timeout: 15_000 }),
        page.click("#body.body-application .application", { force: true }),
      ]);
      const u1 = popup1.url();
      assert(u1.includes("serenity.agency") && u1.includes("contacts"), `Ожидался contacts, получено: ${u1}`);
      await popup1.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("header .menu-icon", { state: "attached", timeout: 20_000 });
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(400);
      await page.click("header .menu-icon", { force: true });
      await page.waitForTimeout(400);
      const [popup2] = await Promise.all([
        page.waitForEvent("popup", { timeout: 15_000 }),
        page.click("header button.navigation-new__button", { force: true }),
      ]);
      const u2 = popup2.url();
      assert(u2.includes("serenity.agency") && u2.includes("contacts"), `Меню: ожидался contacts, получено: ${u2}`);
      await popup2.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector(".btns__item_open", { state: "attached", timeout: 20_000 });
      await page.click(".btns__item_open", { force: true });
      await page.waitForTimeout(400);
      const { wrapActive, modalActive, dy } = await page.evaluate(() => {
        const wrap = document.querySelector(".btns.white");
        const modal = wrap?.nextElementSibling;
        const t = modal ? getComputedStyle(modal).transform : "none";
        let f = 999;
        if (t && t !== "none" && t.startsWith("matrix")) {
          const p = t.match(/matrix\(([^)]+)\)/)?.[1]?.split(/,\s*/);
          f = p ? Math.abs(parseFloat(p[5]) || 0) : 999;
        }
        return { wrapActive: wrap?.classList.contains("active"), modalActive: modal?.classList?.contains("active"), dy: f };
      });
      assert(wrapActive && modalActive, "После клика ожидались .btns.active и .btns__modal.active");
      assert(dy < 2, `Модалка вверху: ожидался translateY(0), matrix[5]≈0, сейчас dy=${dy}`);

      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const closed = await page.evaluate(() => {
        const wrap = document.querySelector(".btns.white");
        const modal = wrap?.nextElementSibling;
        return !wrap?.classList.contains("active") && !modal?.classList.contains("active");
      });
      assert(closed, "По Esc нижняя панель должна закрыться");
    }
  } finally {
    await browser.close();
  }
  console.log("ok: leave-request-cta (desktop popup, меню, моб. лист, Esc)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
