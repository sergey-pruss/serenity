/**
 * Горизонтальные ряды карточек в духе apple.com: нативный scroll (тач, тачпад, колёсико),
 * стрелки только если есть куда прокрутить.
 */
(() => {
  const EPS = 2;
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
    const { host, track, slideSelector, buttonRoot, ensureButtons = false } = options;
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
      const startSnap = Math.max(6, Math.round(cardStep() * 0.18));
      if (x <= startSnap) {
        x = 0;
        if (track.scrollLeft !== 0) track.scrollLeft = 0;
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
      const delta = dir * one * n;
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
          (event.shiftKey && absY > 0.5) || (absX > 1.5 && !(absY > absX * 3.2));
        if (!horizontalGesture) return;
        const max = maxScroll();
        if (max <= EPS) return;
        const delta = event.shiftKey && absY > absX ? event.deltaY : event.deltaX;
        const next = Math.max(0, Math.min(max, track.scrollLeft + delta));
        if (Math.abs(next - track.scrollLeft) < 0.1) return;
        track.scrollLeft = next;
        updateArrows();
        event.preventDefault();
      },
      { passive: false },
    );

    const relayout = () => {
      updateArrows();
    };
    window.addEventListener("resize", relayout);
    window.addEventListener("load", relayout, { once: true });
    setTimeout(relayout, 0);
  };

  const servicesHost = document.querySelector(".services__context-slider");
  const servicesTrack = servicesHost?.querySelector(".services__context-wrapper");
  let servicesGeometryRaf = 0;
  const applyServicesHostGeometry = () => {
    if (!servicesHost || !servicesTrack) return;
    const sidePad = getServicesSidePad();
    const max = Math.max(0, servicesTrack.scrollWidth - servicesTrack.clientWidth);
    let current = Math.max(0, Math.min(max, servicesTrack.scrollLeft || 0));
    if (current <= EPS) current = 0;
    if (max - current <= EPS) current = max;
    // На старте ряд стоит по контентной линии, при сдвиге уходит к левому краю viewport.
    const leftExpose = Math.min(sidePad, current);
    // Справа без "гашения": постоянный вылет до края viewport во всех позициях.
    const rightExpose = sidePad;
    servicesHost.style.width = `calc(100% + ${leftExpose + rightExpose}px)`;
    servicesHost.style.maxWidth = "none";
    servicesHost.style.marginLeft = `-${leftExpose}px`;
    servicesHost.style.marginRight = `-${rightExpose}px`;
    servicesHost.style.boxSizing = "border-box";

    // Стрелки по горизонтали на "линии сайта":
    // viewport-left + leftExpose и viewport-right - rightExpose.
    const prevBtn = servicesHost.querySelector(".swiper-button-prev");
    const nextBtn = servicesHost.querySelector(".swiper-button-next");
    if (prevBtn) {
      prevBtn.style.left = `${leftExpose}px`;
      prevBtn.style.right = "auto";
    }
    if (nextBtn) {
      nextBtn.style.right = `${rightExpose}px`;
      nextBtn.style.left = "auto";
    }
  };

  const scheduleServicesHostGeometry = () => {
    if (servicesGeometryRaf) return;
    servicesGeometryRaf = requestAnimationFrame(() => {
      servicesGeometryRaf = 0;
      applyServicesHostGeometry();
    });
  };

  applyServicesHostGeometry();
  window.addEventListener("resize", scheduleServicesHostGeometry);
  servicesTrack?.addEventListener("scroll", scheduleServicesHostGeometry, { passive: true });

  initRow({
    host: servicesHost,
    track: servicesTrack,
    slideSelector: ".services__slide, .swiper-slide",
  });

  const blogContainer = document.querySelector(".blog-block__swiper-container");
  const blogTrack = blogContainer?.querySelector(".swiper-wrapper");
  initRow({
    host: blogContainer,
    track: blogTrack,
    slideSelector: ".swiper-slide",
    buttonRoot: document.querySelector(".blog-block-mainstr"),
    ensureButtons: true,
  });
})();
