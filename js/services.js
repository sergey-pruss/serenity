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

  function initApproach() {
    var section = document.querySelector("[data-services-approach]");
    if (!section) return;

    var stepKeys = ["strategy", "branding", "performance"];
    var current = -1;
    var rafId = 0;
    var bounds = null;
    /* mobile breakpoint совпадает с CSS: ≤1024px sticky выключен */
    var mq = window.matchMedia("(max-width: 1024px)");

    function calcBounds() {
      /* Используем __virtual как контейнер sticky-хода: sticky стартует
         когда __virtual.top достигает 0 во viewport и едет ровно
         (virtual.offsetHeight − innerHeight) пикселей. */
      var virtual = section.querySelector("[data-approach-virtual]") || section;
      var top = virtual.getBoundingClientRect().top + window.scrollY;
      var travel = Math.max(1, virtual.offsetHeight - window.innerHeight);
      bounds = { top: top, travel: travel };
    }

    function setStep(index) {
      if (index === current) return;
      current = index;
      section.setAttribute("data-active", stepKeys[index]);
    }

    function tick() {
      rafId = 0;
      if (mq.matches) return;
      if (!bounds) calcBounds();
      var scrolled = window.scrollY - bounds.top;
      var progress = Math.min(1, Math.max(0, scrolled / bounds.travel));
      var step = Math.min(stepKeys.length - 1, Math.floor(progress * stepKeys.length));
      setStep(step);
    }

    function onScroll() {
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    var resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        bounds = null;
        onScroll();
      }, 150);
    }

    if (!mq.matches) {
      calcBounds();
      tick();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initGradient();
      resetNavActive();
      initAnchorNav();
      initApproach();
    });
  } else {
    initGradient();
    resetNavActive();
    initAnchorNav();
    initApproach();
  }
})();
