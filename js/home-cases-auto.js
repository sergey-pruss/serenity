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

  const renderMedia = (media) => {
    if (media?.kind === "video") {
      return `<div data-v-c0adc676="" class="case__media video">
        <img fetchpriority="low" decoding="async" data-v-c0adc676="" src="${esc(
          media.poster || ""
        )}" loading="lazy" class="case__media--front" alt="" />
        <video data-v-c0adc676="" playsinline="" autoplay="autoplay" muted="muted" loop="loop" preload="none" class="case__media--video">
          <source data-v-c0adc676="" src="${esc(media.videoSrc || "")}" type="video/mp4" />
        </video>
      </div>`;
    }
    return `<div data-v-c0adc676="" class="case__media zoom">
      <img fetchpriority="low" decoding="async" data-v-c0adc676="" src="${esc(
        media?.image || ""
      )}" loading="lazy" class="case__media--front" alt="" />
    </div>`;
  };

  const renderDesktopCardInner = (c) =>
    `<div data-v-c0adc676="" class="case__tags">${renderTags(c.tags)}</div>
     <p data-v-c0adc676="" class="case__description">${esc(c.description || "")}</p>
     ${renderMedia(c.media)}`;

  const renderMobileSlide = (c) => {
    const bg = c.media?.kind === "video" ? c.media.poster : c.media?.image;
    const textClass = c.linkClass === "dark-text" ? "mor-cases-slide__text mor-cases-slide__text_black" : "mor-cases-slide__text";
    return `<div data-v-38965faa="" class="swiper-slide mor-cases-slide" style="background-image: url(&quot;${esc(bg || "")}&quot;);">
      <a data-v-38965faa="" href="${esc(c.href || "#")}" class="mor-cases-slide__link">
        <p data-v-38965faa="" class="${textClass}">${esc(c.description || "")}</p>
      </a>
    </div>`;
  };

  fetch("/json/cases-all.json", { cache: "no-cache", credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || !Array.isArray(data.cases) || data.cases.length === 0) return;
      const latest = data.cases.slice(0, 8);

      // Desktop grid: обновляем первые 8 карточек в существующей сетке.
      const links = Array.from(document.querySelectorAll(".more-cases .case > a")).slice(0, 8);
      latest.forEach((c, idx) => {
        const a = links[idx];
        if (!a) return;
        a.setAttribute("href", c.href || "#");
        a.className = c.linkClass || "white-text";
        a.innerHTML = renderDesktopCardInner(c);
      });

      // Mobile slider: полностью пересобираем слайды + сохраняем последний слайд-ссылку.
      const wrapper = document.querySelector(".mor-cases-slider .swiper-wrapper");
      if (wrapper) {
        const lastLinkSlide = wrapper.querySelector(".mor-cases-slide_link");
        const slidesHtml = latest.map(renderMobileSlide).join("") + (lastLinkSlide ? lastLinkSlide.outerHTML : "");
        wrapper.innerHTML = slidesHtml;
      }
    })
    .catch(() => {});
})();

