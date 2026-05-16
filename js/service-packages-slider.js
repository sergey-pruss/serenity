/**
 * Слайдер «Пакеты» (.prices__packages-slider) — только страницы услуг.
 * Требует app.js (SerenityNativeRow.initRow) и native-row-scroll.css.
 */
(function () {
  "use strict";

  function preparePackagesTrack(track) {
    if (!track) return;
    track.style.transform = "";
    track.style.removeProperty("transform");
    track.style.transition = "none";
    track.querySelectorAll(".prices__packages-slide.swiper-slide").forEach((slide) => {
      slide.style.removeProperty("width");
    });
  }

  function initPackagesSliders() {
    const { initRow, getServicesSidePad } = window.SerenityNativeRow || {};
    if (typeof initRow !== "function") return;

    document.querySelectorAll(".prices__packages-slider").forEach((packagesHost) => {
      const packagesTrack = packagesHost.querySelector(".prices__packages-track");
      preparePackagesTrack(packagesTrack);
      initRow({
        host: packagesHost,
        track: packagesTrack,
        slideSelector: ".prices__packages-slide",
        desktopArrowsOnly: true,
        fullBleed: false,
        fullBleedMedia: "(max-width: 1024px)",
        fullBleedRightOnly: true,
        sidePadGetter: getServicesSidePad,
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPackagesSliders);
  } else {
    initPackagesSliders();
  }
})();
