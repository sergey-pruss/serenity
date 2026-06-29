/**
 * Синхронизация высот строк в split-таблице сравнения пакетов (pinned + plans).
 * Линии строк — через ::after у низа ячейки (см. kontekstnaya-packages-compare.css).
 */
(function () {
  function clearRowHeights(row) {
    if (!row) return;
    row.style.height = "";
    row.style.minHeight = "";
    row.querySelectorAll("th, td").forEach((cell) => {
      cell.style.height = "";
      cell.style.minHeight = "";
    });
  }

  function syncRowPair(a, b) {
    if (!a || !b) return;
    clearRowHeights(a);
    clearRowHeights(b);
    const h = Math.ceil(Math.max(a.getBoundingClientRect().height, b.getBoundingClientRect().height));
    if (h > 0) {
      const px = h + "px";
      [a, b].forEach((row) => {
        row.style.height = px;
        row.style.minHeight = px;
        row.querySelectorAll("th, td").forEach((cell) => {
          cell.style.height = px;
          cell.style.minHeight = px;
          cell.style.boxSizing = "border-box";
        });
      });
    }
  }

  function syncLayout(layout) {
    const pinnedTable = layout.querySelector(".kontekst-packages-compare__table--pinned");
    const plansTable = layout.querySelector(".kontekst-packages-compare__table--plans");
    if (!pinnedTable || !plansTable) return;

    syncRowPair(
      pinnedTable.querySelector("thead tr"),
      plansTable.querySelector("thead tr"),
    );

    const pinnedBody = pinnedTable.querySelectorAll("tbody tr");
    const plansBody = plansTable.querySelectorAll("tbody tr");
    const n = Math.min(pinnedBody.length, plansBody.length);
    for (let i = 0; i < n; i += 1) {
      syncRowPair(pinnedBody[i], plansBody[i]);
    }

    layout.classList.add("kontekst-packages-compare--rows-synced");
  }

  function syncAll() {
    document.querySelectorAll(".kontekst-packages-compare__layout").forEach(syncLayout);
  }

  function scheduleSync() {
    requestAnimationFrame(() => {
      requestAnimationFrame(syncAll);
    });
  }

  function boot() {
    scheduleSync();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleSync).catch(() => {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("load", scheduleSync);
  window.addEventListener("resize", scheduleSync);

  if (typeof ResizeObserver !== "undefined") {
    document.querySelectorAll(".kontekst-packages-compare__layout").forEach((layout) => {
      const ro = new ResizeObserver(scheduleSync);
      ro.observe(layout);
      layout.querySelectorAll(".kontekst-packages-compare__table").forEach((t) => ro.observe(t));
    });
  }
})();
