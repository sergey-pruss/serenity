/**
 * Заголовки этапов из импорта WP: один абзац с одним <strong>…</strong>, текст с «Этап» + номер.
 * Класс `sa-blog-stage-heading` — вертикальный ритм (см. css/sections/blog-article-prose.css).
 */

export const SA_BLOG_STAGE_HEADING_CLASS = "sa-blog-stage-heading";

const hasClassRe = new RegExp(`\\b${SA_BLOG_STAGE_HEADING_CLASS}\\b`);

function plainLeadFromHtmlFragment(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function mergeParagraphClass(attrs, className) {
  const a = attrs || "";
  const dq = a.match(/\bclass\s*=\s*"([^"]*)"/i);
  if (dq) {
    const merged = `${dq[1].trim()} ${className}`.trim();
    return a.replace(/\bclass\s*=\s*"[^"]*"/i, `class="${merged}"`);
  }
  const sq = a.match(/\bclass\s*=\s*'([^']*)'/i);
  if (sq) {
    const merged = `${sq[1].trim()} ${className}`.trim();
    return a.replace(/\bclass\s*=\s*'[^']*'/i, `class='${merged}'`);
  }
  const t = a.trim();
  if (t) return ` ${t} class="${className}"`;
  return ` class="${className}"`;
}

function isStageHeadingStrongInner(strongInner) {
  /* Иначе один абзац с несколькими <strong> и <br> (глоссарий) склеивается regex’ом с «Этап 1» ниже по тексту. */
  if (/<[a-zA-Z!/]/i.test(String(strongInner || "").replace(/&[a-zA-Z0-9#]+;/g, ""))) return false;
  const plain = plainLeadFromHtmlFragment(strongInner);
  return /^Этап\s*\d/i.test(plain);
}

/**
 * @param {string} html
 * @returns {string}
 */
export function applyBlogArticleStageHeadingMarkup(html) {
  const s = String(html || "");
  const re = /<p(\b[^>]*)>\s*<strong(\b[^>]*)>([\s\S]*?)<\/strong>\s*<\/p>/gi;
  let out = "";
  let copyFrom = 0;
  let m;
  while (copyFrom <= s.length) {
    re.lastIndex = copyFrom;
    m = re.exec(s);
    if (!m) {
      out += s.slice(copyFrom);
      break;
    }
    const full = m[0];
    const pAttrs = m[1];
    const strongAttrs = m[2];
    const strongInner = m[3];
    if (hasClassRe.test(pAttrs || "") || !isStageHeadingStrongInner(strongInner)) {
      out += s.slice(copyFrom, m.index + 1);
      copyFrom = m.index + 1;
      continue;
    }
    out += s.slice(copyFrom, m.index);
    out += `<p${mergeParagraphClass(pAttrs, SA_BLOG_STAGE_HEADING_CLASS)}><strong${strongAttrs}>${strongInner}</strong></p>`;
    copyFrom = m.index + full.length;
  }
  return out;
}
