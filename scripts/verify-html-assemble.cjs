/**
 * Проверка: index.html собран без «висячих» маркеров и содержит ключевые секции главной.
 * Запуск: npm run test:html-assemble
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const blogIndexPath = path.join(root, "blog", "index.html");

(() => {
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "assemble-html.cjs"), "build"], {
    cwd: root,
    encoding: "utf8",
  });
  assert(r.status === 0, `assemble-html failed: ${r.stderr || r.stdout}`);

  const rTypo = spawnSync(process.execPath, [path.join(root, "scripts", "typography-nbsp.cjs")], {
    cwd: root,
    encoding: "utf8",
  });
  assert(rTypo.status === 0, `typography-nbsp failed: ${rTypo.stderr || rTypo.stdout}`);

  const rBlogPages = spawnSync(process.execPath, [path.join(root, "scripts", "build-blog-pages.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  assert(rBlogPages.status === 0, `build-blog-pages failed: ${rBlogPages.stderr || rBlogPages.stdout}`);

  const html = fs.readFileSync(indexPath, "utf8");
  assert(!html.includes("<!-- @partial"), "В index.html остались незаменённые маркеры @partial");

  const blogHtml = fs.readFileSync(blogIndexPath, "utf8");
  assert(!blogHtml.includes("<!-- @partial"), "В blog/index.html остались незаменённые маркеры @partial");
  assert(
    blogHtml.includes("https://serenity.agency/career/vacancy") && blogHtml.includes("Вакансии"),
    "blog/index.html — шапка из partials (пункт «Вакансии» как на главной)"
  );

  assert(html.includes('class="header page-top'), "header (page-top)");
  assert(html.includes("services-section_main-structure"), "services-section_main-structure");
  assert(html.includes("blog-block-mainstr"), "blog-block-mainstr");
  assert(html.includes("clients-wrapper_main-structure"), "clients-wrapper_main-structure");
  assert(html.includes("live-marketing-block-wr"), "live-marketing-block-wr");
  assert(html.includes("footer-modern"), "footer-modern");
  assert(html.includes("footer-burger-chrome.css"), "подключён footer-burger-chrome.css");

  assert(
    html.includes('data-typography-nbsp="1"'),
    "после сборки должна быть типографика (data-typography-nbsp)"
  );
  assert(
    html.includes("в&nbsp;маркетинг"),
    "nbsp после предлога «в» (кейс Складно и др.)"
  );

  assert(html.includes("ym(30205029"), "Яндекс.Метрика (ym init) в index.html");

  const footMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
  assert(footMatch, "footer block");
  const footerHtml = footMatch[0];
  const sendDup = /class="footer-modern__request"[^>]*>[\s\S]*?Отправить заявку/.test(footerHtml);
  assert(!sendDup, "в <footer> не должно быть дубля «Отправить заявку» рядом с телефоном");

  console.log("verify-html-assemble: ok");
})();
