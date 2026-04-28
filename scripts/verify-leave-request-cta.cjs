/**
 * Поведение CTA «Оставить заявку»:
 * - desktop: локальный order-popup,
 * - mobile: тот же #desktop-order-popup, без нижнего .btns листа.
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
      const pageScrollBeforeOpen = await page.evaluate(() => window.scrollY);
      await page.click("#body.body-application .application", { force: true });
      await page.waitForTimeout(400);
      const d = await readDesktopModal(page);
      assert(d.exists && d.bodyFlag, "Десктоп: после клика CTA должен открываться локальный order-popup");
      assert(d.className?.includes("newModal"), "Десктоп: ожидается класс newModal у order-popup");
      const formShape = await page.evaluate(() => {
        const modal = document.querySelector("#desktop-order-popup");
        const firstMessengerLink = modal?.querySelector(".contact-form__messenger-links a");
        const firstMessengerIcon = modal?.querySelector(".contact-form__messenger-links img");
        const linkRect = firstMessengerLink?.getBoundingClientRect();
        const iconRect = firstMessengerIcon?.getBoundingClientRect();
        const rect = (el) => {
          const r = el?.getBoundingClientRect();
          return r ? { y: r.y, bottom: r.bottom, height: r.height } : null;
        };
        const modalRect = rect(modal);
        const innerRect = rect(modal?.querySelector(".order-popup__inner"));
        const formRect = rect(modal?.querySelector(".form-wrap"));
        const messengerRect = rect(modal?.querySelector(".contact-form__messenger"));
        return {
          hasForm: !!modal?.querySelector("form.order-popup__form"),
          title: modal?.querySelector("h2")?.textContent?.trim() || "",
          lead: modal?.querySelector(".lead")?.textContent?.trim().replace(/\s+/g, " ") || "",
          htmlFlag: document.documentElement.classList.contains("order-popup-open"),
          htmlOverflow: getComputedStyle(document.documentElement).overflow,
          bodyOverflow: getComputedStyle(document.body).overflow,
          pageScrollY: window.scrollY,
          bodyPosition: getComputedStyle(document.body).position,
          modalOverflowY: modal ? getComputedStyle(modal).overflowY : "",
          modalIsScrollable: modal?.classList.contains("is-scrollable") ?? false,
          modalClientHeight: modal?.clientHeight ?? 0,
          modalScrollHeight: modal?.scrollHeight ?? 0,
          hasPrivacy: !!modal?.querySelector(".privacy-check"),
          privacyChecked: !!modal?.querySelector(".privacy-check__control")?.checked,
          requiredCount: modal ? modal.querySelectorAll('input[name=\"name\"], input[name=\"phone\"]').length : 0,
          submitOpacity: modal ? getComputedStyle(modal.querySelector(".form__submit")).opacity : "",
          messengerLinkWidth: linkRect?.width ?? null,
          messengerIconWidth: iconRect?.width ?? null,
          topPadding: modalRect && innerRect ? Math.round(innerRect.y - modalRect.y) : null,
          formTopOffset: modalRect && formRect ? Math.round(formRect.y - modalRect.y) : null,
          messengerBottomGap: modalRect && messengerRect ? Math.round(modalRect.bottom - messengerRect.bottom) : null,
        };
      });
      assert(formShape.hasForm, "Десктоп: в popup должна быть форма");
      assert(formShape.title.includes("Хочу работать"), "Десктоп: заголовок модалки должен совпадать");
      assert(
        formShape.lead === "Оставьте заявку, и мы в скором времени с вами свяжемся обсудить ваши задачи.",
        "Десктоп: текст лида должен совпадать с оригиналом",
      );
      assert(formShape.htmlFlag, "Десктоп: при открытом popup должен ставиться lock-класс на html");
      assert(formShape.htmlOverflow === "hidden" && formShape.bodyOverflow === "hidden", "Десктоп: страница под popup должна быть заблокирована");
      assert(Math.abs(formShape.pageScrollY - pageScrollBeforeOpen) <= 30, "Десктоп: открытие popup не должно сбрасывать scrollY страницы");
      assert(formShape.bodyPosition !== "fixed", "Десктоп: popup не должен фиксировать body через inline position=fixed");
      assert(formShape.modalOverflowY === "hidden", "Десктоп: popup без переполнения не должен показывать лишний scroll");
      assert(!formShape.modalIsScrollable, "Десктоп: в дефолтном состоянии popup не должен получать scroll-spacer");
      assert(
        formShape.modalScrollHeight <= formShape.modalClientHeight + 1,
        "Десктоп: в дефолтном состоянии у popup не должно быть фактического скролла",
      );
      assert(formShape.hasPrivacy, "Десктоп: должен быть блок согласия privacy-check");
      assert(formShape.privacyChecked, "Десктоп: чекбокс согласия должен быть отмечен как на оригинале");
      assert(formShape.requiredCount === 2, "Десктоп: ожидаются поля name и phone");
      assert(formShape.submitOpacity === "0.5", "Десктоп: кнопка отправки должна быть приглушена opacity=0.5");
      assert(formShape.messengerLinkWidth === 46, "Десктоп: messenger-ссылки должны быть видимыми 46px");
      assert(formShape.messengerIconWidth === 46, "Десктоп: messenger-иконки должны быть видимыми 46px");
      assert(
        formShape.topPadding >= 115 && formShape.topPadding <= 145,
        `Десктоп: верхний отступ popup должен повторять оригинал (~130px), got ${formShape.topPadding}`,
      );
      assert(
        formShape.formTopOffset >= 90 && formShape.formTopOffset <= 120,
        `Десктоп: форма не должна уезжать к верхнему краю popup, got ${formShape.formTopOffset}`,
      );
      assert(
        formShape.messengerBottomGap >= 220 && formShape.messengerBottomGap <= 260,
        `Десктоп: мессенджеры должны оставаться в исходной нижней зоне, got ${formShape.messengerBottomGap}`,
      );
      await page.hover("#desktop-order-popup .contact-form__messenger-links a");
      await page.waitForTimeout(500);
      const messengerHoverOpacity = await page.evaluate(() =>
        parseFloat(getComputedStyle(document.querySelector("#desktop-order-popup .contact-form__messenger-links a")).opacity),
      );
      assert(messengerHoverOpacity > 0.95, "Десктоп: hover messenger-иконки должен повышать opacity почти до 1");

      await page.hover("#desktop-order-popup .form__submit");
      await page.waitForTimeout(800);
      const submitHover = await page.evaluate(() => {
        const submit = document.querySelector("#desktop-order-popup .form__submit");
        const text = submit?.querySelector(".btn__text");
        const arrow = submit?.querySelector(".btn__arrow path");
        const overlay = submit?.querySelector(".btn__overlay");
        return {
          color: submit ? getComputedStyle(submit).color : "",
          textColor: text ? getComputedStyle(text).color : "",
          arrowStroke: arrow ? getComputedStyle(arrow).stroke : "",
          opacity: submit ? getComputedStyle(submit).opacity : "",
          overlayWidth: overlay ? overlay.getBoundingClientRect().width : 0,
          overlayHeight: overlay ? overlay.getBoundingClientRect().height : 0,
        };
      });
      assert(submitHover.color === "rgb(0, 0, 0)", "Десктоп: hover кнопки должен перекрашивать текст в черный");
      assert(submitHover.textColor === "rgb(0, 0, 0)", "Десктоп: hover кнопки должен перекрашивать подпись в черный");
      assert(submitHover.arrowStroke === "rgb(0, 0, 0)", "Десктоп: hover кнопки должен перекрашивать стрелку в черный");
      assert(submitHover.opacity === "1", "Десктоп: hover кнопки должен убирать приглушение");
      assert(submitHover.overlayWidth > 500 && submitHover.overlayHeight === 560, "Десктоп: hover кнопки должен раскрывать белый overlay");

      const textareaGrowth = await page.evaluate(() => {
        const textarea = document.querySelector('#desktop-order-popup textarea[name="comments"]');
        const submitGroup = document.querySelector("#desktop-order-popup .form__group--sub");
        const before = {
          textareaHeight: textarea.getBoundingClientRect().height,
          submitTop: submitGroup.getBoundingClientRect().top,
        };
        textarea.value = "Первая строка\nВторая строка\nТретья строка\nЧетвертая строка\nПятая строка";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        const after = {
          textareaHeight: textarea.getBoundingClientRect().height,
          submitTop: submitGroup.getBoundingClientRect().top,
          scrollHeight: textarea.scrollHeight,
          overflow: getComputedStyle(textarea).overflow,
        };
        return { before, after };
      });
      assert(
        textareaGrowth.after.textareaHeight > textareaGrowth.before.textareaHeight + 40,
        "Десктоп: textarea «Опишите задачу» должна расширяться под многострочный текст",
      );
      assert(
        textareaGrowth.after.submitTop > textareaGrowth.before.submitTop + 40,
        "Десктоп: при расширении textarea нижний блок формы должен сдвигаться вниз",
      );
      assert(textareaGrowth.after.overflow === "hidden", "Десктоп: textarea не должна показывать внутренний скролл");

      await page.evaluate(() => {
        const modal = document.querySelector("#desktop-order-popup");
        const textarea = modal.querySelector('textarea[name="comments"]');
        textarea.value = Array.from({ length: 45 }, (_, i) => `Строка ${i + 1}`).join("\n");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await page.waitForFunction(() => document.querySelector("#desktop-order-popup")?.classList.contains("is-scrollable"), {
        timeout: 2_000,
      });
      const modalScroll = await page.evaluate(() => {
        const modal = document.querySelector("#desktop-order-popup");
        modal.scrollTop = 0;
        return {
          beforeWindowY: window.scrollY,
          beforeModalTop: modal.scrollTop,
          modalIsScrollable: modal.classList.contains("is-scrollable"),
          modalClientHeight: modal.clientHeight,
          modalScrollHeight: modal.scrollHeight,
        };
      });
      assert(modalScroll.modalIsScrollable, "Десктоп: при длинной textarea popup должен получать scroll-spacer");
      assert(
        modalScroll.modalScrollHeight > modalScroll.modalClientHeight + 100,
        "Десктоп: при длинной textarea scroll должен появляться у popup-плашки",
      );
      await page.mouse.move(900, 450);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(200);
      const modalScrolled = await page.evaluate(() => {
        const modal = document.querySelector("#desktop-order-popup");
        return {
          windowY: window.scrollY,
          modalTop: modal.scrollTop,
        };
      });
      assert(modalScrolled.windowY === modalScroll.beforeWindowY, "Десктоп: колесо не должно скроллить страницу под popup");
      assert(modalScrolled.modalTop > modalScroll.beforeModalTop, "Десктоп: колесо должно скроллить popup-плашку");
      const bottomScrollGap = await page.evaluate(() => {
        const modal = document.querySelector("#desktop-order-popup");
        const submit = modal.querySelector(".form__submit");
        const privacy = modal.querySelector(".privacy-check");
        modal.scrollTop = modal.scrollHeight;
        const modalRect = modal.getBoundingClientRect();
        const submitRect = submit.getBoundingClientRect();
        const privacyRect = privacy.getBoundingClientRect();
        return {
          buttonToPrivacy: privacyRect.top - submitRect.bottom,
          privacyToModalBottom: modalRect.bottom - privacyRect.bottom,
        };
      });
      assert(bottomScrollGap.buttonToPrivacy === 40, "Десктоп: отступ между кнопкой и privacy должен сохраняться при скролле");
      assert(
        bottomScrollGap.privacyToModalBottom > 140,
        "Десктоп: при нижнем скролле под privacy должен оставаться запас внутри popup",
      );

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
      const htmlUnlocked = await page.evaluate(() => !document.documentElement.classList.contains("order-popup-open"));
      assert(htmlUnlocked, "Десктоп: после закрытия popup lock-класс с html должен сниматься");
      const pageScrollAfterClose = await page.evaluate(() => window.scrollY);
      assert(Math.abs(pageScrollAfterClose - pageScrollBeforeOpen) <= 30, "Десктоп: закрытие popup не должно дергать scrollY страницы");
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
      /* На ≤768px нижний .btns__item_open скрыт (display:none в index), CTA — плавающая кнопка в шапке после скролла */
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(400);
      await page.waitForSelector("#body.body-application .application", { state: "attached", timeout: 20_000 });
      await page.click("#body.body-application .application", { force: true });
      await page.waitForTimeout(400);
      const m = await readDesktopModal(page);
      const sheet = await readSheet(page);
      assert(m.exists && m.bodyFlag, "Мобайл: после клика плавающего CTA ожидается #desktop-order-popup");
      assert(!!(await page.evaluate(() => document.querySelector("#desktop-order-popup form.order-popup__form"))), "Мобайл: в popup должна быть форма");
      assert(!sheet.bodyFlag && !sheet.wrapActive && !sheet.modalActive, "Нижний .btns лист не должен раскрываться");

      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const afterEsc = await readDesktopModal(page);
      assert(!afterEsc.exists && !afterEsc.bodyFlag, "По Esc мобильный order-popup должен закрываться");
    }

    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("header .menu-icon", { state: "attached", timeout: 20_000 });
      await page.click("header .menu-icon", { force: true });
      await page.waitForTimeout(500);
      await page.click("header button.navigation-new__button", { force: true });
      await page.waitForTimeout(500);
      const m2 = await readDesktopModal(page);
      assert(m2.exists && m2.bodyFlag, "Мобайл: «Отправить заявку» в меню открывает order-popup");
    }

  } finally {
    await browser.close();
  }
  console.log("ok: leave-request-cta (desktop + mobile order-popup, Esc, no popup)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
