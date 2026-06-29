#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cssPath = path.join(root, "css", "sections", "service-faq.css");

function mirrorSelector(sel) {
  return sel.replace(/\.uks-faq-section/g, ".tehpod-faq-section").replace(/\.uks-faq-root/g, ".tehpod-faq-root");
}

function patchLine(line) {
  const raw = line.replace(/\r$/, "");
  if (!raw.includes(".uks-faq") || raw.includes("tehpod-faq")) return line;

  if (/\{\s*$/.test(raw)) {
    const sel = raw.replace(/\s*\{\s*$/, "");
    const indent = sel.match(/^\s*/)[0];
    const body = sel.trimEnd();
    const tehpod = mirrorSelector(body);
    return `${body},\n${indent}${tehpod} {`;
  }

  if (/,\s*$/.test(raw)) {
    const sel = raw.replace(/,\s*$/, "");
    const indent = sel.match(/^\s*/)[0];
    const body = sel.trimEnd();
    const tehpod = mirrorSelector(body);
    return `${body},\n${indent}${tehpod},`;
  }

  return line;
}

let css = fs.readFileSync(cssPath, "utf8");
if (css.includes(".tehpod-faq-root.page__container_admin,")) {
  console.log("patch-service-faq-tehpod: already patched");
  process.exit(0);
}

const patched = css
  .split("\n")
  .map(patchLine)
  .join("\n")
  .trimEnd();

const tabletFix = `

/* Планшет: расклад 3+2+2 (7 вопросов) — третья колонка без пересечения с 3-й карточкой col1 */
@media (min-width: 721px) and (max-width: 1024px) {
  .uks-faq-root .blocks__column:nth-child(3) .spoiler:nth-child(1),
  .tehpod-faq-root .blocks__column:nth-child(3) .spoiler:nth-child(1) {
    grid-row: 3;
    grid-column: 2;
  }

  .uks-faq-root .blocks__column:nth-child(3) .spoiler:nth-child(2),
  .tehpod-faq-root .blocks__column:nth-child(3) .spoiler:nth-child(2) {
    grid-row: 4;
    grid-column: 1;
  }
}
`;

if (!patched.includes(".tehpod-faq-root.page__container_admin")) {
  throw new Error("patch failed: tehpod selectors missing");
}

fs.writeFileSync(cssPath, `${patched}${tabletFix}\n`, "utf8");
console.log("patch-service-faq-tehpod: ok →", path.relative(root, cssPath));
