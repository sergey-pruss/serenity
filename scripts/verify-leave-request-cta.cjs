/**
 * Поведение CTA «Оставить заявку»:
 * - desktop: локальный order-popup,
 * - mobile: тот же #desktop-order-popup, без нижнего .btns листа.
 * Запуск: npm run test:leave-cta
 * URL: env LEAVE_CTA_TEST_BASE_URL или http://127.0.0.1:8895/ (см. npm run dev)
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

const installMetrikaGoalRecorder = async (page) => {
  await page.addInitScript(() => {
    window.__metrikaGoals = [];
    window.ym = (...args) => {
      if (args[1] === "reachGoal") {
        window.__metrikaGoals.push(args);
      }
    };
  });
};

const readMetrikaGoalNames = async (page) =>
  page.evaluate(() => (window.__metrikaGoals || []).map((args) => args[2]));

/** На узкой вьюпорте синтетический mouse-click Playwright не всегда даёт цепочку как у тапа; `el.click()` стабильно вызывает обработчик leave-request-cta. */
const clickFloatingCtaProgrammatic = async (page) => {
  await page.locator("#body.body-application .footer__link.application").evaluate((el) => el.click());
};

const base = process.env.LEAVE_CTA_TEST_BASE_URL || "http://127.0.0.1:8895/";

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
        const firstMessengerIcon = modal?.querySelector(".contact-form__messenger-links a svg");
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
          requiredCount: modal ? modal.querySelectorAll('input[name=\"name\"], input[name=\"phone\"], input[name=\"email\"]').length : 0,
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
      assert(formShape.requiredCount === 3, "Десктоп: ожидаются поля name, phone и email");
      assert(formShape.submitOpacity === "0.5", "Десктоп: кнопка отправки должна быть приглушена opacity=0.5");
      const messengerHrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#desktop-order-popup .contact-form__messenger-links a")).map((a) =>
          a.getAttribute("href"),
        ),
      );
      assert(
        messengerHrefs[0] === "https://t.me/Serenity_Agency_bot" &&
          messengerHrefs[1] === "https://wa.me/15557164521" &&
          messengerHrefs[2] === "https://vk.me/serenity.agency",
        `Десктоп: в форме три способа связи TG, WA, VK (без Instagram), got ${JSON.stringify(messengerHrefs)}`,
      );
      assert(
        !messengerHrefs.some((h) => h && h.toLowerCase().includes("instagram")),
        `Десктоп: Instagram не должен быть в «Общаться в мессенджере», got ${JSON.stringify(messengerHrefs)}`,
      );
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
        "Десктоп: textarea «Комментарий» должна расширяться под многострочный текст",
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
        emailInvalid: !!document.querySelector('#desktop-order-popup input[name=\"email\"].is-invalid'),
      }));
      assert(invalid.nameInvalid && invalid.phoneInvalid && invalid.emailInvalid, "Пустой submit должен подсветить обязательные поля");
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
      await clickFloatingCtaProgrammatic(page);
      await page.waitForTimeout(400);
      const m = await readDesktopModal(page);
      const sheet = await readSheet(page);
      assert(m.exists && m.bodyFlag, "Мобайл: после клика плавающего CTA ожидается #desktop-order-popup");
      assert(!!(await page.evaluate(() => document.querySelector("#desktop-order-popup form.order-popup__form"))), "Мобайл: в popup должна быть форма");
      const mobMessenger = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#desktop-order-popup .contact-form__messenger-links a")).map((a) =>
          a.getAttribute("href"),
        ),
      );
      assert(
        mobMessenger.length === 3 &&
          mobMessenger[0] === "https://t.me/Serenity_Agency_bot" &&
          mobMessenger[1] === "https://wa.me/15557164521" &&
          mobMessenger[2] === "https://vk.me/serenity.agency" &&
          !mobMessenger.some((h) => h && h.toLowerCase().includes("instagram")),
        `Мобайл: в форме TG-бот, WA, vk.me (не публичные соцстраницы), got ${JSON.stringify(mobMessenger)}`,
      );
      const mobMessengerOpacity = await page.evaluate(() =>
        parseFloat(
          getComputedStyle(document.querySelector("#desktop-order-popup .contact-form__messenger-links a")).opacity,
        ),
      );
      assert(mobMessengerOpacity > 0.99, `Мобайл: иконки мессенджеров по умолчанию без затемнения, opacity=${mobMessengerOpacity}`);
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

    const readThankYou = async (page) =>
      page.evaluate(() => {
        const modal = document.querySelector("#desktop-order-popup.modal.order-popup");
        const links = modal ? Array.from(modal.querySelectorAll(".form-success__socials a.social__link")) : [];
        return {
          isThankYou: modal?.classList.contains("is-thank-you") ?? false,
          hasFormSuccess: !!modal?.querySelector("#form-success.form-success__inner"),
          title: modal?.querySelector(".form-success__title")?.textContent?.trim() || "",
          paragraphHasNbsp: /\u00a0/.test(modal?.querySelector(".form-success__message p")?.textContent || ""),
          linkHrefs: links.map((a) => a.getAttribute("href")),
          linkCount: links.length,
        };
      });

    {
      const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
      await installMetrikaGoalRecorder(page);
      await page.route("**/api/lead", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        }),
      );
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("header.header", { state: "attached", timeout: 20_000 });
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(400);
      await page.click("#body.body-application .application", { force: true });
      await page.waitForTimeout(400);
      await page.fill('#desktop-order-popup input[name="name"]', "Тест");
      await page.fill('#desktop-order-popup input[name="phone"]', "+79990000000");
      await page.fill('#desktop-order-popup input[name="email"]', "test@example.com");
      await page.click("#desktop-order-popup .form__submit", { force: true });
      await page.waitForSelector("#desktop-order-popup.is-thank-you #form-success", { timeout: 5_000 });
      let metrikaGoals = await readMetrikaGoalNames(page);
      assert(
        JSON.stringify(metrikaGoals) === JSON.stringify(["Форма заказа"]),
        `Десктоп: успешный submit должен отправить только цель «Форма заказа», got ${JSON.stringify(metrikaGoals)}`,
      );
      const ty = await readThankYou(page);
      assert(ty.isThankYou, "Десктоп: после успешного submit модалка получает is-thank-you");
      assert(ty.hasFormSuccess, "Десктоп: ожидается #form-success.form-success__inner");
      assert(ty.title === "Спасибо, наш новый друг!", "Десктоп: заголовок экрана благодарности");
      assert(ty.linkCount === 3, `Десктоп: три соцссылки как на оригинале, got ${ty.linkCount}`);
      assert(
        ty.linkHrefs[0] === "https://t.me/serenityagency" &&
          ty.linkHrefs[1] === "https://vk.com/serenity.agency" &&
          ty.linkHrefs[2] === "https://www.instagram.com/serenity.agency/",
        `Десктоп: на «Спасибо» публичные TG и VK (не бот / не vk.me), Insta, got ${JSON.stringify(ty.linkHrefs)}`,
      );
      assert(ty.paragraphHasNbsp, "Десктоп: в тексте благодарности должны быть неразрывные пробелы (&nbsp;)");
      await page.evaluate(() => {
        document.addEventListener("click", (e) => e.preventDefault(), true);
        document.querySelector('#desktop-order-popup .form-success__socials a[href^="https://t.me/"]')?.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
        document.querySelector('#desktop-order-popup .form-success__socials a[href^="https://vk.com/serenity"]')?.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
        document.querySelector('#desktop-order-popup .form-success__socials a[href*="instagram.com"]')?.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
      });
      metrikaGoals = await readMetrikaGoalNames(page);
      assert(
        JSON.stringify(metrikaGoals) === JSON.stringify(["Форма заказа"]),
        `Десктоп: на «Спасибо» публичные TG/VK/Insta не считаются «Мессенджеры», got ${JSON.stringify(metrikaGoals)}`,
      );
      await page.evaluate(() => {
        const links = [
          ["wa-test", "https://wa.me/15557164521"],
          ["vk-public-test", "https://vk.com/serenity.agency"],
          ["tg-public-test", "https://t.me/serenityagency"],
        ];
        for (const [id, href] of links) {
          const a = document.createElement("a");
          a.id = id;
          a.href = href;
          a.target = "_blank";
          a.textContent = id;
          document.body.appendChild(a);
          a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }
      });
      metrikaGoals = await readMetrikaGoalNames(page);
      assert(
        JSON.stringify(metrikaGoals) === JSON.stringify(["Форма заказа", "Мессенджеры"]),
        `Десктоп: после экрана «Спасибо» только wa.me даёт «Мессенджеры» среди синтетических ссылок, got ${JSON.stringify(metrikaGoals)}`,
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const closedTy = await readDesktopModal(page);
      assert(!closedTy.exists, "Десктоп: экран «Спасибо» закрывается по Esc");
    }

    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await installMetrikaGoalRecorder(page);
      await page.route("**/api/lead", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        }),
      );
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(400);
      await page.waitForSelector("#body.body-application .application", { state: "attached", timeout: 20_000 });
      await clickFloatingCtaProgrammatic(page);
      await page.waitForTimeout(400);
      await page.fill('#desktop-order-popup input[name="name"]', "Мобайл");
      await page.fill('#desktop-order-popup input[name="phone"]', "+79991112233");
      await page.fill('#desktop-order-popup input[name="email"]', "mobile@example.com");
      await page.click("#desktop-order-popup .form__submit", { force: true });
      await page.waitForSelector("#desktop-order-popup.is-thank-you #form-success", { timeout: 5_000 });
      const metrikaGoals = await readMetrikaGoalNames(page);
      assert(
        JSON.stringify(metrikaGoals) === JSON.stringify(["Форма заказа"]),
        `Мобайл: успешный submit должен отправить только цель «Форма заказа», got ${JSON.stringify(metrikaGoals)}`,
      );
      const tyM = await readThankYou(page);
      assert(tyM.isThankYou && tyM.hasFormSuccess, "Мобайл: экран благодарности после submit");
      assert(tyM.title === "Спасибо, наш новый друг!", "Мобайл: заголовок экрана благодарности");
      assert(tyM.linkCount === 3, `Мобайл: три соцссылки, got ${tyM.linkCount}`);
      assert(
        tyM.linkHrefs[0] === "https://t.me/serenityagency" &&
          tyM.linkHrefs[1] === "https://vk.com/serenity.agency" &&
          tyM.linkHrefs[2] === "https://www.instagram.com/serenity.agency/",
        `Мобайл: на «Спасибо» публичные TG, VK, Insta, got ${JSON.stringify(tyM.linkHrefs)}`,
      );
    }

  } finally {
    await browser.close();
  }
  console.log("ok: leave-request-cta (popup, Esc, экран «Спасибо» после submit с моком /api/lead)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
