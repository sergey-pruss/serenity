/**
 * WebGL-градиент для .page-constructor__bg (паритет с Nuxt).
 * Статический HTML с prod часто уже содержит class="isLoaded" на canvas — нельзя
 * использовать этот класс как признак «уже инициализировано».
 */
(function () {
  "use strict";

  function initPageConstructorGradient() {
    var canvas = document.getElementById("gradient-canvas");
    if (!canvas || canvas.getAttribute("data-sa-gradient-init") === "1") return;
    canvas.setAttribute("data-sa-gradient-init", "1");
    if (typeof Gradient !== "undefined") {
      try {
        new Gradient({ canvas: "#gradient-canvas" });
      } catch (e) {}
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageConstructorGradient, { once: true });
  } else {
    initPageConstructorGradient();
  }
})();
