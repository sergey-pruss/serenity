/* services.js — page-specific init for /services (gradient canvas).
 * Services card sliders (.services__context-slider) are handled by app.js
 * via initRow (same native-scroll mechanism as homepage). */
(function () {
  "use strict";

  function initGradient() {
    var canvas = document.getElementById("gradient-canvas");
    if (!canvas || canvas.classList.contains("isLoaded")) return;
    canvas.classList.add("isLoaded");
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
