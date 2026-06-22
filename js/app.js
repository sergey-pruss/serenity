/**
 * Горизонтальные ряды карточек в духе apple.com: нативный scroll (тач, тачпад, колёсико),
 * стрелки только если есть куда прокрутить.
 */
(() => {
  const EPS = 2;
  const ROW_ARROWS_MIN_WIDTH = 981;
  /** Концевой гаттер в full-bleed: flex-элемент надёжнее padding-right на iOS. */
  const NATIVE_ROW_END_GUTTER_CLASS = "native-row-end-gutter";
  /**
   * Единый знак направления для горизонтальных слайдеров (услуги, блог, «Наши клиенты»):
   * колёсико, автоплей ленты клиентов, pointer-свайп. Не плодить отдельные «минусы» по файлу —
   * иначе снова съезжает согласованность между блоками.
   * +1: прямой знак; при обратной ощутимой прокрутке на вашей среде поставьте -1.
   */
  const HORIZ_SLIDER_SIGN = 1;
  /** Nuxt-дамп может содержать data-* «уже инициализировано» без живого Swiper — не пропускать init. */
  const isLiveSwiper = (el) => {
    try {
      return Boolean(el && el.swiper && el.swiper.el === el && !el.swiper.destroyed);
    } catch {
      return false;
    }
  };
  const getServicesSidePad = (w = window.innerWidth) => {
    if (w <= 450) return 36;
    if (w <= 768) return 36;
    if (w <= 1025) return 55;
    return 78;
  };

  /** Текстовая подпись до загрузки логотипа; alt без «function String()»; eager + fetchPriority. */
  const initClientsLogoFallbacks = () => {
    const host = document.querySelector(".clients-mainstr .swiper-container-clients-new");
    if (!host || host.dataset.clientLogoFallback === "1") return;
    host.dataset.clientLogoFallback = "1";
    const labelFromSrc = (src) => {
      if (!src) return "Партнёр Serenity";
      if (src.includes("di6OvWVv")) return "Volvo Penta";
      if (src.includes("bR5c6wK4")) return "Orange";
      return "Партнёр Serenity";
    };
    for (const slide of host.querySelectorAll(".clients-new__slide")) {
      const img = slide.querySelector("img");
      if (!img || slide.querySelector(".clients-new__label")) continue;
      const name = labelFromSrc(img.getAttribute("src") || "");
      img.alt = `Логотип: ${name}`;
      img.loading = "eager";
      if ("fetchPriority" in img) img.fetchPriority = "high";
      const span = document.createElement("span");
      span.className = "clients-new__label";
      span.setAttribute("aria-hidden", "true");
      span.textContent = name;
      slide.insertBefore(span, img);
      const markLoaded = () => {
        if (img.naturalWidth > 0) img.classList.add("is-loaded");
      };
      if (img.complete && img.naturalWidth > 0) markLoaded();
      else {
        img.addEventListener("load", markLoaded, { once: true });
      }
    }
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
      desktopArrowsOnly = false,
      fullBleed = false,
      /** Когда `fullBleed: false`, можно задать media-query — геометрия «вылета» как у услуг только на адаптиве (исторически для «Пакеты»; сейчас пакеты — padding на треке, без fullBleed). */
      fullBleedMedia = null,
      /** Только вылет вправо (margin-right −gutter); слева margin 0 — как .services-unified на /kontekstnaya_reklama «Пакеты». */
      fullBleedRightOnly = false,
      sidePadGetter = getServicesSidePad,
    } = options;
    if (!host || !track) return;
    if (host.__saNativeRow === "1") return;
    host.__saNativeRow = "1";
    host.dataset.nativeRow = "1";
    track.dataset.nativeRow = "1";

    const slides = Array.from(track.querySelectorAll(slideSelector));
    if (slides.length === 0) return;

    let prevBtn = host.querySelector(".swiper-button-prev") || buttonRoot?.querySelector?.(".swiper-button-prev");
    let nextBtn = host.querySelector(".swiper-button-next") || buttonRoot?.querySelector?.(".swiper-button-next");
    const desktopArrowsMedia = window.matchMedia(`(min-width: ${ROW_ARROWS_MIN_WIDTH}px)`);
    const shouldShowArrows = () => !desktopArrowsOnly || desktopArrowsMedia.matches;
    const ensureArrowButtons = () => {
      if (!(ensureButtons && shouldShowArrows() && (!prevBtn || !nextBtn) && buttonRoot)) return;
      if (getComputedStyle(buttonRoot).position === "static") buttonRoot.style.position = "relative";
      const wrap = document.createElement("div");
      wrap.className = "swiper-buttons";
      prevBtn = makeArrow("prev");
      nextBtn = makeArrow("next");
      wrap.appendChild(prevBtn);
      wrap.appendChild(nextBtn);
      buttonRoot.appendChild(wrap);
    };
    ensureArrowButtons();

    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);

    const fullBleedActive = () => {
      if (fullBleed) return true;
      if (!fullBleedMedia || typeof window === "undefined") return false;
      try {
        return window.matchMedia(fullBleedMedia).matches;
      } catch {
        return false;
      }
    };

    const removeEndGutterSpacer = () => {
      track.querySelectorAll(`.${NATIVE_ROW_END_GUTTER_CLASS}`).forEach((el) => el.remove());
    };

    const syncEndGutterSpacer = (widthPx) => {
      let spacer = track.querySelector(`.${NATIVE_ROW_END_GUTTER_CLASS}`);
      if (!spacer) {
        spacer = document.createElement("span");
        spacer.className = NATIVE_ROW_END_GUTTER_CLASS;
        spacer.setAttribute("aria-hidden", "true");
        track.appendChild(spacer);
      }
      const w = `${widthPx}px`;
      spacer.style.flex = `0 0 ${w}`;
      spacer.style.width = w;
      spacer.style.minWidth = w;
      spacer.style.height = "1px";
      spacer.style.pointerEvents = "none";
      spacer.style.display = "block";
    };

    const clearBleedGeometry = () => {
      ["width", "max-width", "margin-left", "margin-right", "box-sizing"].forEach((p) => host.style.removeProperty(p));
      track.style.removeProperty("box-sizing");
      track.style.removeProperty("padding-left");
      track.style.removeProperty("padding-right");
      removeEndGutterSpacer();
      const lastSlide = track.querySelector(".swiper-slide:last-child");
      if (lastSlide) {
        lastSlide.style.removeProperty("margin-right");
      }
      track.style.removeProperty("padding-right");
      if (prevBtn) {
        prevBtn.style.removeProperty("left");
        prevBtn.style.removeProperty("right");
      }
      if (nextBtn) {
        nextBtn.style.removeProperty("left");
        nextBtn.style.removeProperty("right");
      }
    };

    const applyHostGeometry = () => {
      if (!fullBleedActive()) {
        clearBleedGeometry();
        return;
      }
      const sidePad = sidePadGetter();
      /* Правый гаттер — padding-right на треке, не margin у последнего слайда: на iOS margin
         последнего flex-ребёнка не входит в дистанцию тач-скролла, карточка «липнет» к краю экрана. */
      const lastSlide = track.querySelector(".swiper-slide:last-child");
      if (lastSlide) {
        lastSlide.style.setProperty("margin-right", "0", "important");
      }
      const max = maxScroll();
      let current = Math.max(0, Math.min(max, track.scrollLeft || 0));
      if (current <= EPS) current = 0;
      if (max - current <= EPS) current = max;
      const leftExpose = fullBleedRightOnly ? 0 : sidePad;
      const rightExpose = sidePad;
      /* fullBleedRightOnly: не расширяем хост вправо (margin −gutter), иначе концевой spacer
         оказывается за физическим краем экрана; гаттер — .native-row-end-gutter на треке. */
      const hostExtraWidth = fullBleedRightOnly ? leftExpose : leftExpose + rightExpose;
      host.style.width = `calc(100% + ${hostExtraWidth}px)`;
      host.style.maxWidth = "none";
      host.style.marginLeft = fullBleedRightOnly ? "0" : `-${leftExpose}px`;
      host.style.marginRight = fullBleedRightOnly ? "0" : `-${rightExpose}px`;
      host.style.boxSizing = "border-box";
      track.style.boxSizing = "border-box";
      track.style.paddingLeft = `${Math.max(0, sidePad - current)}px`;
      syncEndGutterSpacer(rightExpose);
      track.style.setProperty("padding-right", "0", "important");

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
        const card =
          slide.querySelector("a.case") ||
          slide.querySelector("a.blog-box") ||
          slide.querySelector(".price-card");
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

    const applyArrowVisibility = () => {
      const visible = shouldShowArrows();
      const buttons = [prevBtn, nextBtn];
      buttons.forEach((button) => {
        if (!button) return;
        button.style.display = visible ? "" : "none";
        button.style.pointerEvents = visible ? "" : "none";
        button.setAttribute("aria-hidden", visible ? "false" : "true");
        if (visible) {
          button.removeAttribute("tabindex");
          button.setAttribute("aria-disabled", "false");
        } else {
          button.setAttribute("tabindex", "-1");
          button.setAttribute("aria-disabled", "true");
        }
      });
      if (!visible) stopArrowAnim();
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
        const mappedDelta = rawDelta * HORIZ_SLIDER_SIGN;
        const next = Math.max(0, Math.min(max, current + mappedDelta));
        if (Math.abs(next - current) >= 0.1) {
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
      ensureArrowButtons();
      applyArrowVisibility();
      applyHostGeometry();
      syncArrowOverlayToTrack();
      updateArrows();
    };
    track.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", relayout);
    if (desktopArrowsOnly) {
      if (typeof desktopArrowsMedia.addEventListener === "function") {
        desktopArrowsMedia.addEventListener("change", relayout);
      } else if (typeof desktopArrowsMedia.addListener === "function") {
        desktopArrowsMedia.addListener(relayout);
      }
    }
    window.addEventListener("load", relayout, { once: true });
    setTimeout(relayout, 0);

    if (fullBleedMedia && !fullBleed && typeof window !== "undefined") {
      let mm;
      try {
        mm = window.matchMedia(fullBleedMedia);
      } catch {
        mm = null;
      }
      if (mm) {
        const onBleedMedia = () => relayout();
        if (typeof mm.addEventListener === "function") mm.addEventListener("change", onBleedMedia);
        else if (typeof mm.addListener === "function") mm.addListener(onBleedMedia);
      }
    }
  };

  /** Для service-packages-slider.js и service-team-slider.js (блоки «Пакеты» / «Команда»). */
  window.SerenityNativeRow = {
    initRow,
    getServicesSidePad,
  };

  /* На /services/ несколько рядов карточек (по секциям); на главной — один. */
  document.querySelectorAll(".services__context-slider").forEach((servicesHost) => {
    const servicesTrack = servicesHost.querySelector(".services__context-wrapper");
    initRow({
      host: servicesHost,
      track: servicesTrack,
      slideSelector: ".services__slide, .swiper-slide",
      desktopArrowsOnly: true,
      fullBleed: true,
      sidePadGetter: getServicesSidePad,
    });
  });

  document.querySelectorAll(".blog-block__swiper-container").forEach((blogContainer) => {
    const blogTrack = blogContainer?.querySelector(".swiper-wrapper");
    initRow({
      host: blogContainer,
      track: blogTrack,
      slideSelector: ".swiper-slide",
      buttonRoot: blogContainer,
      ensureButtons: true,
      desktopArrowsOnly: true,
      fullBleed: true,
      sidePadGetter: getServicesSidePad,
    });
  });

  /**
   * «Наши клиенты» / «Награды»: тройной дубль слайдов + нативный горизонтальный scroll на треке:
   * инерция тача из браузера, без transform/touchmove с preventDefault. Автодрейф scrollLeft,
   * пауза автоплея при :hover только на хосте ленты.
   */
  const tripleClientsStripSlidesFromTrack = (track) => {
    if (!track || track.dataset.clientsStripTripled === "1" || track.dataset.awardsStripTripled === "1") {
      return;
    }
    const originals = [...track.querySelectorAll(".clients-new__slide")];
    if (originals.length < 2) return;
    const at0 = originals.filter((el) => el.getAttribute("data-swiper-slide-index") === "0");
    if (at0.length >= 2) {
      track.dataset.clientsStripTripled = "1";
      return;
    }
    const n = originals.length;
    originals.forEach((el, i) => {
      if (!el.hasAttribute("data-swiper-slide-index")) {
        el.setAttribute("data-swiper-slide-index", String(i));
      }
    });
    /* Три полных цикла в DOM: measureLoopWidth() ищет два слайда с index «0». */
    for (let r = 0; r < 2; r += 1) {
      for (let i = 0; i < n; i += 1) {
        track.appendChild(originals[i].cloneNode(true));
      }
    }
    track.dataset.clientsStripTripled = "1";
  };

  const tripleClientsStripSlides = (mountRoot) => {
    const track = mountRoot?.querySelector?.(".clients-new__context-wrapper");
    if (track) tripleClientsStripSlidesFromTrack(track);
  };

  const initOneClientsStrip = (host) => {
    const track = host ? host.querySelector(".clients-new__context-wrapper") : null;
    if (!host || !track) return;
    if (host.dataset.clientsStripInit === "1") return;
    tripleClientsStripSlidesFromTrack(track);
    host.dataset.clientsStripInit = "1";
    host.dataset.clientsStrip = "1";
    host.classList.add("clients-strip");

    let isStripVisible = true;
    let autoAdvancing = false;
    let normalizing = false;
    let layoutSnap = false;
    let lastUserScroll = 0;
    /** Пока > now: scroll-события от программного scrollLeft не трогают lastUserScroll (иначе «ложный» user idle). */
    let suppressUserScrollSignalUntil = 0;
    const USER_SCROLL_IDLE_MS = 480;

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

    track.style.removeProperty("will-change");
    track.style.removeProperty("transform");
    track.style.transition = "none";

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
    let lastT = performance.now();
    const markProgrammaticScroll = (ms = 150) => {
      suppressUserScrollSignalUntil = performance.now() + ms;
    };
    /* px/с: слишком мало — «едва едут»; scroll от автодрейфа не должен забивать lastUserScroll (см. markProgrammaticScroll). */
    const autoPxPerSec = 68;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pointerMoved = false;
    let blockLinkFromGesture = false;
    let gestureStartX = 0;

    const isPointerOverLogoStrip = () => {
      try {
        return host.matches(":hover");
      } catch {
        return false;
      }
    };

    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);

    const normalizeLoop = () => {
      if (normalizing || loopW <= 0) return;
      const slides = listSlides();
      if (listSlides().length < 13) return;
      const sl = track.scrollLeft;
      const maxSl = maxScroll();
      const lw = loopW;
      if (sl < lw * 0.28) {
        normalizing = true;
        markProgrammaticScroll();
        track.scrollLeft = sl + lw;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            normalizing = false;
          });
        });
      } else if (maxSl > 0 && sl > maxSl - lw * 0.28) {
        normalizing = true;
        markProgrammaticScroll();
        track.scrollLeft = sl - lw;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            normalizing = false;
          });
        });
      }
    };

    /** Стартовая позиция для бесконечной ленты: «клиенты» — середина первого блока; «награды» — начало 2-го цикла (= слева 2026, как начало списка, без прыжка normalize с 0). */
    const snapStripInitialPosition = () => {
      const slides = listSlides();
      if (slides.length < 13) return;
      let target = null;
      if (host.closest("#sa-home-awards-mounted")) {
        const at0 = [];
        slides.forEach((el, i) => {
          if (el.getAttribute("data-swiper-slide-index") === "0") at0.push(i);
        });
        if (at0.length >= 2) target = slides[at0[1]];
      } else {
        target = slides[12];
      }
      if (!target) return;
      layoutSnap = true;
      markProgrammaticScroll();
      track.scrollLeft = target.offsetLeft;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          layoutSnap = false;
        });
      });
    };

    const refresh = () => {
      const w = measureLoopWidth();
      if (w <= 0) return;
      loopW = w;
    };

    refresh();
    snapStripInitialPosition();
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => {
        refresh();
        requestAnimationFrame(() => {
          normalizeLoop();
        });
      }).observe(track);
    }
    window.addEventListener("load", () => {
      refresh();
      snapStripInitialPosition();
      normalizeLoop();
    }, { once: true });
    window.addEventListener("resize", () => {
      refresh();
      requestAnimationFrame(() => normalizeLoop());
    });

    let scrollRaf = 0;
    const onTrackScroll = () => {
      const now = performance.now();
      if (
        now >= suppressUserScrollSignalUntil &&
        !autoAdvancing &&
        !normalizing &&
        !layoutSnap
      ) {
        lastUserScroll = now;
      }
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (!normalizing) normalizeLoop();
      });
    };
    track.addEventListener("scroll", onTrackScroll, { passive: true });

    host.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        gestureStartX = e.clientX;
        pointerMoved = false;
        blockLinkFromGesture = false;
      },
      { passive: true },
    );
    host.addEventListener(
      "pointermove",
      (e) => {
        if (Math.abs(e.clientX - gestureStartX) > 10) pointerMoved = true;
      },
      { passive: true },
    );
    host.addEventListener(
      "pointerup",
      () => {
        blockLinkFromGesture = pointerMoved;
        pointerMoved = false;
      },
      { passive: true },
    );
    host.addEventListener(
      "pointercancel",
      () => {
        blockLinkFromGesture = pointerMoved;
        pointerMoved = false;
      },
      { passive: true },
    );
    host.addEventListener(
      "click",
      (e) => {
        if (!blockLinkFromGesture) return;
        const a = e.target.closest?.("a.clients-new__slide--link");
        if (!a || !host.contains(a)) return;
        e.preventDefault();
        e.stopPropagation();
        blockLinkFromGesture = false;
      },
      true,
    );

    /* Горизонтальный жест — только нативный scroll на .clients-new__context-wrapper (без preventDefault):
       иначе на десктопе рвётся композитор и скролл «липнет». */

    if ("IntersectionObserver" in window) {
      const stripIo = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          isStripVisible = Boolean(entry?.isIntersecting);
        },
        { root: null, threshold: 0.01 },
      );
      stripIo.observe(host);
    }

    const AUTO_TICK_MS = 16;
    const tick = () => {
      const now = performance.now();
      const userIdle = now - lastUserScroll >= USER_SCROLL_IDLE_MS;
      const shouldAuto =
        loopW > 0 &&
        maxScroll() > EPS &&
        !document.hidden &&
        isStripVisible &&
        !reduceMotion.matches &&
        userIdle &&
        !isPointerOverLogoStrip() &&
        !normalizing;

      if (shouldAuto) {
        const dt = Math.min(0.08, Math.max(0, (now - lastT) / 1000));
        lastT = now;
        autoAdvancing = true;
        markProgrammaticScroll();
        track.scrollLeft += HORIZ_SLIDER_SIGN * autoPxPerSec * dt;
        normalizeLoop();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            autoAdvancing = false;
          });
        });
      } else {
        lastT = now;
      }
    };
    window.setInterval(tick, AUTO_TICK_MS);
  };

  const initClientsStrip = () => {
    document.querySelectorAll(".swiper-container-clients-new").forEach((host) => {
      if (host.closest("#sa-home-awards-mounted")) return;
      initOneClientsStrip(host);
    });
  };

  /** Лента наград: home-awards.css подключается асинхронно — инициализация после load, иначе loopW=0. */
  const initHomeAwardsClientsStrip = () => {
    const host = document.querySelector("#sa-home-awards-mounted .swiper-container-clients-new");
    if (host) initOneClientsStrip(host);
  };

  const initHeaderBurgerOnScroll = () => {
    const header = document.querySelector("header.header");
    const topLine = header?.querySelector(".header__top-line");
    const menuIcon = header?.querySelector(".menu-icon");
    const bodyApplication = header?.querySelector("#body.body-application");
    const staticMenu = header?.querySelector(".new-static-menu.new-static-menu_main-str");
    if (!header || !topLine || !menuIcon) return;

    let collapsed = false;
    let menuCollapseYCache = null;
    const DESKTOP_BREAKPOINT = 1250;

    /**
     * Порог сворачивания top-line (px scrollY).
     * Только rect.bottom (+2px): для position:fixed шапки нижний край в viewport не зависит от scrollY.
     * Старый y + rect.bottom при первом sync со scrollY>0 (bfcache/restore) завышал порог — меню «залипало».
     */
    const measureMenuCollapseY = () => {
      const container = header.querySelector(".header__container");
      const measure = container || topLine;
      const rect = measure.getBoundingClientRect();
      return Math.max(32, Math.round(rect.bottom + 2));
    };

    const getMenuCollapseY = () => {
      if (menuCollapseYCache == null) menuCollapseYCache = measureMenuCollapseY();
      return menuCollapseYCache;
    };

    const resetMenuCollapseYCache = () => {
      menuCollapseYCache = null;
    };

    /** Порог плавающей CTA (tablet/mobile): герой / первая секция или ~90vh. */
    const getCtaCollapseY = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const first = document.querySelector(".page-constructor > .page-constructor__section:first-of-type");
      let collapseY = Math.round(vh * 0.9);
      if (first) {
        const sectionH = first.offsetHeight || vh;
        collapseY = Math.round(Math.min(sectionH * 0.65, vh * 0.95));
      }
      return Math.max(64, collapseY);
    };

    const getScrollThresholds = () => {
      const collapseY = getMenuCollapseY();
      const expandY = Math.min(48, Math.max(12, Math.round(collapseY * 0.12)));
      return { collapseY, expandY };
    };

    const shouldShowFloatingCta = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      return y > getCtaCollapseY();
    };

    const setOpen = (open) => {
      header.classList.toggle("active", open);
      menuIcon.classList.toggle("active", open);
      topLine.classList.toggle("open", open);
      if (bodyApplication) {
        bodyApplication.classList.toggle("active", open);
        bodyApplication.classList.toggle("noactive", !shouldShowFloatingCta() && !open);
      }
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
      if (!collapsed) closeMenu();
    };

    const sync = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const { collapseY, expandY } = getScrollThresholds();
      if (!collapsed && y > collapseY) applyState(true);
      if (collapsed && y < expandY) applyState(false);
      // Подстраховка под штатные классы bundle: если top-line уже скрыт, обязательно показываем бургер.
      if (topLine.classList.contains("hide")) menuIcon.classList.add("show");
      if (bodyApplication && !header.classList.contains("active")) {
        bodyApplication.classList.toggle("noactive", !shouldShowFloatingCta());
      }
    };

    window.addEventListener("scroll", sync, { passive: true });
    document.addEventListener("scroll", sync, { passive: true, capture: true });
    window.addEventListener("resize", () => {
      resetMenuCollapseYCache();
      sync();
    });
    window.addEventListener(
      "pageshow",
      (event) => {
        if (event.persisted) {
          resetMenuCollapseYCache();
          collapsed = false;
          header.classList.remove("header--collapsed");
          header.classList.add("page-top");
          topLine.classList.remove("hide");
          menuIcon.classList.remove("show");
        }
        sync();
      },
      { passive: true },
    );
    if (typeof ResizeObserver !== "undefined") {
      const container = header.querySelector(".header__container") || topLine;
      const ro = new ResizeObserver(() => {
        resetMenuCollapseYCache();
        sync();
      });
      ro.observe(container);
    }
    sync();
  };

  /**
   * Плавающий CTA на tablet/mobile: при скролле — фиксированный отступ 15px от низа viewport;
   * у самого низа страницы — сдвиг вниз, чтобы нижний край CTA совпал с нижним краем иконок
   * в footer `.footer-modern__social` (тот же «зазор до края», что и у соцблока).
   */
  const initAdaptiveFloatingCtaPosition = () => {
    const cta = document.querySelector("#body.body-application");
    if (!cta) return;

    const isTabletOrMobile = () => window.matchMedia("(max-width: 1200px)").matches;
    const getCtaVisualEl = () => cta.querySelector(".application, .footer__link") || cta;
    const getFooterSocialIcon = () => {
      const block = document.querySelector("footer.footer-modern .footer-modern__social");
      return block?.querySelector(".footer-modern__social-icons > a, :scope > a");
    };

    let raf = 0;
    const sync = () => {
      raf = 0;
      if (!isTabletOrMobile()) {
        cta.style.removeProperty("bottom");
        cta.style.removeProperty("transform");
        return;
      }
      if (getComputedStyle(cta).display === "none" || getComputedStyle(cta).visibility === "hidden") {
        return;
      }
      cta.style.setProperty("transform", "none", "important");

      const measureEl = getCtaVisualEl();
      const vv = window.visualViewport;
      const vh = vv?.height ?? window.innerHeight;
      const scrollBottom = (window.scrollY || 0) + vh;
      const docBottom = document.documentElement?.scrollHeight ?? 0;
      const atPageBottom = docBottom - scrollBottom <= 3;

      const boxCta = cta.getBoundingClientRect();
      const boxVis = measureEl.getBoundingClientRect();
      // `bottom` в CSS — от нижнего края *внешнего* #body; визуальная кнопка (`.application`) может быть
      // прижата выше/ниже внутри flex-контейнера — компенсируем разницей нижних граней.
      // visOffset > 0: визуальная кнопка выше нижней грани контейнера (из-за translateY(-70%)).
      // bottom-контейнера нужно уменьшить на visOffset, чтобы визуальная кнопка оказалась на нужной высоте.
      const visOffset = boxCta.bottom - boxVis.bottom;
      const FLOAT_PX = 15;
      if (!atPageBottom) {
        cta.style.setProperty("bottom", `${FLOAT_PX - visOffset}px`, "important");
        return;
      }

      const icon = getFooterSocialIcon();
      if (!icon || icon.getClientRects().length === 0) {
        cta.style.setProperty("bottom", `${FLOAT_PX - visOffset}px`, "important");
        return;
      }

      const iconBottomFromViewportBottom = vh - icon.getBoundingClientRect().bottom;
      const bottom = iconBottomFromViewportBottom - visOffset;
      cta.style.setProperty("bottom", `${bottom}px`, "important");
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(sync);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
      window.visualViewport.addEventListener("scroll", schedule);
    }
    schedule();

    const visualForHover = getCtaVisualEl();
    visualForHover?.addEventListener("pointerenter", () => {
      sync();
    });
    visualForHover?.addEventListener("pointerleave", () => {
      requestAnimationFrame(() => {
        sync();
      });
    });
  };

  const initFooterPhoneSwitch = () => {
    const phones = {
      "Санкт-Петербург": {
        text: "+7 (812) 602 50 44",
        href: "tel:+78126025044",
      },
      "Москва": {
        text: "+7 (495) 419 95 88",
        href: "tel:+74954199588",
      },
    };

    const canonicalCityKey = (label) => {
      const t = String(label || "").trim().toLowerCase();
      if (t.includes("моск")) return "Москва";
      if (t.includes("санкт") || t.includes("петербург")) return "Санкт-Петербург";
      const raw = String(label || "").trim();
      return phones[raw] ? raw : "Санкт-Петербург";
    };

    const resolveCityKey = (rawLabel) => {
      const cityKey = canonicalCityKey(rawLabel);
      return phones[cityKey] ? cityKey : "Санкт-Петербург";
    };

    const attachCityPickerListeners = (items, getLabel, onPick) => {
      items.forEach((item) => {
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.addEventListener("click", () => onPick(getLabel(item)));
        item.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onPick(getLabel(item));
        });
      });
    };

    const runAfterDomReady = (fn) => {
      fn();
      window.addEventListener("load", fn, { once: true });
    };

    const footerRoots = Array.from(document.querySelectorAll(".footer-modern__contacts"));
    if (footerRoots.length > 0) {
      const applyCityToFooterRoot = (root, cityKey) => {
        const key = resolveCityKey(cityKey);
        const phone = phones[key];
        const phoneText = root.querySelector(".footer-modern__phone");
        const phoneLink = root.querySelector("a:has(.footer-modern__phone)");
        const cityItems = Array.from(root.querySelectorAll(".footer-modern__city-selector a"));
        if (!phoneText || !phoneLink || cityItems.length < 2) return;
        phoneText.textContent = phone.text;
        phoneLink.setAttribute("href", phone.href);
        cityItems.forEach((item) => {
          const itemKey = canonicalCityKey(item.textContent);
          item.classList.toggle("selected", itemKey === key);
        });
      };

      const setSharedFooterCity = (rawLabel) => {
        const key = resolveCityKey(rawLabel);
        footerRoots.forEach((root) => applyCityToFooterRoot(root, key));
      };

      footerRoots.forEach((root) => {
        const cityItems = Array.from(root.querySelectorAll(".footer-modern__city-selector a"));
        if (cityItems.length < 2) return;
        attachCityPickerListeners(cityItems, (el) => el.textContent, setSharedFooterCity);
      });

      // Продуктовый дефолт города в переключателе телефонов — Москва (не менять без явного ТЗ).
      runAfterDomReady(() => setSharedFooterCity("Москва"));
    }

    const bindSwitcher = ({ root, pickerSelector, phoneSelector, linkSelector, selectedClass }) => {
      const phoneText = root.querySelector(phoneSelector);
      const phoneLink = root.querySelector(linkSelector);
      const cityItems = Array.from(root.querySelectorAll(pickerSelector));
      if (!phoneText || !phoneLink || cityItems.length < 2) return;

      const selectCity = (rawLabel) => {
        const key = resolveCityKey(rawLabel);
        const phone = phones[key];
        phoneText.textContent = phone.text;
        phoneLink.setAttribute("href", phone.href);
        cityItems.forEach((item) => {
          item.classList.toggle(selectedClass, canonicalCityKey(item.textContent) === key);
        });
      };

      attachCityPickerListeners(cityItems, (el) => el.textContent.trim(), selectCity);
      runAfterDomReady(() => selectCity("Москва"));
    };

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
    const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
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

    const bindPlaybackGuards = () => {
      video.addEventListener(
        "playing",
        () => {
          if (video.currentTime > 0 || video.readyState >= 2) markReady();
        },
        { once: true },
      );
      video.addEventListener(
        "timeupdate",
        () => {
          if (video.currentTime > 0) markReady();
        },
        { once: true },
      );
      video.addEventListener("error", markError, { once: true });
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.play().catch(() => {});
        },
        { once: true },
      );
    };
    const source = video.querySelector("source[data-src]");
    const shouldUseMobileLiteVideo = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const saveData = Boolean(connection?.saveData);
      const slowNetwork = /(^2g$|^slow-2g$|^3g$)/i.test(String(connection?.effectiveType || ""));
      return isMobileViewport || saveData || slowNetwork;
    };
    const hydrateVideoSource = () => {
      if (!source || video.dataset.heroHydrated === "1") return;
      const src = shouldUseMobileLiteVideo()
        ? source.getAttribute("data-src-mobile") || source.getAttribute("data-src") || ""
        : source.getAttribute("data-src") || "";
      if (!src) return;
      source.setAttribute("src", src);
      source.removeAttribute("data-src");
      source.removeAttribute("data-src-mobile");
      video.dataset.heroHydrated = "1";
      video.load();
    };

    let hydrationScheduled = false;
    const scheduleHydration = () => {
      if (hydrationScheduled) return;
      hydrationScheduled = true;
      // Даем отрисоваться первому экрану и только потом гидрируем видео.
      setTimeout(hydrateVideoSource, 900);
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(hydrateVideoSource, { timeout: 1600 });
      }
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            hydrateVideoSource();
            io.disconnect();
          },
          { rootMargin: "120px 0px", threshold: 0.01 },
        );
        io.observe(block);
      }
    };

    if (isMobileViewport) {
      // На мобильном оставляем только постер: так нет деградации качества и меньше сетевой нагрузки.
      block.classList.add("video-mobile-disabled");
      block.classList.remove("is-loading");
      return;
    }

    bindPlaybackGuards();
    scheduleHydration();

    // Safari/Private mode fallback: autoplay can remain blocked until first gesture.
    const tryPlayFromGesture = () => {
      hydrateVideoSource();
      video.play().then(markReady).catch(() => {});
    };
    ["pointerdown", "touchstart", "keydown", "scroll", "mousemove"].forEach((evt) => {
      window.addEventListener(evt, tryPlayFromGesture, { passive: true, once: true });
    });

    let checks = 0;
    const timer = setInterval(() => {
      checks += 1;
      const started = !video.paused && video.currentTime > 0;
      if (started || !block.classList.contains("is-loading")) {
        clearInterval(timer);
        markReady();
      } else if (checks >= 120) {
        clearInterval(timer);
        // Через ~60 с снимаем оверлей (редкий зависший decode).
        markReady();
      }
    }, 500);
  };

  const initDeferredCaseVideos = () => {
    const videos = Array.from(document.querySelectorAll("video.case__media--video[data-lazy-video='1']"));
    if (videos.length === 0) return;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = Boolean(connection?.saveData);
    const slowNetwork = /(^2g$|^slow-2g$|^3g$)/i.test(String(connection?.effectiveType || ""));
    const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
    const allowHydration = !(saveData || (isMobileViewport && slowNetwork));
    if (!allowHydration) return;

    const hydrateVideo = (video) => {
      if (!video || video.dataset.lazyLoaded === "1") return;
      const source = video.querySelector("source[data-src]");
      if (!source) return;
      const src = source.getAttribute("data-src") || "";
      if (!src) return;
      source.setAttribute("src", src);
      source.removeAttribute("data-src");
      video.dataset.lazyLoaded = "1";
      video.load();
      video.play().catch(() => {});
    };

    if (!("IntersectionObserver" in window)) {
      videos.forEach(hydrateVideo);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const video = entry.target;
          hydrateVideo(video);
          io.unobserve(video);
        });
      },
      { rootMargin: "200px 0px", threshold: 0.1 },
    );

    videos.forEach((video) => io.observe(video));
  };

  const cleanupCasesBlockDumpStyles = (container) => {
    container.querySelectorAll(".swiper-slide").forEach((slide) => {
      slide.style.width = "";
      slide.style.removeProperty("width");
      slide.style.height = "";
      slide.style.removeProperty("height");
    });
    container.style.height = "";
    container.style.removeProperty("height");
    const wrap = container.querySelector(".swiper-wrapper");
    if (wrap) {
      wrap.style.transform = "";
      wrap.style.removeProperty("transform");
      wrap.style.height = "";
      wrap.style.removeProperty("height");
    }
  };

  const initCasesBlockSwipers = () => {
    if (typeof window.Swiper === "undefined") return;
    if (!window.__saCasesBlockResizeHooked) {
      window.__saCasesBlockResizeHooked = true;
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          document
            .querySelectorAll(".cases-block__slider-swiper-container.swiper-container")
            .forEach((el) => {
              if (el._saCasesSwiper && typeof el._saCasesSwiper.update === "function") {
                el._saCasesSwiper.update();
              }
            });
        }, 120);
      });
    }
    document.querySelectorAll(".cases-block__slider").forEach((root) => {
      const container = root.querySelector(".cases-block__slider-swiper-container.swiper-container");
      if (!container || isLiveSwiper(container)) return;
      delete container.dataset.saCasesSwiperInit;
      const nav = root.querySelector(".swiper__navigation");
      const nextEl = nav && nav.querySelector(".swiper-button-next");
      const prevEl = nav && nav.querySelector(".swiper-button-prev");
      const paginationEl = root.querySelector(".swiper-pagination");
      /* /seo и др.: один слайд без .swiper__navigation — всё равно снимаем инлайн height/width с prod-дампа. */
      if (!nextEl || !prevEl) {
        cleanupCasesBlockDumpStyles(container);
        container.querySelectorAll(".swiper-slide").forEach((slide, index) => {
          slide.classList.toggle("swiper-slide-active", index === 0);
        });
        container.dataset.saCasesSwiperInit = "1";
        return;
      }
      container.dataset.saCasesSwiperInit = "1";
      cleanupCasesBlockDumpStyles(container);
      const swiper = new window.Swiper(container, {
        /* autoHeight даёт высоту обёртки по «короткому» слайду до загрузки картинок (SSR 720px) —
           контент с min-height:100vh обрезается и визуально прилипает к низу. Слайды кейсов одной высоты. */
        autoHeight: false,
        slidesPerView: 1,
        spaceBetween: 0,
        speed: 550,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        /* Свайп: при overflow-y на слайде touch часто уходит в скролл; passiveListeners:false + release на краях помогают горизонтальному жесту. */
        simulateTouch: true,
        grabCursor: true,
        threshold: 6,
        /* Шире угол — проще сработать диагональному свайпу (страница + слайдер). */
        touchAngle: 65,
        touchReleaseOnEdges: true,
        passiveListeners: false,
        /* Safari/macOS: горизонтальный трекпад — wheel, не touch; swiper-bundle включает Mousewheel при enabled. */
        mousewheel: {
          enabled: true,
          forceToAxis: true,
          sensitivity: 0.85,
          thresholdDelta: 12,
          releaseOnEdges: true,
        },
        navigation: {
          nextEl,
          prevEl,
        },
        ...(paginationEl
          ? {
              pagination: {
                el: paginationEl,
                clickable: true,
              },
            }
          : {}),
        keyboard: { enabled: true, onlyInViewport: true },
        a11y: {
          prevSlideMessage: "Предыдущий слайд",
          nextSlideMessage: "Следующий слайд",
        },
        on: {
          init(swiperInstance) {
            swiperInstance.navigation.update();
            swiperInstance.update();
          },
          slideChangeTransitionEnd(swiperInstance) {
            swiperInstance.navigation.update();
            swiperInstance.update();
          },
        },
      });
      if (nav) {
        nav.style.zIndex = "12";
        nav.querySelectorAll(".swiper-button-prev, .swiper-button-next").forEach((btn) => {
          btn.style.pointerEvents = "auto";
        });
      }
      container._saCasesSwiper = swiper;
      const bumpCasesSwiper = () => {
        requestAnimationFrame(() => {
          swiper.update();
        });
      };
      bumpCasesSwiper();
      container.querySelectorAll("img").forEach((img) => {
        if (img.complete) return;
        img.addEventListener("load", bumpCasesSwiper, { once: true });
        img.addEventListener("error", bumpCasesSwiper, { once: true });
      });
      window.addEventListener("load", bumpCasesSwiper, { once: true });
    });
  };

  const initSynergyContextSwiper = () => {
    if (typeof window.Swiper === "undefined") return;
    document.querySelectorAll(".synergy__context-slider.swiper-container").forEach((container) => {
      if (isLiveSwiper(container)) return;
      delete container.dataset.saSynergySwiperInit;
      const nextEl = container.querySelector(".swiper-button-next");
      const prevEl = container.querySelector(".swiper-button-prev");
      if (!nextEl || !prevEl) return;
      container.dataset.saSynergySwiperInit = "1";
      new window.Swiper(container, {
        slidesPerView: "auto",
        spaceBetween: 30,
        freeMode: true,
        grabCursor: true,
        simulateTouch: true,
        threshold: 6,
        passiveListeners: false,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        navigation: { nextEl, prevEl },
        keyboard: { enabled: true, onlyInViewport: true },
      });
    });
  };

  const getPageInlineGutterPx = () => {
    const cs = getComputedStyle(document.documentElement);
    const raw =
      cs.getPropertyValue("--page-inline-end").trim() || cs.getPropertyValue("--page-gutter-x").trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 36;
  };

  const MOR_CASES_NATIVE_ROW_MQ = "(max-width: 1024px)";

  const morCasesUsesNativeRow = () => {
    try {
      return window.matchMedia(MOR_CASES_NATIVE_ROW_MQ).matches;
    } catch {
      return window.innerWidth <= 1024;
    }
  };

  const clearMorCasesNativeRow = (container) => {
    if (!container) return;
    delete container.__saNativeRow;
    delete container.dataset.nativeRow;
    delete container.dataset.morCasesNativeRow;
    const track = container.querySelector(".swiper-wrapper");
    if (!track) return;
    delete track.dataset.nativeRow;
    track.querySelectorAll(`.${NATIVE_ROW_END_GUTTER_CLASS}`).forEach((el) => el.remove());
    ["width", "max-width", "margin-left", "margin-right", "box-sizing"].forEach((p) =>
      container.style.removeProperty(p),
    );
    ["padding-left", "padding-right", "box-sizing", "scroll-snap-type", "transform", "cursor"].forEach(
      (p) => track.style.removeProperty(p),
    );
    track.style.removeProperty("overflow-x");
  };

  const teardownMorCasesSwiper = (container) => {
    const sw = container._saMorCasesSwiper || container.swiper;
    if (sw && typeof sw.destroy === "function") {
      try {
        if (!sw.destroyed) sw.destroy(true, true);
      } catch {
        /* ignore */
      }
    }
    container._saMorCasesSwiper = null;
    if (container.swiper) delete container.swiper;
    delete container.dataset.morCasesInit;
    const track = container.querySelector(".swiper-wrapper");
    if (track) {
      track.style.transform = "";
      track.style.removeProperty("transform");
      track.style.cursor = "";
    }
    container.classList.remove(
      "swiper-initialized",
      "swiper-horizontal",
      "swiper-pointer-events",
      "swiper-free-mode",
      "swiper-backface-hidden",
    );
  };

  const prepareMorCasesTrack = (track) => {
    if (!track) return;
    track.style.transform = "";
    track.style.removeProperty("transform");
    track.style.transition = "none";
  };

  const morCasesSwiperOpts = () => {
    const opts = {
      direction: "horizontal",
      slidesPerView: "auto",
      freeMode: true,
      spaceBetween: 20,
      grabCursor: true,
      simulateTouch: true,
      threshold: 6,
      passiveListeners: false,
    };
    if (window.matchMedia("(max-width: 768px)").matches) {
      opts.slidesOffsetAfter = getPageInlineGutterPx();
    }
    return opts;
  };

  const initOneMorCasesSlider = (container) => {
    const track = container.querySelector(".swiper-wrapper");
    if (!track) return;

    if (morCasesUsesNativeRow()) {
      teardownMorCasesSwiper(container);
      if (container.__saNativeRow !== "1") {
        clearMorCasesNativeRow(container);
        prepareMorCasesTrack(track);
        initRow({
          host: container,
          track,
          slideSelector: ".mor-cases-slide, .swiper-slide",
          desktopArrowsOnly: true,
          fullBleed: true,
          sidePadGetter: getServicesSidePad,
        });
        container.dataset.morCasesNativeRow = "1";
      }
      container.dataset.morCasesInit = "1";
      return;
    }

    clearMorCasesNativeRow(container);
    if (isLiveSwiper(container)) return;
    teardownMorCasesSwiper(container);
    container.dataset.morCasesInit = "1";
    const swiper = new window.Swiper(container, morCasesSwiperOpts());
    container._saMorCasesSwiper = swiper;
  };

  const marketingCmWideSwiperOpts = (container, { prevEl, nextEl, paginationEl, slideCount }) => ({
    slidesPerView: 1,
    spaceBetween: 0,
    speed: 650,
    loop: slideCount > 1,
    loopAdditionalSlides: slideCount > 1 ? 2 : 0,
    watchOverflow: true,
    observer: true,
    observeParents: true,
    allowTouchMove: true,
    simulateTouch: true,
    grabCursor: true,
    followFinger: true,
    threshold: 6,
    touchAngle: 65,
    touchReleaseOnEdges: true,
    passiveListeners: false,
    shortSwipes: true,
    longSwipes: true,
    mousewheel: {
      enabled: true,
      forceToAxis: true,
      sensitivity: 0.85,
      thresholdDelta: 12,
      releaseOnEdges: true,
    },
    autoplay:
      slideCount > 1 ? { delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true } : false,
    navigation: { prevEl, nextEl },
    ...(paginationEl
      ? {
          pagination: {
            el: paginationEl,
            clickable: true,
          },
        }
      : {}),
    keyboard: { enabled: true, onlyInViewport: true },
    a11y: {
      prevSlideMessage: "Предыдущий слайд",
      nextSlideMessage: "Следующий слайд",
    },
  });

  const initMarketingCmWideSlider = () => {
    if (typeof window.Swiper === "undefined") return false;
    let inited = false;
    document.querySelectorAll(".marketing-cm-wide-slider__host").forEach((container) => {
      if (isLiveSwiper(container)) return;
      delete container.dataset.saMarketingWideInit;
      const prevEl = container.querySelector(".swiper-button-prev");
      const nextEl = container.querySelector(".swiper-button-next");
      const paginationEl = container.querySelector(".swiper-pagination");
      if (!prevEl || !nextEl) return;
      container.dataset.saMarketingWideInit = "1";
      inited = true;
      container.querySelectorAll(".swiper-slide").forEach((slide) => {
        slide.style.width = "";
        slide.style.removeProperty("width");
      });
      const wrap = container.querySelector(".swiper-wrapper");
      if (wrap) {
        wrap.style.transform = "";
        wrap.style.removeProperty("transform");
        wrap.style.height = "";
        wrap.style.removeProperty("height");
      }
      container.querySelectorAll(".case-slider__img").forEach((img) => {
        img.setAttribute("draggable", "false");
      });
      const slideCount = container.querySelectorAll(".swiper-slide").length;
      const swiper = new window.Swiper(
        container,
        marketingCmWideSwiperOpts(container, { prevEl, nextEl, paginationEl, slideCount }),
      );
      container._saMarketingWideSwiper = swiper;
      const bump = () => {
        requestAnimationFrame(() => swiper.update());
      };
      bump();
      container.querySelectorAll("img").forEach((img) => {
        if (img.complete) return;
        img.addEventListener("load", bump, { once: true });
        img.addEventListener("error", bump, { once: true });
      });
    });
    return inited;
  };

  const bootMarketingCmWideSlider = () => {
    const ok = initMarketingCmWideSlider();
    if (ok) return;
    const pending = document.querySelector(
      ".marketing-cm-wide-slider__host:not([data-sa-marketing-wide-init='1'])",
    );
    if (!pending) return;
    window.addEventListener("load", () => initMarketingCmWideSlider(), { once: true });
  };

  const initMarketingSitesSlider = () => {
    if (typeof window.Swiper === "undefined") return false;
    let inited = false;
    document.querySelectorAll(".marketing-sites-slider__host").forEach((container) => {
      if (isLiveSwiper(container)) return;
      delete container.dataset.saMarketingSitesInit;
      const prevEl = container.querySelector(".swiper-button-prev");
      const nextEl = container.querySelector(".swiper-button-next");
      const paginationEl = container.querySelector(".swiper-pagination");
      if (!prevEl || !nextEl) return;
      container.dataset.saMarketingSitesInit = "1";
      inited = true;
      const slideCount = container.querySelectorAll(".swiper-slide").length;
      const swiper = new window.Swiper(
        container,
        marketingCmWideSwiperOpts(container, { prevEl, nextEl, paginationEl, slideCount }),
      );
      container._saMarketingSitesSwiper = swiper;
      const bump = () => {
        requestAnimationFrame(() => swiper.update());
      };
      bump();
      container.querySelectorAll("img").forEach((img) => {
        if (img.complete) return;
        img.addEventListener("load", bump, { once: true });
        img.addEventListener("error", bump, { once: true });
      });
    });
    return inited;
  };

  const bootMarketingSitesSlider = () => {
    const ok = initMarketingSitesSlider();
    if (ok) return;
    const pending = document.querySelector(
      ".marketing-sites-slider__host:not([data-sa-marketing-sites-init='1'])",
    );
    if (!pending) return;
    window.addEventListener("load", () => initMarketingSitesSlider(), { once: true });
  };

  const initMorCasesSlider = () => {
    const needsSwiper = !morCasesUsesNativeRow();
    if (needsSwiper && typeof window.Swiper === "undefined") return false;
    document.querySelectorAll(".mor-cases-slider").forEach(initOneMorCasesSlider);
    return true;
  };

  window.SerenityMorCasesReinit = initMorCasesSlider;

  if (!window.__saMorCasesResizeHooked) {
    window.__saMorCasesResizeHooked = true;
    let morCasesResizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(morCasesResizeTimer);
      morCasesResizeTimer = setTimeout(() => initMorCasesSlider(), 120);
    });
  }

  const tripleHomeAwardsStripSlides = (mountRoot) => {
    tripleClientsStripSlides(mountRoot);
  };

  /** «Награды»: без гейта по хосту — только главная (шаблон в разметке). */
  const mountHomeAwardsTemplate = () => {
    if (document.body?.classList.contains("sa-home-page") !== true) return;
    const tpl = document.getElementById("sa-home-awards-fragment");
    const scroll = document.querySelector(".scroll-container");
    const footer = scroll?.querySelector("footer.footer-modern");
    if (!tpl || !scroll || !footer || !(tpl instanceof HTMLTemplateElement)) return;
    if (document.getElementById("sa-home-awards-mounted")) return;

    const mount = document.createElement("div");
    mount.id = "sa-home-awards-mounted";
    mount.appendChild(tpl.content.cloneNode(true));
    tripleHomeAwardsStripSlides(mount);
    scroll.insertBefore(mount, footer);

    /* Стили после бандла: иначе .swiper-slide img { max-width:100% } ломает венки до применения home-awards.css */
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/_sa/css/sections/home-awards.css?v=20260514kontekstAwardsShell";
    const runAwardsStripAfterPaint = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          initHomeAwardsClientsStrip();
        });
      });
    };
    link.addEventListener("load", runAwardsStripAfterPaint, { once: true });
    link.addEventListener("error", runAwardsStripAfterPaint, { once: true });
    document.head.appendChild(link);
    try {
      if (link.sheet) runAwardsStripAfterPaint();
    } catch {
      /* ignore */
    }
  };

  /* На части мобильных WebView отложенный бандл может отработать до полной готовности поддерева scroll+footer — монтируем после DOMContentLoaded, если ещё грузится. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountHomeAwardsTemplate(), { once: true });
  } else {
    mountHomeAwardsTemplate();
  }

  initHeaderBurgerOnScroll();
  initAdaptiveFloatingCtaPosition();
  initFooterPhoneSwitch();
  initHeroVideoLoading();
  initDeferredCaseVideos();
  initClientsLogoFallbacks();
  initClientsStrip();
  initCasesBlockSwipers();
  initSynergyContextSwiper();
  bootMarketingCmWideSlider();
  bootMarketingSitesSlider();
  if (!initMorCasesSlider()) {
    window.addEventListener("load", () => initMorCasesSlider(), { once: true });
  }

  /* Страницы не-главная (услуги и т.п.): блок наград уже в DOM, но mountHomeAwardsTemplate
     не запускается (нет sa-home-page). Инициализируем ленту и тройной loop вручную. */
  if (!document.body?.classList.contains("sa-home-page")) {
    const awardsMount = document.getElementById("sa-home-awards-mounted");
    if (awardsMount) {
      tripleHomeAwardsStripSlides(awardsMount);
      initHomeAwardsClientsStrip();
    }
  }

  /** /services: в TEXT-карточках при 4+ строках описания скрываем текст — остаются заголовок и цена. */
  const hideLongServicesTextDescriptions = () => {
    if (!document.body?.classList.contains("services-body")) return;
    document
      .querySelectorAll(".services__card-container-text .services__card-description")
      .forEach((el) => {
        el.classList.remove("services__card-description--hidden-long");
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
        if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
        const lines = Math.round(el.scrollHeight / lineHeight);
        if (lines >= 4) el.classList.add("services__card-description--hidden-long");
      });
  };
  if (document.body?.classList.contains("services-body")) {
    hideLongServicesTextDescriptions();
    let resizeRaf = 0;
    window.addEventListener("resize", () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        hideLongServicesTextDescriptions();
      });
    });
  }

})();
