/**
 * Листинг блога: /blog/, /blog/2, /blog/article/, …
 * Отдельные статьи остаются на /blog/article/slug (legacy) — здесь только совпадения без лишнего сегмента.
 */
(async () => {
  const grid = document.getElementById("blog-grid");
  const catRoot = document.getElementById("blog-categories");
  const pagRoot = document.getElementById("blog-pagination");
  const emptyEl = document.getElementById("blog-empty");

  if (!grid || !catRoot || !pagRoot || !emptyEl) return;

  const esc = (s) => {
    const d = document.createElement("div");
    d.textContent = s ?? "";
    return d.innerHTML;
  };

  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    try {
      return new URL(url, window.location.origin).href;
    } catch (_) {
      return url;
    }
  };

  /**
   * Только src без srcset: у превью блога часто нет пары base + __m в /_sa/img/storage__*
   * (в кейсах __m генерится пакетно; здесь браузер брал несуществующий __m из srcset → 404).
   */
  const buildBlogImageAttrs = (url) => {
    const src = toAbsoluteUrl(url);
    if (!src) return { src: "", srcset: "", sizes: "" };
    return { src, srcset: "", sizes: "" };
  };

  const imgTagAttrs = (attrs, fetchPriority, loading) => {
    if (!attrs.src) return "";
    const rs = attrs.srcset
      ? ` srcset="${esc(attrs.srcset)}" sizes="${esc(attrs.sizes)}"`
      : "";
    return `src="${esc(attrs.src)}"${rs} fetchpriority="${fetchPriority}" decoding="async" loading="${loading}"`;
  };

  const parseRoute = () => {
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

    let m = pathname.match(/^\/blog\/(life|case|article|podcast)(?:\/(\d+))?$/);
    if (m) {
      return { filterCode: m[1], page: Number(m[2] || 1) || 1 };
    }

    m = pathname.match(/^\/blog\/(\d+)$/);
    if (m) {
      return { filterCode: "", page: Number(m[1]) || 1 };
    }

    if (pathname === "/blog") {
      return { filterCode: "", page: 1 };
    }

    return { filterCode: "", page: 1 };
  };

  const routeFor = (code, page) => {
    const c = code || "";
    const p = Number(page) || 1;
    if (!c) return p <= 1 ? "/blog/" : `/blog/${p}/`;
    return p <= 1 ? `/blog/${c}/` : `/blog/${c}/${p}/`;
  };

  const renderCard = (c, idx) => {
    const tagsHtml = (c.tags || [])
      .map((t) => `<span class="case__tag" data-v-c0adc676="">${esc(t)}</span>`)
      .join("");
    const imageUrl = c.media?.kind === "video" ? c.media.poster : c.media?.image;
    const imageAttrs = buildBlogImageAttrs(imageUrl);
    const fetchPriority = idx < 2 ? "high" : "low";
    const loading = idx < 2 ? "eager" : "lazy";
    const imgOpen = `<img data-v-c0adc676="" class="case__media--front" alt="" ${imgTagAttrs(imageAttrs, fetchPriority, loading)} />`;

    const media =
      c.media && c.media.kind === "video"
        ? `<div class="case__media video" data-v-c0adc676="">
            ${imgOpen}
            <video data-v-c0adc676="" playsinline="" autoplay="autoplay" muted="muted" loop="loop"
              preload="none" class="case__media--video">
              <source data-v-c0adc676="" data-src="${esc(c.media.videoSrc)}" type="video/mp4" />
            </video>
          </div>`
        : `<div class="case__media zoom" data-v-c0adc676="">
            ${imgOpen}
          </div>`;

    /* Без case--resource и без case__external-link: иконка внешнего ресурса — только для кейсов. */
    const cls = (c.linkClass || "white-text").trim();
    const href = esc(c.href || "#");

    const isDarkCard = c.linkClass === "dark-text";
    const caseClass = isDarkCard ? "case case--dark-card" : "case";
    const caseStyle = isDarkCard ? ' style="background-color:#e8e8ea;"' : "";
    const linkStyle = isDarkCard ? ' style="background-color:#e8e8ea;"' : "";
    const subtitleHtml = c.subtitle
      ? `<p data-v-c0adc676="" class="case__subtitle">${esc(c.subtitle)}</p>`
      : "";
    return `<div data-v-c0adc676="" data-v-27a87df0="" class="${caseClass}"${caseStyle}>
      <a data-v-c0adc676="" href="${href}" ${c.isResource ? 'target="_blank"' : ""} class="${cls}"${linkStyle} rel="noopener noreferrer">${tagsHtml ? `<div data-v-c0adc676="" class="case__tags">${tagsHtml}</div>` : ""}
        <p data-v-c0adc676="" class="case__description">${esc(c.description)}</p>
        ${subtitleHtml}
        ${media}
      </a>
    </div>`;
  };

  const initDeferredVideos = () => {
    const videos = Array.from(document.querySelectorAll(".case__media.video video"));
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
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
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

  const renderCategories = (payload) => {
    catRoot.innerHTML = (payload.filters || [])
      .map((f) => {
        const active =
          (f.code || "") === (payload.filterCode || "") ? " categories__link_active div-exact-active" : "";
        const href = routeFor(f.code || "", 1);
        return `<a href="${href}" class="categories__link${active}" data-v-682de319="">${esc(f.label)}</a>`;
      })
      .join("");
  };

  const renderPagination = (payload) => {
    const totalPages = Number(payload.totalPages || 1);
    const currentPage = Number(payload.currentPage || 1);
    if (Number(payload.totalItems || 0) === 0) {
      pagRoot.innerHTML = "";
      pagRoot.hidden = true;
      return;
    }
    pagRoot.hidden = totalPages <= 1;

    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
      const cur = p === currentPage;
      pages.push(
        `<a class="case-all-pagination__page${cur ? " is-active" : ""}" href="${routeFor(
          payload.filterCode || "",
          p
        )}" ${cur ? 'aria-current="page"' : ""}>${p}</a>`
      );
    }

    pagRoot.innerHTML = `<div class="case-all-pagination__inner">
      <div class="case-all-pagination__pages">${pages.join("")}</div>
    </div>`;
  };

  const route = parseRoute();
  const folder = route.filterCode || "all";
  let payload = null;
  try {
    const res = await fetch(`/_sa/json/blog-pages/${encodeURIComponent(folder)}/page-${route.page}.json`, {
      credentials: "same-origin",
      cache: "no-cache",
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    payload = await res.json();
  } catch (_) {
    if (route.page !== 1) {
      window.location.replace(routeFor(route.filterCode, 1));
      return;
    }
    return;
  }

  grid.innerHTML = (payload.posts || []).map((c, idx) => renderCard(c, idx)).join("");
  emptyEl.hidden = Number(payload.totalItems || 0) !== 0;
  renderCategories(payload);
  renderPagination(payload);
  initDeferredVideos();

  try {
    window.dispatchEvent(new CustomEvent("blog-listing-rendered"));
  } catch (_) {
    // ignore
  }
})();
