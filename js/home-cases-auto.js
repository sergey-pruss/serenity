/**
 * Автообновление кейсов на главной из json/cases-all.json
 * (берем первые 8 как "последние кейсы" в порядке API).
 */
(() => {
  if (!document.querySelector(".more-cases .more-cases__item")) return;

  const esc = (s) => {
    const d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
  };

  const renderTags = (tags) => (tags || []).map((t) => `<span data-v-c0adc676="" class="case__tag">${esc(t)}</span>`).join("");

  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    try {
      return new URL(url, window.location.origin).href;
    } catch (_) {
      return url;
    }
  };

  /** `__m` только для каталогов, где sharp реально создаёт вариант (см. build-case-mobile-media). */
  const pathnameForSa = (absUrl) => {
    try {
      return new URL(absUrl).pathname;
    } catch (_) {
      return "";
    }
  };

  const buildResponsiveAttrs = (url) => {
    const src = toAbsoluteUrl(url);
    if (!src) return { src: "", srcset: "", sizes: "" };
    const p = pathnameForSa(src);
    if (!p.includes("/_sa/img/case/") && !p.includes("/_sa/img/blog/")) {
      return { src, srcset: "", sizes: "" };
    }
    const mobileSrc = src.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/, "__m$1$2");
    return {
      src,
      srcset: `${mobileSrc} 820w, ${src} 1920w`,
      sizes: "(max-width: 768px) 92vw, (max-width: 1200px) 48vw, 31vw",
    };
  };

  const renderMedia = (media, idx) => {
    const imageUrl = media?.kind === "video" ? media.poster : media?.image;
    const imageAttrs = buildResponsiveAttrs(imageUrl);
    const fetchPriority = idx < 2 ? "high" : "low";
    const loading = idx < 2 ? "eager" : "lazy";
    if (media?.kind === "video") {
      return `<div data-v-c0adc676="" class="case__media video">
        <img fetchpriority="${fetchPriority}" decoding="async" data-v-c0adc676="" src="${esc(
          imageAttrs.src
        )}" srcset="${esc(imageAttrs.srcset)}" sizes="${esc(imageAttrs.sizes)}" loading="${loading}" class="case__media--front" alt="" />
        <video data-v-c0adc676="" playsinline="" autoplay="autoplay" muted="muted" loop="loop" preload="none" class="case__media--video">
          <source data-v-c0adc676="" data-src="${esc(media.videoSrc || "")}" type="video/mp4" />
        </video>
      </div>`;
    }
    return `<div data-v-c0adc676="" class="case__media zoom">
      <img fetchpriority="${fetchPriority}" decoding="async" data-v-c0adc676="" src="${esc(
        imageAttrs.src
      )}" srcset="${esc(imageAttrs.srcset)}" sizes="${esc(imageAttrs.sizes)}" loading="${loading}" class="case__media--front" alt="" />
    </div>`;
  };

  const renderDesktopCardInner = (c, idx) =>
    `<div data-v-c0adc676="" class="case__tags">${renderTags(c.tags)}</div>
     <p data-v-c0adc676="" class="case__description">${esc(c.description || "")}</p>
     ${renderMedia(c.media, idx)}
     ${
       c.isResource
         ? `<div data-v-c0adc676="" class="case__external-link"><svg data-v-c0adc676="" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" class="cases__case-svg"><path data-v-c0adc676="" d="M21.2644 22.3648C21.2644 22.3648 22.9678 22.2317 22.9678 20.129C22.9678 18.0262 21.5742 17 19.8089 17H14V28.7509H19.8089C19.8089 28.7509 23.3551 28.8688 23.3551 25.2825C23.3551 25.2826 23.5097 22.3648 21.2644 22.3648V22.3648ZM19.3908 19.0886H19.8089C19.8089 19.0886 20.5985 19.0886 20.5985 20.3112C20.5985 21.5337 20.1342 21.7109 19.6074 21.7109H16.5595V19.0886H19.3908V19.0886ZM19.6448 26.6624H16.5595V23.5221H19.8089C19.8089 23.5221 20.9858 23.5058 20.9858 25.1359C20.9858 26.5103 20.1068 26.652 19.6448 26.6624V26.6624ZM28.0844 19.9898C23.7915 19.9898 23.7953 24.5048 23.7953 24.5048C23.7953 24.5048 23.5007 28.9967 28.0844 28.9967C28.0844 28.9967 31.9042 29.2264 31.9042 25.8719H29.9397C29.9397 25.8719 30.0053 27.1352 28.15 27.1352C28.15 27.1352 26.1852 27.2738 26.1852 25.0908H31.9697C31.9697 25.0907 32.6026 19.9898 28.0844 19.9898ZM26.1636 23.5221C26.1636 23.5221 26.4035 21.7109 28.1281 21.7109C29.8523 21.7109 29.8307 23.5221 29.8307 23.5221H26.1636ZM30.2883 19.1393H25.6827V17.6923H30.2883V19.1393Z" fill="black"></path><rect data-v-c0adc676="" x="1" y="1" width="44" height="44" rx="13" stroke="black"></rect></svg></div>`
         : ""
     }`;

  const renderMobileSlide = (c) => {
    const bg = c.media?.kind === "video" ? c.media.poster : c.media?.image;
    const textClass = c.linkClass === "dark-text" ? "mor-cases-slide__text mor-cases-slide__text_black" : "mor-cases-slide__text";
    return `<div data-v-38965faa="" class="swiper-slide mor-cases-slide" style="background-image: url(&quot;${esc(bg || "")}&quot;);">
      <a data-v-38965faa="" href="${esc(c.href || "#")}" class="mor-cases-slide__link">
        <p data-v-38965faa="" class="${textClass}">${esc(c.description || "")}</p>
      </a>
    </div>`;
  };

  fetch("/_sa/json/cases-all.json", { cache: "no-cache", credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || !Array.isArray(data.cases) || data.cases.length === 0) return;
      const latest = data.cases.slice(0, 8);
      const initDeferredVideos = () => {
        const videos = Array.from(document.querySelectorAll(".more-cases .case__media.video video"));
        if (videos.length === 0) return;
        const loadVideo = (video) => {
          if (!video || video.dataset.loaded === "1") return;
          const source = video.querySelector("source[data-src]");
          if (source && !source.getAttribute("src")) {
            source.setAttribute("src", source.getAttribute("data-src") || "");
          }
          video.dataset.loaded = "1";
          video.load();
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
        };
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                loadVideo(entry.target);
                io.unobserve(entry.target);
              }
            });
          },
          { rootMargin: "240px 0px" }
        );
        videos.forEach((video) => {
          io.observe(video);
          video.closest(".case")?.addEventListener("mouseenter", () => loadVideo(video), { once: true });
        });
      };

      // Desktop grid: обновляем первые 8 карточек в существующей сетке.
      const links = Array.from(document.querySelectorAll(".more-cases .case > a")).slice(0, 8);
      latest.forEach((c, idx) => {
        const a = links[idx];
        if (!a) return;
        a.closest(".case")?.classList.toggle("case--dark-card", c.linkClass === "dark-text");
        a.closest(".case")?.style.setProperty("background-color", c.linkClass === "dark-text" ? "#e8e8ea" : "");
        a.setAttribute("href", c.href || "#");
        a.className = [c.linkClass || "white-text", c.isResource ? "case--resource" : ""].filter(Boolean).join(" ");
        a.style.setProperty("background-color", c.linkClass === "dark-text" ? "#e8e8ea" : "");
        if (c.isResource) a.setAttribute("target", "_blank");
        else a.removeAttribute("target");
        a.innerHTML = renderDesktopCardInner(c, idx);
      });
      initDeferredVideos();

      // Mobile slider: полностью пересобираем слайды + сохраняем последний слайд-ссылку.
      const wrapper = document.querySelector(".mor-cases-slider .swiper-wrapper");
      if (wrapper) {
        const lastLinkSlide = wrapper.querySelector(".mor-cases-slide_link");
        const slidesHtml = latest.map(renderMobileSlide).join("") + (lastLinkSlide ? lastLinkSlide.outerHTML : "");
        const morContainer = document.querySelector(".mor-cases-slider");
        wrapper.innerHTML = slidesHtml;

        const hadSwiper = !!(morContainer && morContainer.swiper);
        if (hadSwiper && typeof morContainer.swiper.destroy === "function") {
          morContainer.swiper.destroy(true, true);
        }
        morContainer?.removeAttribute("data-mor-cases-init");

        // Если fetch завершился после initMorCasesSlider в app.js — замена DOM ломает отступы spaceBetween.
        if (hadSwiper && typeof window.Swiper === "function") {
          morContainer.dataset.morCasesInit = "1";
          new window.Swiper(morContainer, {
            direction: "horizontal",
            slidesPerView: "auto",
            freeMode: true,
            spaceBetween: 20,
            grabCursor: true,
            simulateTouch: true,
            threshold: 6,
            passiveListeners: false,
          });
        }
      }
    })
    .catch(() => {});
})();

