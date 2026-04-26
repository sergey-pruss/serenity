/**
 * Поведение CTA «Оставить заявку»:
 * - desktop: локальный order-popup,
 * - mobile: нижний .btns лист.
 * Запуск: npm run test:leave-cta
 * URL: env LEAVE_CTA_TEST_BASE_URL или http://127.0.0.1:8765/ (см. npm run dev)
 */
const { chromium } = require("playwright");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const readSheet = async (page) =>
  page.evaluate(() => {
    const wrap = document.querySelector(".btns.white");
    const modal = wrap?.nextElementSibling;
    return {
      bodyFlag: document.body.classList.contains("leave-cta-open"),
      wrapActive: wrap?.classList.contains("active") ?? false,
      modalActive: modal?.classList?.contains("active") ?? false,
    };
  });

const readDesktopModal = async (page) =>
  page.evaluate(() => {
    const modal = document.querySelector("#desktop-order-popup.modal.order-popup");
    return {
      bodyFlag: document.body.classList.contains("order-popup-open"),
      exists: !!modal,
      className: modal?.className || null,
    };
  });

const base = process.env.LEAVE_CTA_TEST_BASE_URL || "http://127.0.0.1:8765/";

(async () => {
  const browser = await chromium.launch();
  try {
    {
      const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      let popupFired = false;
      page.on("popup", () => {
        popupFired = true;
      });
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("header.header", { state: "attached", timeout: 20_000 });
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(400);
      await page.click("#body.body-application .application", { force: true });
      await page.waitForTimeout(400);
      const d = await readDesktopModal(page);
      assert(d.exists && d.bodyFlag, "Десктоп: после клика CTA должен открываться локальный order-popup");
      assert(d.className?.includes("newModal"), "Десктоп: ожидается класс newModal у order-popup");
      const formShape = await page.evaluate(() => {
        const modal = document.querySelector("#desktop-order-popup");
        return {
          hasForm: !!modal?.querySelector("form.order-popup__form"),
          title: modal?.querySelector("h2")?.textContent?.trim() || "",
          hasPrivacy: !!modal?.querySelector(".privacy-check"),
          requiredCount: modal ? modal.querySelectorAll('input[name=\"name\"], input[name=\"phone\"]').length : 0,
        };
      });
      assert(formShape.hasForm, "Десктоп: в popup должна быть форма");
      assert(formShape.title.includes("Хочу работать"), "Десктоп: заголовок модалки должен совпадать");
      assert(formShape.hasPrivacy, "Десктоп: должен быть блок согласия privacy-check");
      assert(formShape.requiredCount === 2, "Десктоп: ожидаются поля name и phone");

      await page.click("#desktop-order-popup .form__submit", { force: true });
      await page.waitForTimeout(200);
      const invalid = await page.evaluate(() => ({
        nameInvalid: !!document.querySelector('#desktop-order-popup input[name=\"name\"].is-invalid'),
        phoneInvalid: !!document.querySelector('#desktop-order-popup input[name=\"phone\"].is-invalid'),
      }));
      assert(invalid.nameInvalid && invalid.phoneInvalid, "Пустой submit должен подсветить обязательные поля");
      assert(!popupFired, "Не должно открываться нового окна на внешний сайт");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const closed = await readDesktopModal(page);
      assert(!closed.exists && !closed.bodyFlag, "Десктоп order-popup должен закрываться по Esc");
    }

    {
      const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      let popupFired = false;
      page.on("popup", () => {
        popupFired = true;
      });
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("header .menu-icon", { state: "attached", timeout: 20_000 });
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(400);
      await page.click("header .menu-icon", { force: true });
      await page.waitForTimeout(500);
      await page.click("header button.navigation-new__button", { force: true });
      await page.waitForTimeout(500);
      const d = await readDesktopModal(page);
      assert(d.exists && d.bodyFlag, "Кнопка в полноэкранном меню должна открывать desktop order-popup");
      assert(!popupFired, "Не должно открываться нового окна");
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
  console.log("ok: leave-request-cta (desktop order-popup, menu CTA, mobile sheet, Esc, no popup)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
