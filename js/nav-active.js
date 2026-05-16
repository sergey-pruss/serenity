/**
 * Автоподсветка активного пункта в верхнем меню по текущему URL.
 */
(() => {
  const normalizePath = (p) => (p || "/").replace(/\/+$/, "") || "/";

  const routeKeyFromPath = (pathname) => {
    const p = normalizePath(pathname);
    if (p === "/" || p === "/index.html") return "home";
    if (p.startsWith("/case")) return "case";
    if (p.startsWith("/services")) return "services";
    if (p.startsWith("/about")) return "about";
    if (p.startsWith("/blog")) return "blog";
    if (p.startsWith("/career")) return "career";
    if (p.startsWith("/contacts")) return "contacts";
    return "";
  };

  const keyFromHref = (href) => {
    try {
      const u = new URL(href, window.location.origin);
      return routeKeyFromPath(u.pathname);
    } catch {
      return "";
    }
  };

  const currentKey = routeKeyFromPath(window.location.pathname);

  const logoLink = document.querySelector(".header__logo a[href='/']");
  if (logoLink && currentKey !== "home") {
    logoLink.classList.remove("nuxt-link-active", "nuxt-link-exact-active");
    logoLink.removeAttribute("aria-current");
  }

  if (!currentKey || currentKey === "home") return;

  const links = document.querySelectorAll(".navigation-list a, .navigation-new__list a");
  links.forEach((a) => {
    a.classList.remove("nuxt-link-active", "nuxt-link-exact-active");
    if (keyFromHref(a.getAttribute("href") || "") === currentKey) {
      a.classList.add("nuxt-link-active");
    }
  });
})();

