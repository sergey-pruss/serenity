/**
 * Страница /case/all: облегчённые маршруты + серверная пагинация в JSON.
 * URL:
 * - /case/all/, /case/all/2
 * - /case/all/category/pr/, /case/all/category/pr/2
 */
(async () => {
  const grid = document.getElementById("case-all-grid");
  const catRoot = document.getElementById("case-all-categories");
  const pagRoot = document.getElementById("case-all-pagination");
  const emptyEl = document.getElementById("case-all-empty");

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

  const buildResponsiveAttrs = (url) => {
    const src = toAbsoluteUrl(url);
    if (!src) return { src: "", srcset: "", sizes: "" };
    const mobileSrc = src.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/, "__m$1$2");
    return {
      src,
      srcset: `${mobileSrc} 820w, ${src} 1920w`,
      sizes: "(max-width: 768px) 92vw, (max-width: 1200px) 48vw, 31vw",
    };
  };

  const parseRoute = () => {
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    // /case/all[/2]
    let m = pathname.match(/^\/case\/all(?:\/(\d+))?$/);
    if (m) {
      return { filterCode: "", page: Number(m[1] || 1) || 1 };
    }
    // /case/all/category/{code}[/2]
    m = pathname.match(/^\/case\/all\/category\/([^/]+)(?:\/(\d+))?$/);
    if (m) {
      return { filterCode: m[1], page: Number(m[2] || 1) || 1 };
    }
    return { filterCode: "", page: 1 };
  };

  const routeFor = (code, page) => {
    const c = code || "";
    const p = Number(page) || 1;
    if (!c) return p <= 1 ? "/case/all/" : `/case/all/${p}/`;
    return p <= 1 ? `/case/all/category/${c}/` : `/case/all/category/${c}/${p}/`;
  };

  const renderCard = (c, idx) => {
    const tagsHtml = (c.tags || [])
      .map((t) => `<span class="case__tag" data-v-c0adc676="">${esc(t)}</span>`)
      .join("");
    const imageUrl = c.media?.kind === "video" ? c.media.poster : c.media?.image;
    const imageAttrs = buildResponsiveAttrs(imageUrl);
    const fetchPriority = idx < 2 ? "high" : "low";
    const loading = idx < 2 ? "eager" : "lazy";

    const media =
      c.media && c.media.kind === "video"
        ? `<div class="case__media video" data-v-c0adc676="">
            <img fetchpriority="${fetchPriority}" decoding="async" data-v-c0adc676=""
              src="${esc(imageAttrs.src)}" srcset="${esc(imageAttrs.srcset)}" sizes="${esc(imageAttrs.sizes)}" loading="${loading}" class="case__media--front" alt="" />
            <video data-v-c0adc676="" playsinline="" autoplay="autoplay" muted="muted" loop="loop"
              preload="none" class="case__media--video">
              <source data-v-c0adc676="" data-src="${esc(c.media.videoSrc)}" type="video/mp4" />
            </video>
          </div>`
        : `<div class="case__media zoom" data-v-c0adc676="">
            <img fetchpriority="${fetchPriority}" decoding="async" data-v-c0adc676=""
              src="${esc(imageAttrs.src)}" srcset="${esc(imageAttrs.srcset)}" sizes="${esc(imageAttrs.sizes)}" loading="${loading}" class="case__media--front" alt="" />
          </div>`;

    const cls = [c.linkClass || "white-text", c.isResource ? "case--resource" : ""].filter(Boolean).join(" ");
    const href = esc(c.href || "#");
    const resourceIcon = c.isResource
      ? `<div data-v-c0adc676="" class="case__external-link"><svg data-v-c0adc676="" width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" class="cases__case-svg"><path data-v-c0adc676="" d="M21.2644 22.3648C21.2644 22.3648 22.9678 22.2317 22.9678 20.129C22.9678 18.0262 21.5742 17 19.8089 17H14V28.7509H19.8089C19.8089 28.7509 23.3551 28.8688 23.3551 25.2825C23.3551 25.2826 23.5097 22.3648 21.2644 22.3648V22.3648ZM19.3908 19.0886H19.8089C19.8089 19.0886 20.5985 19.0886 20.5985 20.3112C20.5985 21.5337 20.1342 21.7109 19.6074 21.7109H16.5595V19.0886H19.3908V19.0886ZM19.6448 26.6624H16.5595V23.5221H19.8089C19.8089 23.5221 20.9858 23.5058 20.9858 25.1359C20.9858 26.5103 20.1068 26.652 19.6448 26.6624V26.6624ZM28.0844 19.9898C23.7915 19.9898 23.7953 24.5048 23.7953 24.5048C23.7953 24.5048 23.5007 28.9967 28.0844 28.9967C28.0844 28.9967 31.9042 29.2264 31.9042 25.8719H29.9397C29.9397 25.8719 30.0053 27.1352 28.15 27.1352C28.15 27.1352 26.1852 27.2738 26.1852 25.0908H31.9697C31.9697 25.0907 32.6026 19.9898 28.0844 19.9898ZM26.1636 23.5221C26.1636 23.5221 26.4035 21.7109 28.1281 21.7109C29.8523 21.7109 29.8307 23.5221 29.8307 23.5221H26.1636ZM30.2883 19.1393H25.6827V17.6923H30.2883V19.1393Z" fill="black"></path><rect data-v-c0adc676="" x="1" y="1" width="44" height="44" rx="13" stroke="black"></rect></svg></div>`
      : "";

    const isDarkCard = c.linkClass === "dark-text";
    const caseClass = isDarkCard ? "case case--dark-card" : "case";
    const caseStyle = isDarkCard ? ' style="background-color:#e8e8ea;"' : "";
    const linkStyle = isDarkCard ? ' style="background-color:#e8e8ea;"' : "";
    return `<div data-v-c0adc676="" data-v-27a87df0="" class="${caseClass}"${caseStyle}>
      <a data-v-c0adc676="" href="${href}" ${c.isResource ? 'target="_blank"' : ""} class="${cls}"${linkStyle} rel="noopener noreferrer">${tagsHtml ? `<div data-v-c0adc676="" class="case__tags">${tagsHtml}</div>` : ""}
        <p data-v-c0adc676="" class="case__description">${esc(c.description)}</p>
        ${media}
        ${resourceIcon}
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
    const res = await fetch(`/_sa/json/case-all-pages/${encodeURIComponent(folder)}/page-${route.page}.json`, {
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

  grid.innerHTML = (payload.cases || []).map((c, idx) => renderCard(c, idx)).join("");
  emptyEl.hidden = Number(payload.totalItems || 0) !== 0;
  renderCategories(payload);
  renderPagination(payload);
  initDeferredVideos();

  try {
    window.dispatchEvent(new CustomEvent("case-all-rendered"));
  } catch (_) {
    // ignore
  };
})();
