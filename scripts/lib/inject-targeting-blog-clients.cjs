/**
 * Вставка «Блог» + «Наши клиенты» после FAQ на /targeting (как /kontekstnaya_reklama).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");

const TARGETING_BLOG_MARK = "targeting-blog-section";
const TARGETING_CLIENTS_MARK = "targeting-clients-section";
const FAQ_SECTION_START = '<section class="page-constructor__section targeting-faq-section">';
const FAQ_BLOCK_TAIL = "</script></div></section>";
const CASES_MORE_MAIN = "more-case-wr more-case-wr__main";
const CASES_CLASS_PREFIX = 'class="more-case-wr';
const SECTION_OPEN = '<section class="page-constructor__section';

function blogPartialPath() {
  return path.join(root, "html", "partials", "services", "blog-targeting.html");
}

function clientsPartialPath() {
  return path.join(root, "html", "partials", "services", "clients-targeting.html");
}

function findTargetingCasesAnchorIndex(mainHtml) {
  const iMain = mainHtml.indexOf(CASES_MORE_MAIN);
  if (iMain >= 0) return iMain;
  return mainHtml.indexOf(CASES_CLASS_PREFIX);
}

function extractTargetingFaqBlock(mainHtml) {
  let i0 = mainHtml.indexOf(FAQ_SECTION_START);
  if (i0 < 0) i0 = mainHtml.indexOf('id="targeting-faq-mounted"');
  if (i0 < 0) return { start: -1, end: -1 };
  const secStart = mainHtml.lastIndexOf(SECTION_OPEN, i0);
  if (secStart < 0) return { start: -1, end: -1 };
  const iClose = mainHtml.indexOf(FAQ_BLOCK_TAIL, i0);
  const end =
    iClose >= 0
      ? iClose + FAQ_BLOCK_TAIL.length
      : mainHtml.indexOf("</section>", i0) + "</section>".length;
  return { start: secStart, end };
}

function stripTargetingBlogClientsBlock(mainHtml) {
  const markerStart = mainHtml.indexOf("<!-- TARGETING-BLOG-CLIENTS-START -->");
  if (markerStart >= 0) {
    const markerEnd = mainHtml.indexOf("<!-- TARGETING-BLOG-CLIENTS-END -->", markerStart);
    if (markerEnd >= 0) {
      return (
        mainHtml.slice(0, markerStart) +
        mainHtml.slice(markerEnd + "<!-- TARGETING-BLOG-CLIENTS-END -->".length)
      );
    }
  }
  const blogIdx = mainHtml.indexOf(TARGETING_BLOG_MARK);
  if (blogIdx < 0) return mainHtml;
  const secStart = mainHtml.lastIndexOf(SECTION_OPEN, blogIdx);
  const clientsIdx = mainHtml.indexOf(TARGETING_CLIENTS_MARK, blogIdx);
  if (clientsIdx < 0) {
    const blogEnd = mainHtml.indexOf("</section>", blogIdx) + "</section>".length;
    return mainHtml.slice(0, secStart) + mainHtml.slice(blogEnd);
  }
  const clientsEnd = mainHtml.indexOf("</section>", clientsIdx) + "</section>".length;
  return mainHtml.slice(0, secStart) + mainHtml.slice(clientsEnd);
}

function injectTargetingBlogClientsAfterFaq(mainHtml) {
  const blogPath = blogPartialPath();
  const clientsPath = clientsPartialPath();
  if (!fs.existsSync(blogPath) || !fs.existsSync(clientsPath)) {
    console.warn("inject-targeting-blog-clients: нет partial — пропуск");
    return mainHtml;
  }
  let out = stripTargetingBlogClientsBlock(mainHtml);
  const { end: faqEnd } = extractTargetingFaqBlock(out);
  if (faqEnd < 0) {
    console.warn("inject-targeting-blog-clients: FAQ не найден");
    return out;
  }
  const iCases = findTargetingCasesAnchorIndex(out);
  if (iCases < 0 || iCases <= faqEnd) {
    console.warn("inject-targeting-blog-clients: кейсы не найдены после FAQ");
    return out;
  }
  const blog = fs.readFileSync(blogPath, "utf8").trim();
  const clients = fs.readFileSync(clientsPath, "utf8").trim();
  const block =
    `\n<!-- TARGETING-BLOG-CLIENTS-START -->\n${blog}\n${clients}\n<!-- TARGETING-BLOG-CLIENTS-END -->\n`;
  return `${out.slice(0, faqEnd)}${block}${out.slice(faqEnd)}`;
}

module.exports = {
  injectTargetingBlogClientsAfterFaq,
  stripTargetingBlogClientsBlock,
};
