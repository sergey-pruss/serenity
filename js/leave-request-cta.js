/**
 * Кнопка «Оставить заявку» / нижняя панель действий — как на serenity.agency:
 * - десктоп: плавающий CTA в header + «Отправить заявку» в fullscreen-меню → форма на сайте агентства;
 * - ≤1024px: блок .btns.white + .btns__modal — открытие/закрытие нижнего листа (классы active, блюр).
 */
(() => {
  const LEAVE_REQUEST_URL = "https://serenity.agency/contacts";
  /** Совпадает с max-width в bundle, где показывается .btns */
  const BOTTOM_BAR_MAX_WIDTH = 1024;

  const openLeaveRequestPage = () => {
    window.open(LEAVE_REQUEST_URL, "_blank", "noopener,noreferrer");
  };

  const getBottomBar = () => {
    const wrap = document.querySelector(".btns.white");
    if (!wrap) return null;
    const modal = wrap.nextElementSibling;
    if (!modal || !modal.classList.contains("btns__modal")) return null;
    const trigger = wrap.querySelector(".btns__item_open");
    const blur = wrap.querySelector(".btns__blur");
    if (!trigger) return null;
    return { wrap, modal, trigger, blur };
  };

  const setBottomSheetOpen = (open) => {
    const b = getBottomBar();
    if (!b) return;
    b.wrap.classList.toggle("active", open);
    b.modal.classList.toggle("active", open);
  };

  const toggleBottomSheet = () => {
    const b = getBottomBar();
    if (!b) return;
    const open = !b.wrap.classList.contains("active");
    setBottomSheetOpen(open);
  };

  const closeBottomSheetIfOpen = () => {
    const b = getBottomBar();
    if (!b || !b.wrap.classList.contains("active")) return false;
    setBottomSheetOpen(false);
    return true;
  };

  const initHeaderFloatingCta = () => {
    const el = document.querySelector("#body.body-application .footer__link.application");
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLeaveRequestPage();
    });
  };

  /** Кнопка «Отправить заявку» внутри fullscreen-меню (не ссылки Telegram/WA). */
  const initFullscreenMenuButton = () => {
    const btn = document.querySelector("header button.navigation-new__button");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLeaveRequestPage();
    });
  };

  const initBottomBar = () => {
    const b = getBottomBar();
    if (!b) return;

    b.trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.innerWidth > BOTTOM_BAR_MAX_WIDTH) return;
      toggleBottomSheet();
    });

    if (b.blur) {
      b.blur.addEventListener("click", () => setBottomSheetOpen(false));
    }

    window.addEventListener("resize", () => {
      if (window.innerWidth > BOTTOM_BAR_MAX_WIDTH) setBottomSheetOpen(false);
    });
  };

  const initEscape = () => {
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Escape") return;
        if (closeBottomSheetIfOpen()) e.preventDefault();
      },
      true,
    );
  };

  const run = () => {
    initHeaderFloatingCta();
    initFullscreenMenuButton();
    initBottomBar();
    initEscape();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
