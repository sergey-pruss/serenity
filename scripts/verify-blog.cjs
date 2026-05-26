/**
 * Проверка /blog: данные, фильтр по рубрике, пагинация.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const { startStaticServer, root } = require("./lib/test-static-server.cjs");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

async function assertMobileCategoriesReachViewportEdge(page, url) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("#blog-categories .categories__link", { timeout: 20000 });
  const metrics = await page.evaluate(async () => {
    const categories = document.querySelector("#blog-categories");
    const links = Array.from(categories?.querySelectorAll(".categories__link") || []);
    if (!categories || links.length === 0) return { ok: false };
    categories.scrollLeft = categories.scrollWidth;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const cr = categories.getBoundingClientRect();
    const last = links[links.length - 1].getBoundingClientRect();
    return {
      ok: true,
      viewportWidth: window.innerWidth,
      scrollRoom: categories.scrollWidth - categories.clientWidth,
      scrollLeft: categories.scrollLeft,
      containerRightGap: window.innerWidth - cr.right,
      lastRightGap: window.innerWidth - last.right,
    };
  });
  assert(metrics.ok, "Mobile blog categories: не найдены категории");
  assert(
    Math.abs(metrics.containerRightGap) <= 2,
    `Mobile blog categories: scrollport должен доходить до правого края viewport, gap=${metrics.containerRightGap}`,
  );
  if (metrics.scrollRoom > 2) {
    assert(
      Math.abs(metrics.lastRightGap) <= 3,
      `Mobile blog categories: последний пункт должен докручиваться до края без пустого хвоста, gap=${metrics.lastRightGap}`,
    );
  }
}

(async () => {
  const blogIndexPath = path.join(root, "blog", "index.html");
  const blogTemplate = fs.readFileSync(blogIndexPath, "utf8");
  assert(blogTemplate.includes("ym(30205029"), "blog/index.html — Яндекс.Метрика");
  assert(
    (blogTemplate.match(/ym\s*\(\s*30205029\s*,\s*"init"/g) || []).length === 1,
    "blog/index.html — ровно один ym(30205029, \"init\")",
  );
  assert(
    (blogTemplate.match(/\/_sa\/js\/leave-request-cta\.js/g) || []).length === 1,
    "blog/index.html — ровно один leave-request-cta.js",
  );
  assert(
    !blogTemplate.includes("blog-article-figma.css"),
    "листинг блога не должен тянуть CSS статей (blog-article-figma)",
  );
  assert(
    !blogTemplate.includes("<!--@blog-json-preload-->"),
    "blog/index.html: после сборки не должно оставаться <!--@blog-json-preload--> — выполни node scripts/build-blog-pages.mjs",
  );
  assert(
    /<link[^>]+rel="preload"[^>]+href="\/_sa\/json\/blog-pages\/all\/page-1\.json"[^>]+as="fetch"/.test(blogTemplate),
    "blog/index.html — preload JSON первой страницы ленты «все»",
  );

  const payload = JSON.parse(fs.readFileSync(path.join(root, "json/blogs-all.json"), "utf8"));
  const posts = payload.posts || [];
  const total = posts.length;
  assert(total >= 1, "json/blogs-all.json пустой — выполни: node scripts/build-blog-data.mjs");

  const articleCount = posts.filter((p) => (p.tagCodesNorm || []).includes("article")).length;
  assert(articleCount >= 1, "Нет постов с рубрикой «Статьи» (article) для проверки фильтра");

  const perPage = 24;
  const port = 20300 + (process.pid % 200);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1520, height: 900 } });
  let server;

  try {
    server = await startStaticServer(port);
    await page.goto(`http://127.0.0.1:${port}/blog/`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("#blog-grid .case", { timeout: 20000 });

    const countCards = async () => page.$$eval("#blog-grid .case", (els) => els.length);

    const nFirst = await countCards();
    assert(nFirst === Math.min(total, perPage), `Страница 1: ожидается ${Math.min(total, perPage)} карточек, получено ${nFirst}`);

    await page.click('a.categories__link[href="/blog/article/"]');
    await page.waitForURL(/\/blog\/article\/?$/);
    await page.waitForFunction(
      ([expected, ps]) =>
        document.querySelectorAll("#blog-grid .case").length === Math.min(expected, ps),
      [articleCount, perPage],
    );
    const nArt = await countCards();
    assert(nArt === Math.min(articleCount, perPage), `После фильтра «Статьи»: ожидается ${Math.min(articleCount, perPage)}, получено ${nArt}`);

    await page.click('a.categories__link[href="/blog/"]');
    await page.waitForURL(/\/blog\/?$/);
    await page.waitForFunction(
      ([expected, ps]) =>
        document.querySelectorAll("#blog-grid .case").length === Math.min(expected, ps),
      [total, perPage],
    );

    const totalPages = Math.ceil(total / perPage);
    if (totalPages >= 2) {
      await page.click('a.case-all-pagination__page[href="/blog/2/"]');
      await page.waitForURL(/\/blog\/2\/?$/);
      const expectedP2 = Math.min(perPage, total - perPage);
      await page.waitForFunction(
        (n) => document.querySelectorAll("#blog-grid .case").length === n,
        expectedP2,
      );
      const p2 = await countCards();
      assert(p2 === expectedP2, `Страница 2: ожидается ${expectedP2} карточек, получено ${p2}`);
      const p2Desc = await page.$eval('meta[name="description"]', (el) => el.getAttribute("content") || "");
      assert(
        /Страница\s+2\./.test(p2Desc),
        `meta description страницы 2 блога должна содержать «Страница 2.», получено: ${p2Desc.slice(0, 120)}…`,
      );
    }

    const manifestPath = path.join(root, "json", "blog-articles-manifest.json");
    if (fs.existsSync(manifestPath)) {
      const slugs = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const firstSlug = Array.isArray(slugs) && slugs.length ? String(slugs[0]).trim() : "";
      if (firstSlug) {
        const articleHtmlPath = path.join(root, "blog", "article", firstSlug, "index.html");
        if (fs.existsSync(articleHtmlPath)) {
          const articleHtml = fs.readFileSync(articleHtmlPath, "utf8");
          assert(!/\{\{BLOG_/.test(articleHtml), "статья: в HTML не должно быть плейсхолдеров {{BLOG_*}}");
          const titleMatch = articleHtml.match(/<title>([^<]*)<\/title>/);
          assert(titleMatch, "статья: ожидается <title>");
          assert(
            titleMatch[1].includes(" — Блог — Serenity"),
            `статья: <title> с суффиксом « — Блог — Serenity», получено: ${titleMatch[1]}`,
          );
        }
      }
    }

    const ppmPath = path.join(root, "json", "blog-post-pages-manifest.json");
    if (fs.existsSync(ppmPath)) {
      const ppm = JSON.parse(fs.readFileSync(ppmPath, "utf8"));
      const firstCase = Array.isArray(ppm) ? ppm.find((e) => e && e.segment === "case" && e.slug) : null;
      if (firstCase) {
        const staticPath = path.join(root, "blog", firstCase.segment, firstCase.slug, "index.html");
        assert(fs.existsSync(staticPath), `ожидается ${staticPath} — npm run build:blog / build-blog-article-pages`);
        await page.goto(
          `http://127.0.0.1:${port}/blog/${firstCase.segment}/${firstCase.slug}/`,
          { waitUntil: "load", timeout: 60000 },
        );
        await page.waitForSelector("h1.case-all-heading-title", { timeout: 20000 });
        const t = await page.$eval("h1.case-all-heading-title", (el) => (el.textContent || "").trim());
        assert(t.length >= 3, "страница блог-кейса: заголовок hero");
      }
    }

    await assertMobileCategoriesReachViewportEdge(page, `http://127.0.0.1:${port}/blog/`);

    console.log(
      `OK: /blog — всего постов ${total}, фильтр «Статьи» (${articleCount}), до ${perPage} карточек на страницу`,
    );
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.close();
  }
})();
