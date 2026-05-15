/**
 * Контракт ссылок: «Следите за нами» и соцблоки — только публичные TG/VK;
 * в форме заявки — бот TG и vk.me; константы в leave-request-cta.js не расходятся с partials.
 *
 * Зачем: раньше в экран «Спасибо» или в футер попадали те же URL, что и в «Написать в мессенджер»
 * (бот / vk.me). Разные сценарии — разные ссылки; этот скрипт ловит дрейф в шаблонах и в JS.
 *
 * Запуск: npm run test:social-links-contract
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const TG_PUBLIC = "https://t.me/serenityagency";
const TG_BOT = "https://t.me/Serenity_Agency_bot";
const VK_PUBLIC = "https://vk.com/serenity.agency";
const VK_ME = "https://vk.me/serenity.agency";
const WA = "https://wa.me/15557164521";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

/**
 * Ссылки внутри блока `footer-modern__social` (включая обёртку `footer-modern__social-icons`).
 * Ищем закрывающий `</div>` пары к открывающему блоку, а не первый `</div>` внутри (иначе
 * ломается при вложенном div ряда иконок).
 */
function hrefsInSocialBlock(html, blockClass) {
  const openRe = new RegExp(`<div[^>]*class="[^"]*\\b${blockClass}\\b[^"]*"[^>]*>`, "i");
  const open = html.match(openRe);
  assert(open, `${blockClass}: блок не найден (разметка изменилась?)`);
  let depth = 0;
  let i = open.index;
  for (; i < html.length; i += 1) {
    if (html.startsWith("<div", i)) {
      depth += 1;
    } else if (html.startsWith("</div>", i)) {
      depth -= 1;
      if (depth === 0) {
        const inner = html.slice(open.index + open[0].length, i);
        const hrefs = [];
        const hrefRe = /href="([^"]+)"/g;
        let h;
        while ((h = hrefRe.exec(inner))) hrefs.push(h[1]);
        return hrefs;
      }
    }
  }
  assert(false, `${blockClass}: не найден парный закрывающий </div>`);
}

(() => {
  const footer = read("html/partials/footer-modern.html");
  const header = read("html/partials/header.html");
  const js = read("js/leave-request-cta.js");

  assert(!footer.includes("vk.me"), "footer-modern: не должно быть vk.me (только публичная страница VK)");
  assert(!footer.includes("Serenity_Agency_bot"), "footer-modern: не должно быть ссылки на бота (только публичный канал)");
  assert(footer.includes(`href="${VK_PUBLIC}"`), "footer-modern: публичный VK");
  assert(footer.includes(`href="${TG_PUBLIC}"`), "footer-modern: публичный Telegram");

  const footerSocialHrefs = hrefsInSocialBlock(footer, "footer-modern__social");
  assert(
    footerSocialHrefs.length === 2 && footerSocialHrefs[0] === VK_PUBLIC && footerSocialHrefs[1] === TG_PUBLIC,
    `footer-modern__social: ожидаются ровно VK публичный и TG публичный, got ${JSON.stringify(footerSocialHrefs)}`,
  );

  assert(!header.includes("vk.me"), "header partial: vk.me только в форме (JS), не в статичном меню");

  const headerSocialHrefs = hrefsInSocialBlock(header, "footer-modern__social");
  assert(
    headerSocialHrefs.length === 2 && headerSocialHrefs[0] === VK_PUBLIC && headerSocialHrefs[1] === TG_PUBLIC,
    `header burger footer-modern__social: VK+TG публичные, got ${JSON.stringify(headerSocialHrefs)}`,
  );

  const btnBlock = header.match(/<div class="navigation-new__buttons"[^>]*>[\s\S]*?<\/div>/);
  assert(btnBlock, "header: блок navigation-new__buttons");
  const btnHtml = btnBlock[0];
  assert(btnHtml.includes(`href="${TG_BOT}"`), "header: «Написать в Telegram» → бот");
  assert(btnHtml.includes(`href="${WA}"`), "header: WhatsApp wa.me");
  assert(!btnHtml.includes(TG_PUBLIC), "header: в кнопках «Написать» не должно быть публичного t.me/serenityagency");
  assert(!btnHtml.includes("vk.com"), "header: в кнопках навигации не должно быть vk.com (это в соцблоке ниже)");

  assert(
    js.includes(`const TELEGRAM_PUBLIC_CHANNEL_HREF = "${TG_PUBLIC}";`),
    "leave-request-cta.js: TELEGRAM_PUBLIC_CHANNEL_HREF",
  );
  assert(
    js.includes(`const TELEGRAM_MESSENGER_BOT_HREF = "${TG_BOT}";`),
    "leave-request-cta.js: TELEGRAM_MESSENGER_BOT_HREF",
  );
  assert(js.includes(`const VK_PUBLIC_PAGE_HREF = "${VK_PUBLIC}";`), "leave-request-cta.js: VK_PUBLIC_PAGE_HREF");
  assert(js.includes(`const VK_MESSENGER_HREF = "${VK_ME}";`), "leave-request-cta.js: VK_MESSENGER_HREF");

  assert(
    js.includes('href="${TELEGRAM_PUBLIC_CHANNEL_HREF}"'),
    "leave-request-cta.js: экран «Спасибо» — шаблон с TELEGRAM_PUBLIC_CHANNEL_HREF",
  );
  assert(
    js.includes('href="${VK_PUBLIC_PAGE_HREF}"'),
    "leave-request-cta.js: экран «Спасибо» — шаблон с VK_PUBLIC_PAGE_HREF",
  );
  assert(
    js.includes('href="${TELEGRAM_MESSENGER_BOT_HREF}"'),
    "leave-request-cta.js: форма — шаблон с TELEGRAM_MESSENGER_BOT_HREF",
  );
  assert(js.includes('href="${VK_MESSENGER_HREF}"'), "leave-request-cta.js: форма — шаблон с VK_MESSENGER_HREF");

  console.log("verify-social-messenger-links-contract: ok");
})();
