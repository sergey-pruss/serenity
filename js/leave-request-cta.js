/**
 * «Оставить заявку» — только локальное раскрытие нижнего листа (.btns + .btns__modal),
 * без редиректов и window.open на внешний сайт.
 */
(() => {
  const BOTTOM_BAR_MAX_WIDTH = 1024;
  const BODY_FLAG = "leave-cta-open";

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
    document.body.classList.toggle(BODY_FLAG, open);
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
      setBottomSheetOpen(true);
    });
  };

  const initFullscreenMenuButton = () => {
    const btn = document.querySelector("header button.navigation-new__button");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // closeMenu в app.js тоже сработает — панель откроем на следующем кадре, когда меню закроется
      requestAnimationFrame(() => {
        setBottomSheetOpen(true);
      });
    });
  };

  const initInModalInpageAction = () => {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a.btns__inpage-action");
      if (!a) return;
      e.preventDefault();
    });
  };

  const initBottomBar = () => {
    const b = getBottomBar();
    if (!b) return;

    b.trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleBottomSheet();
    });

    if (b.blur) {
      b.blur.addEventListener("click", () => setBottomSheetOpen(false));
    }

    let lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      const w = window.innerWidth;
      if (lastW <= BOTTOM_BAR_MAX_WIDTH && w > BOTTOM_BAR_MAX_WIDTH) {
        setBottomSheetOpen(false);
      }
      lastW = w;
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
    initInModalInpageAction();
    initHeaderFloatingCta();
    initFullscreenMenuButton();
    initBottomBar();
    initEscape();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
