/**
 * Синхронизация высот строк в split-таблице сравнения пакетов (pinned + plans).
 */
(function () {
  function syncRowPair(a, b) {
    if (!a || !b) return;
    a.style.height = "";
    b.style.height = "";
    const h = Math.max(a.offsetHeight, b.offsetHeight);
    if (h > 0) {
      const px = h + "px";
      a.style.height = px;
      b.style.height = px;
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
  }

  function syncAll() {
    document.querySelectorAll(".kontekst-packages-compare__layout").forEach(syncLayout);
  }

  function scheduleSync() {
    requestAnimationFrame(syncAll);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSync);
  } else {
    scheduleSync();
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
