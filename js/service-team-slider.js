/**
 * Слайдер «Команда» (.team__members-slider) — страница контекстной рекламы.
 * Требует app.js (SerenityNativeRow.initRow) и native-row-scroll.css.
 */
(function () {
  "use strict";

  function initTeamSliders() {
    const { initRow, getServicesSidePad } = window.SerenityNativeRow || {};
    if (typeof initRow !== "function") return;

    document.querySelectorAll(".team__members-slider").forEach((teamHost) => {
      const teamTrack = teamHost.querySelector(".team__members-track");
      initRow({
        host: teamHost,
        track: teamTrack,
        slideSelector: ".team__member-slide, .swiper-slide",
        desktopArrowsOnly: true,
        fullBleed: false,
        fullBleedMedia: "(max-width: 1024px)",
        fullBleedRightOnly: false,
        sidePadGetter: getServicesSidePad,
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTeamSliders);
  } else {
    initTeamSliders();
  }
})();
