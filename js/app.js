/**
 * Горизонтальные ряды карточек в духе apple.com: нативный scroll (тач, тачпад, колёсико),
 * стрелки только если есть куда прокрутить.
 */
(() => {
  const EPS = 2;
  /**
   * Единый знак направления для горизонтальных слайдеров (услуги, блог, «Наши клиенты»):
   * колёсико, автоплей ленты клиентов, pointer-свайп. Не плодить отдельные «минусы» по файлу —
   * иначе снова съезжает согласованность между блоками.
   * +1: прямой знак; при обратной ощутимой прокрутке на вашей среде поставьте -1.
   */
  const HORIZ_SLIDER_SIGN = 1;
  let globalWheelSignMode = 0; // 0 = unknown, 1 = direct, -1 = mirrored
  const getServicesSidePad = (w = window.innerWidth) => {
    if (w <= 450) return 36;
    if (w <= 768) return 36;
    if (w <= 1025) return 55;
    return 78;
  };

  const makeArrow = (type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `swiper-button-${type}`;
    button.setAttribute("aria-label", type === "next" ? "Вперёд" : "Назад");
    if (type === "prev") button.style.transform = "rotate(180deg)";
    button.innerHTML = `
      <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.39844 0.900391L10.5908 10.0928L1.39844 19.2852" stroke="white" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
    return button;
  };

  const initRow = (options) => {
    const {
      host,
      track,
      slideSelector,
      buttonRoot,
      ensureButtons = false,
      fullBleed = false,
      sidePadGetter = getServicesSidePad,
    } = options;
    if (!host || !track) return;
    if (host.dataset.nativeRow === "1") return;
    host.dataset.nativeRow = "1";
    track.dataset.nativeRow = "1";

    const slides = Array.from(track.querySelectorAll(slideSelector));
    if (slides.length === 0) return;

    let prevBtn = host.querySelector(".swiper-button-prev") || buttonRoot?.querySelector?.(".swiper-button-prev");
    let nextBtn = host.querySelector(".swiper-button-next") || buttonRoot?.querySelector?.(".swiper-button-next");
    if (ensureButtons && (!prevBtn || !nextBtn) && buttonRoot) {
      if (getComputedStyle(buttonRoot).position === "static") buttonRoot.style.position = "relative";
      const wrap = document.createElement("div");
      wrap.className = "swiper-buttons";
      prevBtn = makeArrow("prev");
      nextBtn = makeArrow("next");
      wrap.appendChild(prevBtn);
      wrap.appendChild(nextBtn);
      buttonRoot.appendChild(wrap);
    }

    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const applyHostGeometry = () => {
      if (!fullBleed) return;
      const sidePad = sidePadGetter();
      /* Правый «вылет» сетки: один раз на последнем слайде, до расчёта maxScroll. Иначе inline margin
         из HTML / старые стили бьют по ширине трека, и отступ визуально не тянется. */
      const lastSlide = track.querySelector(".swiper-slide:last-child");
      if (lastSlide) {
        lastSlide.style.setProperty("margin-right", `${sidePad}px`, "important");
      }
      const max = maxScroll();
      let current = Math.max(0, Math.min(max, track.scrollLeft || 0));
      if (current <= EPS) current = 0;
      if (max - current <= EPS) current = max;
      const leftExpose = sidePad;
      const rightExpose = sidePad;
      host.style.width = `calc(100% + ${leftExpose + rightExpose}px)`;
      host.style.maxWidth = "none";
      host.style.marginLeft = `-${leftExpose}px`;
      host.style.marginRight = `-${rightExpose}px`;
      host.style.boxSizing = "border-box";
      track.style.boxSizing = "border-box";
      track.style.paddingLeft = `${Math.max(0, sidePad - current)}px`;

      if (prevBtn) {
        prevBtn.style.left = `${leftExpose}px`;
        prevBtn.style.right = "auto";
      }
      if (nextBtn) {
        nextBtn.style.right = `${rightExpose}px`;
        nextBtn.style.left = "auto";
      }
    };

    /**
     * Вертикаль стрелок: коробка по границам реальных плиток (статья: a.case, финальный CTA: a.blog-box),
     * не по .swiper-wrapper — иначе 50% уезжает. Раньше CTA не учитывался, на последних экранах
     * круги визуально смещались.
     */
    const syncArrowOverlayToTrack = () => {
      const root = buttonRoot || host;
      const wrap = root?.querySelector?.(".swiper-buttons");
      if (!wrap || !track) return;
      const br = root.getBoundingClientRect();
      let minTop = Number.POSITIVE_INFINITY;
      let maxBottom = Number.NEGATIVE_INFINITY;
      slides.forEach((slide) => {
        const card = slide.querySelector("a.case") || slide.querySelector("a.blog-box");
        if (!card) return;
        const r = card.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        minTop = Math.min(minTop, r.top);
        maxBottom = Math.max(maxBottom, r.bottom);
      });
      if (minTop === Number.POSITIVE_INFINITY) {
        const tr = track.getBoundingClientRect();
        minTop = tr.top;
        maxBottom = tr.bottom;
      }
      const top = minTop - br.top;
      const height = Math.max(0, maxBottom - minTop);
      wrap.style.inset = "auto";
      wrap.style.top = `${top}px`;
      wrap.style.left = "0";
      wrap.style.right = "0";
      wrap.style.width = "100%";
      wrap.style.height = `${height}px`;
      wrap.style.bottom = "auto";
    };

    /** Расстояние между соседними карточками (шаг по одной) */
    const cardStep = () => {
      if (slides.length < 2) return Math.max(60, track.clientWidth * 0.85);
      const a = slides[0].offsetLeft;
      const b = slides[1].offsetLeft;
      return Math.max(1, b - a);
    };

    /** Сколько карточек листаем стрелкой: ≈3–4 как на десктопе, на узких — меньше */
    const cardsPerPage = () => {
      const one = cardStep();
      if (one <= 0) return 1;
      const approx = Math.floor((track.clientWidth * 0.92) / one);
      return Math.max(3, Math.min(4, approx));
    };

    const setArrowHidden = (button, hidden) => {
      if (!button) return;
      button.classList.toggle("is-row-hidden", hidden);
      /* совпадает с .services-section .swiper-button-disabled в bundle: opacity + pointer */
      button.classList.toggle("swiper-button-disabled", hidden);
      button.setAttribute("aria-hidden", hidden ? "true" : "false");
      if (hidden) {
        button.setAttribute("tabindex", "-1");
        button.setAttribute("aria-disabled", "true");
      } else {
        button.removeAttribute("tabindex");
        button.setAttribute("aria-disabled", "false");
      }
    };

    const syncSlides = () => {
      const x = track.scrollLeft;
      let best = 0;
      let bestD = Number.POSITIVE_INFINITY;
      slides.forEach((slide, i) => {
        const d = Math.abs(slide.offsetLeft - x);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      slides.forEach((slide, i) => {
        slide.classList.remove("swiper-slide-active", "swiper-slide-next");
        if (i === best) slide.classList.add("swiper-slide-active");
        if (i === best + 1) slide.classList.add("swiper-slide-next");
      });
    };

    const updateArrows = () => {
      const max = maxScroll();
      let x = track.scrollLeft;
      // Только логически нормализуем края, без принудительной записи scrollLeft,
      // чтобы не вызывать дрожание при анимации/трекпаде.
      if (max - x <= EPS) {
        x = max;
      }
      const atStart = max <= EPS || x <= EPS;
      const atEnd = max <= EPS || x >= max - EPS;
      setArrowHidden(prevBtn, atStart);
      setArrowHidden(nextBtn, atEnd);
      syncSlides();
    };

    let arrowAnimRaf = 0;
    const stopArrowAnim = () => {
      if (!arrowAnimRaf) return;
      cancelAnimationFrame(arrowAnimRaf);
      arrowAnimRaf = 0;
    };

    const easeOutCubic = (t) => 1 - (1 - t) ** 3;
    const animateTo = (targetLeft) => {
      stopArrowAnim();
      const startLeft = track.scrollLeft;
      const distance = targetLeft - startLeft;
      if (Math.abs(distance) < 1) return;

      // Во время анимации убираем snap, чтобы не было рывков.
      const prevSnap = track.style.scrollSnapType;
      track.style.scrollSnapType = "none";
      const distanceAbs = Math.abs(distance);
      // Длительность зависит от дистанции, чтобы короткие шаги не казались "тормозными".
      const duration = Math.max(280, Math.min(620, distanceAbs * 0.55));
      const startedAt = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - startedAt) / duration);
        const eased = easeOutCubic(t);
        track.scrollLeft = startLeft + distance * eased;
        if (t < 1) {
          arrowAnimRaf = requestAnimationFrame(step);
          return;
        }
        arrowAnimRaf = 0;
        track.scrollLeft = targetLeft;
        track.style.scrollSnapType = prevSnap || "";
        updateArrows();
      };
      arrowAnimRaf = requestAnimationFrame(step);
    };

    const go = (dir) => {
      const n = cardsPerPage();
      const one = cardStep();
      const max = maxScroll();
      const delta = HORIZ_SLIDER_SIGN * dir * one * n;
      const nextLeft = Math.max(0, Math.min(max, track.scrollLeft + delta));
      animateTo(nextLeft);
    };

    prevBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      go(-1);
    });
    nextBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      go(1);
    });

    // Горизонтальный свайп тачпада (deltaX) внутри блока карточек.
    // Вертикальный скролл страницы не перехватываем.
    host.addEventListener(
      "wheel",
      (event) => {
        const absX = Math.abs(event.deltaX);
        const absY = Math.abs(event.deltaY);
        // Для тачпада допускаем диагональные жесты (Y-шум), если есть заметная X-компонента.
        const horizontalGesture =
          (event.shiftKey && absY > 0.5) || (absX > 0.8 && !(absY > absX * 4.5));
        if (!horizontalGesture) return;
        const max = maxScroll();
        if (max <= EPS) {
          event.preventDefault();
          return;
        }
        const rawDelta = event.shiftKey && absY > absX ? event.deltaY : event.deltaX;
        const current = track.scrollLeft;
        const unmapped = globalWheelSignMode === -1 ? -rawDelta : rawDelta;
        const mappedDelta = unmapped * HORIZ_SLIDER_SIGN;
        let next = Math.max(0, Math.min(max, current + mappedDelta));
        // Знак тачпада калибруем только один раз у левого края.
        // После калибровки НЕ зеркалим на краях, чтобы убрать дрожание.
        if (Math.abs(next - current) < 0.1 && globalWheelSignMode === 0 && current <= EPS) {
          const mirrored = Math.max(0, Math.min(max, current - rawDelta));
          if (Math.abs(mirrored - current) >= 0.1) {
            next = mirrored;
            globalWheelSignMode = -1;
          }
        }
        if (Math.abs(next - current) >= 0.1) {
          if (globalWheelSignMode === 0) globalWheelSignMode = 1;
          track.scrollLeft = next;
        }
        applyHostGeometry();
        updateArrows();
        // Всегда гасим дефолт для горизонтального жеста внутри слайдера:
        // это отключает back/forward swipe браузера на этом блоке.
        event.preventDefault();
      },
      { passive: false },
    );

    let syncRaf = 0;
    const scheduleSync = () => {
      if (syncRaf) return;
      syncRaf = requestAnimationFrame(() => {
        syncRaf = 0;
        applyHostGeometry();
        syncArrowOverlayToTrack();
        updateArrows();
      });
    };
    const relayout = () => {
      applyHostGeometry();
      syncArrowOverlayToTrack();
      updateArrows();
    };
    track.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", relayout);
    window.addEventListener("load", relayout, { once: true });
    setTimeout(relayout, 0);
  };

  const servicesHost = document.querySelector(".services__context-slider");
  const servicesTrack = servicesHost?.querySelector(".services__context-wrapper");
  initRow({
    host: servicesHost,
    track: servicesTrack,
    slideSelector: ".services__slide, .swiper-slide",
    fullBleed: true,
    sidePadGetter: getServicesSidePad,
  });

  const blogContainer = document.querySelector(".blog-block__swiper-container");
  const blogTrack = blogContainer?.querySelector(".swiper-wrapper");
  initRow({
    host: blogContainer,
    track: blogTrack,
    slideSelector: ".swiper-slide",
    buttonRoot: blogContainer,
    ensureButtons: true,
    fullBleed: true,
    sidePadGetter: getServicesSidePad,
  });

  /**
   * «Наши клиенты» — аналог Swiper loop + freeMode + autoplay + mousewheel (гориз. колесо/тачпад),
   * горизонтальный вайп (touch), пауза автоплея только при :hover на ленте с плашками
   * (.swiper-container-clients-new), не на заголовок «Наши клиенты».
   */
  const initClientsStrip = () => {
    const host = document.querySelector(".swiper-container-clients-new");
    const track = document.querySelector(".clients-new__context-wrapper");
    if (!host || !track) return;
    if (host.dataset.clientsStrip === "1") return;
    host.dataset.clientsStrip = "1";
    host.classList.add("clients-strip");

    const isRealClientLink = (href) => {
      if (href == null) return false;
      const h = String(href).trim();
      if (!h || h === "#") return false;
      if (h.startsWith("http://") || h.startsWith("https://")) return true;
      if (h.startsWith("/") && h.length > 1) return true;
      return false;
    };

    const markLinkSlides = () => {
      for (const a of track.querySelectorAll("a.clients-new__slide")) {
        a.classList.toggle("clients-new__slide--link", isRealClientLink(a.getAttribute("href")));
      }
    };
    markLinkSlides();

    track.style.transition = "none";
    track.style.willChange = "transform";

    const listSlides = () => [...track.querySelectorAll(".clients-new__slide")];

    const measureLoopWidth = () => {
      const list = listSlides();
      const at0 = [];
      list.forEach((el, i) => {
        if (el.getAttribute("data-swiper-slide-index") === "0") at0.push(i);
      });
      if (at0.length < 2) return 0;
      return Math.max(1, list[at0[1]].offsetLeft - list[at0[0]].offsetLeft);
    };

    let loopW = 0;
    let x = 0;
    let lastT = performance.now();
    const autoPxPerSec = 58;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let touchActive = false;
    let lastTouchX = 0;
    let touchStartX = 0;
    let blockLinkFromTouch = false;
    /** Пауза только над лентой с плашками; заголовок «Наши клиенты» вне host — скролл не стопорим. */
    const isPointerOverLogoStrip = () => {
      try {
        return host.matches(":hover");
      } catch {
        return false;
      }
    };

    const wrap = (pos) => {
      if (loopW <= 0) return pos;
      return ((pos % loopW) + loopW) % loopW;
    };

    const refresh = () => {
      const w = measureLoopWidth();
      if (w <= 0) return;
      if (loopW > 0) {
        x = (x / loopW) * w;
      }
      loopW = w;
      x = wrap(x);
    };

    refresh();
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => refresh()).observe(track);
    }
    window.addEventListener("load", refresh, { once: true });
    window.addEventListener("resize", refresh);

    host.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        touchActive = true;
        blockLinkFromTouch = false;
        const t = e.touches[0].clientX;
        touchStartX = t;
        lastTouchX = t;
        lastT = performance.now();
      },
      { passive: true },
    );

    host.addEventListener(
      "touchmove",
      (e) => {
        if (!touchActive || e.touches.length !== 1 || loopW <= 0) return;
        const t = e.touches[0].clientX;
        if (Math.abs(t - touchStartX) > 5) {
          blockLinkFromTouch = true;
        }
        const delta = t - lastTouchX;
        lastTouchX = t;
        x = wrap(x - delta * HORIZ_SLIDER_SIGN);
        e.preventDefault();
      },
      { passive: false },
    );

    const endTouch = () => {
      if (!touchActive) return;
      touchActive = false;
      lastT = performance.now();
    };
    host.addEventListener("touchend", endTouch, { passive: true });
    host.addEventListener("touchcancel", endTouch, { passive: true });

    host.addEventListener(
      "click",
      (e) => {
        if (!blockLinkFromTouch) return;
        e.preventDefault();
        e.stopPropagation();
        blockLinkFromTouch = false;
      },
      true,
    );

    host.addEventListener(
      "wheel",
      (event) => {
        const absX = Math.abs(event.deltaX);
        const absY = Math.abs(event.deltaY);
        const horizontalGesture =
          (event.shiftKey && absY > 0.5) || (absX > 0.8 && !(absY > absX * 4.5));
        if (!horizontalGesture) return;
        if (loopW <= 0) {
          event.preventDefault();
          return;
        }
        const rawDelta = event.shiftKey && absY > absX ? event.deltaY : event.deltaX;
        const unmapped = globalWheelSignMode === -1 ? -rawDelta : rawDelta;
        const mappedDelta = unmapped * HORIZ_SLIDER_SIGN;
        let next = x + mappedDelta;
        if (Math.abs(next - x) < 0.1 && globalWheelSignMode === 0 && (x % loopW) <= EPS) {
          const mirrored = x - rawDelta;
          if (Math.abs(mirrored - x) >= 0.1) {
            next = mirrored;
            globalWheelSignMode = -1;
          }
        }
        if (Math.abs(next - x) >= 0.1) {
          if (globalWheelSignMode === 0) globalWheelSignMode = 1;
          x = wrap(next);
        }
        lastT = performance.now();
        event.preventDefault();
      },
      { passive: false },
    );

    const tick = (now) => {
      if (loopW > 0 && !reduceMotion.matches && !touchActive && !isPointerOverLogoStrip()) {
        const dt = (now - lastT) / 1000;
        lastT = now;
        x = wrap(x + HORIZ_SLIDER_SIGN * autoPxPerSec * dt);
      } else {
        lastT = now;
      }
      track.style.transform = `translate3d(${-x}px, 0, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const initHeaderBurgerOnScroll = () => {
    const header = document.querySelector("header.header");
    const topLine = header?.querySelector(".header__top-line");
    const menuIcon = header?.querySelector(".menu-icon");
    const bodyApplication = header?.querySelector("#body.body-application");
    const menuFooter = header?.querySelector(".footer.container");
    const staticMenu = header?.querySelector(".new-static-menu.new-static-menu_main-str");
    if (!header || !topLine || !menuIcon) return;

    let collapsed = false;
    const DESKTOP_BREAKPOINT = 1250;
    const COLLAPSE_Y = 120;
    const EXPAND_Y = 36;

    const setOpen = (open) => {
      header.classList.toggle("active", open);
      menuIcon.classList.toggle("active", open);
      topLine.classList.toggle("open", open);
      if (bodyApplication) {
        bodyApplication.classList.toggle("active", open);
        // Прод-логика: floating CTA виден в compressed-состоянии (scroll), скрыт на page-top.
        // Класс noactive используем только когда header не collapsed.
        bodyApplication.classList.toggle("noactive", !collapsed && !open);
      }
      menuFooter?.classList.toggle("open", open);
      staticMenu?.classList.toggle("menu-screen-visible", open);
      if (open) {
        topLine.classList.remove("hide");
      } else if (collapsed) {
        topLine.classList.add("hide");
      }
      document.body.classList.toggle("scroll-menu-open", open);
    };

    const closeMenu = () => setOpen(false);

    const toggleMenu = () => {
      const isAdaptive = window.innerWidth <= DESKTOP_BREAKPOINT;
      if (!collapsed && !isAdaptive) return;
      setOpen(!header.classList.contains("active"));
    };

    menuIcon.addEventListener("click", toggleMenu);
    header.querySelectorAll(".navigation-new__list a, .navigation-new__button, .navigation-list a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    const applyState = (nextCollapsed) => {
      if (collapsed === nextCollapsed) return;
      collapsed = nextCollapsed;
      header.classList.toggle("header--collapsed", collapsed);
      header.classList.toggle("page-top", !collapsed);
      topLine.classList.toggle("hide", collapsed);
      menuIcon.classList.toggle("show", collapsed);
      if (bodyApplication && !header.classList.contains("active")) {
        bodyApplication.classList.toggle("noactive", !collapsed);
      }
      if (!collapsed) closeMenu();
    };

    const sync = () => {
      if (window.innerWidth <= DESKTOP_BREAKPOINT) {
        applyState(false);
        return;
      }
      const y = window.scrollY || window.pageYOffset || 0;
      if (!collapsed && y > COLLAPSE_Y) applyState(true);
      if (collapsed && y < EXPAND_Y) applyState(false);
      // Подстраховка под штатные классы bundle: если top-line уже скрыт, обязательно показываем бургер.
      if (topLine.classList.contains("hide")) menuIcon.classList.add("show");
    };

    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  };

  const initHeaderCityPhoneSwitch = () => {
    const cityBlock = document.querySelector("header.header .navigation-new__citys");
    if (!cityBlock) return;

    const phoneLink = cityBlock.querySelector(".navigation-new__block-number");
    const phoneText = cityBlock.querySelector(".navigation-new__citys-number");
    const cityItems = Array.from(cityBlock.querySelectorAll(".btns__picker span"));
    if (!phoneLink || !phoneText || cityItems.length < 2) return;

    const phones = {
      "Петербург": {
        text: "+7 (812) 602-50-44",
        href: "tel:+78126025044",
      },
      "Москва": {
        text: "+7 (495) 419-95-88",
        href: "tel:+74954199588",
      },
    };

    const selectCity = (cityName) => {
      const phone = phones[cityName] || phones["Петербург"];
      phoneText.textContent = phone.text;
      phoneLink.setAttribute("href", phone.href);
      cityItems.forEach((item) => {
        item.classList.toggle("selected", item.textContent.trim() === cityName);
      });
    };

    cityItems.forEach((item) => {
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.addEventListener("click", () => selectCity(item.textContent.trim()));
      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectCity(item.textContent.trim());
      });
    });

    selectCity(cityItems.find((item) => item.classList.contains("selected"))?.textContent.trim() || "Петербург");
  };

  const initFooterPhoneSwitch = () => {
    const phones = {
      "Петербург": {
        text: "+7 (812) 602 50 44",
        href: "tel:+78126025044",
      },
      "Москва": {
        text: "+7 (495) 419 95 88",
        href: "tel:+74954199588",
      },
    };

    const bindSwitcher = ({ root, pickerSelector, phoneSelector, linkSelector, selectedClass }) => {
      const phoneText = root.querySelector(phoneSelector);
      const phoneLink = root.querySelector(linkSelector);
      const cityItems = Array.from(root.querySelectorAll(pickerSelector));
      if (!phoneText || !phoneLink || cityItems.length < 2) return;

      const selectCity = (cityName) => {
        const phone = phones[cityName] || phones["Петербург"];
        phoneText.textContent = phone.text;
        phoneLink.setAttribute("href", phone.href);
        cityItems.forEach((item) => {
          item.classList.toggle(selectedClass, item.textContent.trim() === cityName);
        });
      };

      cityItems.forEach((item) => {
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.addEventListener("click", () => selectCity(item.textContent.trim()));
        item.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selectCity(item.textContent.trim());
        });
      });

      selectCity(cityItems.find((item) => item.classList.contains(selectedClass))?.textContent.trim() || "Петербург");
    };

    document.querySelectorAll(".footer-modern__contacts").forEach((root) => {
      bindSwitcher({
        root,
        pickerSelector: ".footer-modern__city-selector a",
        phoneSelector: ".footer-modern__phone",
        linkSelector: "a:has(.footer-modern__phone)",
        selectedClass: "selected",
      });
    });

    document.querySelectorAll(".btns__option--extended").forEach((root) => {
      bindSwitcher({
        root,
        pickerSelector: ".btns__picker span",
        phoneSelector: ".btns__number",
        linkSelector: "a",
        selectedClass: "selected",
      });
    });
  };

  const initHeroVideoLoading = () => {
    const block = document.querySelector(".video-block");
    const video = block?.querySelector("video.video-iframe");
    if (!block || !video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    block.classList.add("is-loading");
    const markReady = () => {
      block.classList.remove("is-loading");
      block.classList.remove("video-error");
      block.classList.add("video-ready");
    };
    const markError = () => {
      block.classList.remove("video-ready");
      block.classList.add("video-error");
      block.classList.add("is-loading");
    };

    if (video.readyState >= 2) {
      markReady();
      return;
    }

    video.addEventListener("loadeddata", markReady, { once: true });
    video.addEventListener("canplay", markReady, { once: true });
    video.addEventListener("playing", markReady, { once: true });
    video.addEventListener("error", markError, { once: true });
    video.addEventListener(
      "loadedmetadata",
      () => {
        video.play().catch(() => {});
      },
      { once: true },
    );

    // Safari/Private mode fallback: autoplay can remain blocked until first gesture.
    const tryPlayFromGesture = () => {
      video.play().then(markReady).catch(() => {});
    };
    ["pointerdown", "touchstart", "keydown", "scroll"].forEach((evt) => {
      window.addEventListener(evt, tryPlayFromGesture, { passive: true, once: true });
    });

    let checks = 0;
    const timer = setInterval(() => {
      checks += 1;
      if (video.readyState >= 2 || !block.classList.contains("is-loading")) {
        clearInterval(timer);
        markReady();
      } else if (checks >= 8) {
        clearInterval(timer);
        // Не держим вечный overlay: если видео долго буферится, показываем сам video-слой.
        markReady();
      }
    }, 500);
  };

  initHeaderBurgerOnScroll();
  initHeaderCityPhoneSwitch();
  initFooterPhoneSwitch();
  initHeroVideoLoading();
  initClientsStrip();
})();
