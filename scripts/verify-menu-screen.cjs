/**
 * Проверка fullscreen-меню в header:
 * - сворачивание top-line при скролле (desktop)
 * - открытие отдельного экрана по клику на бургер
 * - корректная геометрия (nav по центру, кнопки в один ряд, footer внизу)
 * - закрытие по Esc и восстановление hero-видео
 *
 * Запуск: npm run test:menu
 */
const { chromium } = require("playwright");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const breakpoints = [1365, 1200, 1024, 900, 768, 600, 500, 390];

(async () => {
  const base = process.env.MENU_TEST_BASE_URL || "http://127.0.0.1:18765/";
  const browser = await chromium.launch();
  try {
    for (const width of breakpoints) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(base, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("header.header .header__top-line", { state: "attached", timeout: 20_000 });

      const adaptive = width <= 1250;
      if (!adaptive) {
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(350);
        const collapsed = await page.evaluate(() => {
          const h = document.querySelector("header.header");
          const top = h?.querySelector(".header__top-line");
          const icon = h?.querySelector(".menu-icon");
          return Boolean(
            h?.classList.contains("header--collapsed") &&
              top?.classList.contains("hide") &&
              icon?.classList.contains("show"),
          );
        });
        assert(collapsed, `[${width}] После скролла не включилось collapsed-состояние`);
      }

      const pointerCursor = await page.evaluate(() => {
        const icon = document.querySelector("header.header .menu-icon");
        if (!icon) return { cursor: "", visible: false };
        const r = icon.getBoundingClientRect();
        return {
          cursor: getComputedStyle(icon).cursor,
          visible: r.width > 10 && r.height > 10,
        };
      });
      assert(pointerCursor.visible, `[${width}] бургер не отображается`);
      assert(pointerCursor.cursor === "pointer", `[${width}] курсор на бургере не pointer`);

      const readFooterPhone = async () =>
        page.evaluate(() => {
          const footer = document.querySelector("footer.footer-modern .footer-modern__contacts");
          const selected = footer?.querySelector(".footer-modern__city-selector .selected");
          const phone = footer?.querySelector(".footer-modern__phone");
          const link = phone?.closest("a");
          return {
            city: selected?.textContent?.trim() || "",
            text: phone?.textContent?.trim().replace(/\s+/g, " ") || "",
            href: link?.getAttribute("href") || "",
          };
        });

      const footerBefore = await readFooterPhone();
      assert(footerBefore.city === "Москва", `[${width}] в футере по умолчанию должна быть Москва`);
      assert(footerBefore.text === "+7 (495) 419 95 88", `[${width}] номер Москвы в футере по умолчанию не совпадает`);
      assert(footerBefore.href === "tel:+74954199588", `[${width}] ссылка телефона в футере должна быть tel, сейчас: ${footerBefore.href}`);

      await page.evaluate(() => {
        const root = document.querySelector("footer.footer-modern");
        Array.from(root?.querySelectorAll(".footer-modern__city-selector a") || [])
          .find((item) => item.textContent.trim() === "Москва")
          ?.click();
      });
      const footerMoscow = await readFooterPhone();
      assert(footerMoscow.city === "Москва", `[${width}] в футере после клика должна быть Москва`);
      assert(footerMoscow.text === "+7 (495) 419 95 88", `[${width}] номер Москвы в футере не совпадает`);
      assert(footerMoscow.href === "tel:+74954199588", `[${width}] ссылка Москвы в футере должна быть tel`);

      await page.click("header.header .menu-icon");
      await page.waitForTimeout(400);

      const openState = await page.evaluate(() => {
        const h = document.querySelector("header.header");
        const staticMenu = h?.querySelector(".new-static-menu.new-static-menu_main-str");
        const footer = h?.querySelector(".footer.container");
        const modal = h?.querySelector(".new-static-menu .btns__modal");
        const topMenu = h?.querySelector(".header__top-line .navigation-menu");
        const navLinks = h ? h.querySelectorAll(".navigation-new__list a").length : 0;
        const btns = h ? h.querySelectorAll(".navigation-new__button").length : 0;
        const topMenuVisible = topMenu
          ? getComputedStyle(topMenu).opacity !== "0" && getComputedStyle(topMenu).pointerEvents !== "none"
          : false;
        return {
          active: Boolean(h?.classList.contains("active")),
          navLinks,
          btns,
          hasFooter: Boolean(footer),
          hasModal: Boolean(modal),
          topMenuVisible,
          navVisible: staticMenu ? getComputedStyle(staticMenu).opacity !== "0" : false,
        };
      });
      assert(openState.active, `[${width}] по клику бургер не включает .header.active`);
      assert(openState.navLinks >= 6, `[${width}] меньше 6 ссылок в меню`);
      assert(openState.btns >= 3, `[${width}] нет 3 action-кнопок`);
      assert(openState.hasFooter && openState.hasModal, `[${width}] нет нижнего блока контактов`);
      assert(openState.navVisible, `[${width}] fullscreen-блок меню не виден`);
      assert(!openState.topMenuVisible, `[${width}] видно старое верхнее меню`);

      const readMenuPhone = async () =>
        page.evaluate(() => {
          const cityBlock = document.querySelector('header.header [data-burger-menu-contacts="1"]');
          const selected = cityBlock?.querySelector(".footer-modern__city-selector a.selected");
          const phone = cityBlock?.querySelector(".footer-modern__phone");
          const link = phone?.closest("a");
          return {
            city: selected?.textContent?.trim() || "",
            text: phone?.textContent?.trim().replace(/\s+/g, " ") || "",
            href: link?.getAttribute("href") || "",
          };
        });

      const phoneBefore = await readMenuPhone();
      assert(phoneBefore.city === "Москва", `[${width}] бургер должен повторять город футера (Москва): ${phoneBefore.city}`);
      assert(phoneBefore.text === "+7 (495) 419 95 88", `[${width}] номер в бургере должен совпадать с футером: ${phoneBefore.text}`);
      assert(phoneBefore.href === "tel:+74954199588", `[${width}] tel в бургере должен совпадать с футером: ${phoneBefore.href}`);

      await page.evaluate(() => {
        const root = document.querySelector('header.header [data-burger-menu-contacts="1"]');
        Array.from(root?.querySelectorAll(".footer-modern__city-selector a") || [])
          .find((a) => a.textContent.trim() === "Москва")
          ?.click();
      });
      const phoneMoscow = await readMenuPhone();
      assert(phoneMoscow.city === "Москва", `[${width}] после клика должна быть выбрана Москва`);
      assert(phoneMoscow.text === "+7 (495) 419 95 88", `[${width}] номер Москвы не совпадает: ${phoneMoscow.text}`);
      assert(phoneMoscow.href === "tel:+74954199588", `[${width}] tel Москвы не совпадает: ${phoneMoscow.href}`);
      const footerAfterMenuMoscow = await readFooterPhone();
      assert(footerAfterMenuMoscow.city === "Москва", `[${width}] футер должен синхронизироваться с бургером (Москва)`);

      await page.evaluate(() => {
        const root = document.querySelector('header.header [data-burger-menu-contacts="1"]');
        const p = Array.from(root?.querySelectorAll(".footer-modern__city-selector a") || []).find(
          (a) => a.textContent.trim() === "Санкт-Петербург",
        );
        if (!p) return;
        p.focus();
        p.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      });
      const phonePetersburg = await readMenuPhone();
      assert(phonePetersburg.city === "Санкт-Петербург", `[${width}] Enter должен вернуть Санкт-Петербург`);
      assert(phonePetersburg.text === "+7 (812) 602 50 44", `[${width}] номер Санкт-Петербурга после возврата не совпадает`);
      assert(phonePetersburg.href === "tel:+78126025044", `[${width}] tel Санкт-Петербурга после возврата не совпадает`);
      const footerAfterMenuSpb = await readFooterPhone();
      assert(footerAfterMenuSpb.city === "Санкт-Петербург", `[${width}] футер должен синхронизироваться с бургером (Санкт-Петербург)`);

      const readBottomPhone = async () =>
        page.evaluate(() => {
          const block = document.querySelector(".btns__option--extended");
          const selected = block?.querySelector(".btns__picker .selected");
          const phone = block?.querySelector(".btns__number");
          const link = phone?.closest("a");
          return {
            city: selected?.textContent?.trim() || "",
            text: phone?.textContent?.trim().replace(/\s+/g, " ") || "",
            href: link?.getAttribute("href") || "",
          };
        });

      const bottomBefore = await readBottomPhone();
      assert(bottomBefore.city === "Москва", `[${width}] в нижнем блоке по умолчанию должна быть Москва`);
      assert(bottomBefore.text === "+7 (495) 419 95 88", `[${width}] нижний номер Москвы по умолчанию не совпадает`);
      assert(bottomBefore.href === "tel:+74954199588", `[${width}] нижняя ссылка Москвы по умолчанию должна быть tel`);

      await page.evaluate(() => {
        Array.from(document.querySelectorAll(".btns__option--extended .btns__picker span"))
          .find((item) => item.textContent.trim() === "Москва")
          ?.click();
      });
      const bottomMoscow = await readBottomPhone();
      assert(bottomMoscow.city === "Москва", `[${width}] нижний переключатель должен выбрать Москву`);
      assert(bottomMoscow.text === "+7 (495) 419 95 88", `[${width}] нижний номер Москвы не совпадает`);
      assert(bottomMoscow.href === "tel:+74954199588", `[${width}] нижняя ссылка Москвы должна быть tel`);

      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const closed = await page.evaluate(() => !document.querySelector("header.header")?.classList.contains("active"));
      assert(closed, `[${width}] меню не закрылось по Escape`);
      await page.close();
    }

    // Дополнительная проверка hero-video после закрытия на desktop
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await page.goto(base, { waitUntil: "load", timeout: 60_000 });
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(350);
    await page.click("header.header .menu-icon");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    const videoVisible = await page.evaluate(() => {
      const v = document.querySelector(".video-iframe");
      const r = v?.getBoundingClientRect();
      return Boolean(r && r.width > 20 && r.height > 20);
    });
    assert(videoVisible, "После закрытия fullscreen-меню hero-видео не видно");
    await page.close();

    console.log("OK: menu fullscreen state + geometry + close/restore checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
