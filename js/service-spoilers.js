/**
 * Статические страницы услуг: раскрытие FAQ (.spoiler) без Vue.
 * Корни: #kontekst-faq-mounted, #targeting-faq-mounted (и будущие *-faq-mounted).
 */
(function () {
  var ROOT_IDS = ["kontekst-faq-mounted", "targeting-faq-mounted"];

  function innerHeight(content) {
    var inner = content.querySelector(".spoiler__content-inner");
    return inner ? inner.scrollHeight : content.scrollHeight;
  }

  function bind(spoiler) {
    var head = spoiler.querySelector(".spoiler__head");
    var content = spoiler.querySelector(".spoiler__content");
    var ico = spoiler.querySelector(".spoiler__ico");
    if (!head || !content) return;

    var open = false;

    content.addEventListener("transitionend", function (e) {
      if (e.propertyName !== "height") return;
      if (open) content.style.height = "auto";
    });

    head.addEventListener("click", function () {
      if (open) {
        var h = innerHeight(content);
        if (content.style.height === "auto") {
          content.style.height = h + "px";
          void content.offsetHeight;
        }
        content.style.height = "0px";
        if (ico) ico.classList.remove("spoiler__ico--open");
        open = false;
      } else {
        content.style.height = "0px";
        void content.offsetHeight;
        content.style.height = innerHeight(content) + "px";
        if (ico) ico.classList.add("spoiler__ico--open");
        open = true;
      }
    });
  }

  function initRoot(root) {
    if (!root) return;
    var list = root.querySelectorAll(".spoiler");
    for (var i = 0; i < list.length; i++) bind(list[i]);
  }

  for (var r = 0; r < ROOT_IDS.length; r++) {
    initRoot(document.getElementById(ROOT_IDS[r]));
  }
})();
