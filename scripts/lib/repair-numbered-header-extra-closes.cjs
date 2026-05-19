/**
 * После inject subtitle иногда четыре </div> подряд перед desc-сеткой — ломается .page-constructor.
 * Норма: три </div> (subtitle-column, .row, .numbered-header).
 */
function repairNumberedHeaderExtraCloses(html) {
  const divClose = String.fromCharCode(60, 47, 100, 105, 118, 62);
  const three = divClose + divClose + divClose;
  return html.replace(
    /(<p[^>]*class="content-block__desc"[^>]*>[\s\S]*?<\/p>)((?:<\/div>){4,})\s*(<div[^>]*class="content-block__grid content-block__grid--desc)/g,
    (_, p, _closes, descOpen) => p + three + " " + descOpen,
  );
}

module.exports = { repairNumberedHeaderExtraCloses };
