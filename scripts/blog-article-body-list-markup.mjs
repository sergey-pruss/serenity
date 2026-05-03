/**
 * Единая типографика списков в теле статей: класс `sa-blog-body-list` на ul/ol
 * (см. css/sections/blog-article-figma.css) и превращение «псевдо-списка»
 * в одном `<p>` с переносами `1. …<br>2. …` в настоящий `<ol>`.
 */

const LIST_CLASS = "sa-blog-body-list";

/**
 * Добавляет класс ко всем `<ul>` / `<ol>` в HTML (идемпотентно).
 * @param {string} html
 * @returns {string}
 */
export function addSaBlogBodyListClassToLists(html) {
  const hasListClass = new RegExp(`\\b${LIST_CLASS}\\b`);
  return String(html || "").replace(/<(ul|ol)\b([^>]*)>/gi, (full, tag, attrs) => {
    const a = attrs || "";
    if (hasListClass.test(a)) return full;
    const dq = a.match(/\bclass\s*=\s*"([^"]*)"/i);
    if (dq) {
      const merged = `${dq[1].trim()} ${LIST_CLASS}`.trim();
      return `<${tag}${a.replace(/\bclass\s*=\s*"[^"]*"/i, `class="${merged}"`)}>`;
    }
    const sq = a.match(/\bclass\s*=\s*'([^']*)'/i);
    if (sq) {
      const merged = `${sq[1].trim()} ${LIST_CLASS}`.trim();
      return `<${tag}${a.replace(/\bclass\s*=\s*'[^']*'/i, `class='${merged}'`)}>`;
    }
    const t = a.trim();
    if (t) return `<${tag} ${t} class="${LIST_CLASS}">`;
    return `<${tag} class="${LIST_CLASS}">`;
  });
}

/**
 * `<p>1. a<br />2. b…</p>` без других тегов → `<ol class="sa-blog-body-list"><li>…</li>…</ol>`.
 * @param {string} html
 * @returns {string}
 */
export function convertPlainBrNumberedParagraphsToOl(html) {
  return String(html || "").replace(/<p(\b[^>]*)>([\s\S]*?)<\/p>/gi, (full, attrs, inner) => {
    if (!/<br\s*\/?>/i.test(inner)) return full;
    const parts = inner
      .split(/<br\s*\/?>/gi)
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length < 2) return full;
    const lineRe = /^\d+\.\s*/;
    if (!parts.every((p) => lineRe.test(p))) return full;
    const innerNoBr = inner.replace(/<br\s*\/?>/gi, "");
    if (/<[^>]+>/.test(innerNoBr)) return full;
    const items = parts
      .map((p) => p.replace(/^\d+\.\s*/, "").trim())
      .map((text) => `<li>${text}</li>`)
      .join("");
    return `<ol class="${LIST_CLASS}">${items}</ol>`;
  });
}

/**
 * @param {string} html
 * @returns {string}
 */
export function applyBlogArticleBodyListMarkup(html) {
  let out = convertPlainBrNumberedParagraphsToOl(html);
  out = addSaBlogBodyListClassToLists(out);
  return out;
}
