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

  const renderCard = (c) => {
    const tagsHtml = (c.tags || [])
      .map((t) => `<span class="case__tag" data-v-c0adc676="">${esc(t)}</span>`)
      .join("");
    const media =
      c.media && c.media.kind === "video"
        ? `<div class="case__media video" data-v-c0adc676="">
            <img fetchpriority="low" decoding="async" data-v-c0adc676=""
              src="${esc(c.media.poster)}" loading="lazy" class="case__media--front" alt="" />
            <video data-v-c0adc676="" playsinline="" autoplay="autoplay" muted="muted" loop="loop"
              preload="none" class="case__media--video">
              <source data-v-c0adc676="" src="${esc(c.media.videoSrc)}" type="video/mp4" />
            </video>
          </div>`
        : `<div class="case__media zoom" data-v-c0adc676="">
            <img fetchpriority="low" decoding="async" data-v-c0adc676=""
              src="${esc((c.media && c.media.image) || "")}" loading="lazy" class="case__media--front" alt="" />
          </div>`;

    const cls = esc(c.linkClass || "white-text");
    const href = esc(c.href || "#");

    return `<div data-v-c0adc676="" data-v-27a87df0="" class="case">
      <a data-v-c0adc676="" href="${href}" class="${cls}" rel="noopener noreferrer">${tagsHtml ? `<div data-v-c0adc676="" class="case__tags">${tagsHtml}</div>` : ""}
        <p data-v-c0adc676="" class="case__description">${esc(c.description)}</p>
        ${media}
      </a>
    </div>`;
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
    const res = await fetch(`/json/case-all-pages/${encodeURIComponent(folder)}/page-${route.page}.json`, {
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

  grid.innerHTML = (payload.cases || []).map(renderCard).join("");
  emptyEl.hidden = Number(payload.totalItems || 0) !== 0;
  renderCategories(payload);
  renderPagination(payload);

  try {
    window.dispatchEvent(new CustomEvent("case-all-rendered"));
  } catch (_) {
    // ignore
  };
})();
