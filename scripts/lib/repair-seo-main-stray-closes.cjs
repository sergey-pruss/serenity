/**
 * Prod-срез /seo: лишние </div></div></section> после «Команда» и блока пакетов.
 */
function repairSeoStrayClosesAfterTeam(html) {
  return html.replace(
    /<\/section>\s*<\/div>\s*<\/div>\s*<\/section>\s*(<section class="page-constructor__section[^"]*"><div[^>]*class="dies modern")/,
    "</section>\n$1",
  );
}

function repairSeoStrayClosesAfterPackages(html) {
  let out = html.replace(
    /<\/script>\s*<\/div>\s*<\/div>\s*<\/section>\s*<\/div>\s*<\/div>\s*<\/section>\s*(<section class="page-constructor__section"><div[^>]*class="clients-wrapper")/,
    "</script></div></div></section>\n$1",
  );
  /* Внешняя section «Пакеты» (.dies): prod закрывает только вложенную section — добираем обёртку. */
  out = out.replace(
    /(<\/script>\s*<\/div>\s*<\/div>\s*<\/section>)\s*(<section class="page-constructor__section"><div[^>]*class="clients-wrapper")/,
    "$1</section>\n$2",
  );
  return out;
}

/** clients-seo: prod-срез иногда без финального </div> — хвост (FAQ, блог…) вложен в .clients-wrapper. */
function repairSeoClientsExtraClose(html) {
  return html.replace(
    /(<section class="page-constructor__section seo-clients-section">[\s\S]*?)<\/section>/,
    (m, head) => {
      const inner = head.slice(head.indexOf(">") + 1);
      let depth = 0;
      for (const token of inner.match(/<\/?div/g) || []) {
        depth += token === "<div" ? 1 : -1;
      }
      if (depth <= 0) return m;
      return `${head}${"</div>".repeat(depth)}\n</section>`;
    },
  );
}

function repairSeoMainStrayCloses(html) {
  let out = repairSeoStrayClosesAfterTeam(html);
  out = repairSeoStrayClosesAfterPackages(out);
  out = repairSeoClientsExtraClose(out);
  return out;
}

module.exports = {
  repairSeoStrayClosesAfterTeam,
  repairSeoStrayClosesAfterPackages,
  repairSeoMainStrayCloses,
};
