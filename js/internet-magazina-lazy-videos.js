/**
 * /sozdanie-internet-magazina — отложенная загрузка тяжёлых видео (trio + movies-block).
 * В viewport trio-ролики стартуют параллельно (без очереди).
 */
(function () {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const slowNetwork = /(^2g$|^slow-2g$|^3g$)/i.test(String(connection?.effectiveType || ""));

  const hydrateVideo = (video) => {
    if (!video || video.dataset.lazyLoaded === "1") return;
    const src = video.getAttribute("data-src") || "";
    if (!src) return;
    video.setAttribute("src", src);
    video.removeAttribute("data-src");
    video.dataset.lazyLoaded = "1";
    video.load();
    video.play().catch(() => {});
  };

  const initMoviesBlockLazy = () => {
    const video = document.querySelector(
      ".internet-magazina-movies-block-section video[data-lazy-video='1']",
    );
    if (!video) return;

    if (!("IntersectionObserver" in window)) {
      hydrateVideo(video);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          hydrateVideo(entry.target);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "200px 0px", threshold: 0.1 },
    );

    io.observe(video);
  };

  const initTrioLazy = () => {
    const root = document.querySelector(".internet-magazina-trio-mocks");
    if (!root) return;

    const videos = Array.from(root.querySelectorAll("video[data-lazy-trio-video='1']"));
    if (videos.length === 0) return;

    const loadAll = () => {
      if (saveData || slowNetwork) return;
      videos.forEach((video) => hydrateVideo(video));
    };

    if (!("IntersectionObserver" in window)) {
      loadAll();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadAll();
          io.disconnect();
        });
      },
      { rootMargin: "120px 0px", threshold: 0.05 },
    );

    io.observe(root);
  };

  const init = () => {
    initMoviesBlockLazy();
    initTrioLazy();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
