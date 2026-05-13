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

  var approachSteps = [
    {
      key: "strategy",
      title: "Правильный старт",
      text: "С помощью стратегии мы анализируем бизнес, его преимущества и опыт, слабые и сильные стороны конкурентов, потребности целевой аудитории. Стратегия становится фундаментом для инструментов брендинга и performance.",
    },
    {
      key: "branding",
      title: "Влюблять с первого взгляда",
      text: "Благодаря брендингу performance приносит лучшие результаты в долгосрочной перспективе: влюбляет аудиторию в продукт, цепляет визуалом, доносит главные посылы через контент-маркетинг, создает положительный образ компании.",
    },
    {
      key: "performance",
      title: "Найти покупателей и увеличить продажи",
      text: "Performance же налаживает коммуникацию с аудиторией и усиливает ее через различные инструменты: инфоповоды, соцсети, рекламные кампании. За счет performance мы выстраиваем бренд для клиентов.",
    },
  ];

  function initApproach() {
    var section = document.querySelector("[data-services-approach]");
    if (!section) return;
    var copy = section.querySelector("[data-services-approach-copy], [data-approach-copy]");
    var title = copy && copy.querySelector("h3");
    var text = copy && copy.querySelector("p");
    var current = -1;
    var swapTimer = 0;

    function setStep(index) {
      if (index === current || !approachSteps[index]) return;
      current = index;
      var step = approachSteps[index];
      section.setAttribute("data-active", step.key);
      if (!title || !text) return;
      window.clearTimeout(swapTimer);
      copy.style.opacity = "0";
      copy.style.transform = "translateY(16px)";
      swapTimer = window.setTimeout(function () {
        title.textContent = step.title;
        text.textContent = step.text;
        copy.style.opacity = "";
        copy.style.transform = "";
      }, 160);
    }

    function update() {
      var rect = section.getBoundingClientRect();
      var travel = Math.max(1, section.offsetHeight - window.innerHeight);
      var progress = Math.min(1, Math.max(0, -rect.top / travel));
      setStep(Math.min(approachSteps.length - 1, Math.floor(progress * approachSteps.length)));
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initGradient(); resetNavActive(); initAnchorNav(); initApproach(); });
  } else {
    initGradient();
    resetNavActive();
    initAnchorNav();
    initApproach();
  }
})();
