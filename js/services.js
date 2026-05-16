/* services.js — page-specific init for /services (gradient canvas).
 * Карточки услуг (.services__context-slider) — app.js (initRow).
 * Блок «Пакеты» (.prices__packages-slider) — service-packages-slider.js после app.js. */
(function () {
  "use strict";

  function initGradient() {
    var canvas = document.getElementById("gradient-canvas");
    if (!canvas || canvas.getAttribute("data-sa-gradient-init") === "1") return;
    canvas.setAttribute("data-sa-gradient-init", "1");
    if (typeof Gradient !== "undefined") {
      try { new Gradient({ canvas: "#gradient-canvas" }); } catch (e) {}
    }
  }

  function resetNavActive() {
    document.querySelectorAll(".navigation-list a, .navigation-new__list a").forEach(function (a) {
      a.classList.remove("nuxt-link-active", "nuxt-link-exact-active");
    });
  }

  function initAnchorNav() {
    document.querySelectorAll(".title-anchor__list a[href^='#']").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var id = link.getAttribute("href").slice(1);
        var target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initGradient(); resetNavActive(); initAnchorNav(); });
  } else {
    initGradient();
    resetNavActive();
    initAnchorNav();
  }
})();
