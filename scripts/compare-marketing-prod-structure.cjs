#!/usr/bin/env node
/**
 * Сверка структуры секций /services/marketing с prod-capture (tmp/marketing-prod-full.html).
 */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const root = path.resolve(__dirname, "..");
const capturePath = path.join(root, "tmp", "marketing-prod-full.html");
const builtPath = path.join(root, "html", "partials", "services", "marketing-kontekst-sections.html");

function expandShowMore(html) {
  let s = html;
  s = s.replace(/<p class="show-more"[^>]*>Подробнее<\/p>\s*/gi, "");
  s = s.replace(/\sclass="hide"/gi, "");
  return s;
}

function innerText($, el) {
  return $(el).text().replace(/\s+/g, " ").trim();
}

function pushCard(cards, { title, body }) {
  if (!title) return;
  cards.push({ title, body: body || "" });
}

function pushGridItems($, cards, $root) {
  const pushGi = ($gi) => {
    const title = innerText($, $gi.find("h4").first());
    if (!title) return;
    const body = innerText($, $gi.find("p.small, p").first());
    pushCard(cards, { title, body });
  };
  $root.children(".grid__item").each((_, gi) => pushGi($(gi)));
  $root.children(".grid, .grid_two, .grid_three").each((_, grid) => {
    $(grid).children(".grid__item").each((__, gi) => pushGi($(gi)));
  });
}

function dedupeCards(cards) {
  const seen = new Set();
  return cards.filter((c) => {
    const key = `${c.title}\0${c.body}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function processSliceChild($, cards, $node) {
  if ($node.hasClass("sites-slider") || $node.hasClass("cm-about")) return;
  if ($node.hasClass("service-section")) {
    $node.children().each((_, ch) => processSliceChild($, cards, $(ch)));
    return;
  }
  if ($node.hasClass("section-info")) {
    const $wrap = $node.find("> .section-info__title-wrap").first();
    const h3 = innerText($, $wrap.find("> h3").first());
    if (h3) {
      let body = innerText($, $wrap.find("p.small").first());
      if (!body) body = innerText($, $node.find("> .section-info__discription p").first());
      pushCard(cards, { title: h3, body });
    }
    pushGridItems($, cards, $node);
    return;
  }
  if ($node.hasClass("cm-section") || $node.hasClass("cm-promotion")) {
    if ($node.children(".section-info").length) {
      $node.children().each((_, ch) => processSliceChild($, cards, $(ch)));
      return;
    }
    const h3 = innerText($, $node.children("h3").first());
    if (h3) {
      let body = innerText($, $node.children("p").first());
      pushCard(cards, { title: h3, body });
    }
    pushGridItems($, cards, $node);
    return;
  }
  if ($node.hasClass("grid_three") || ($node.hasClass("grid") && $node.children(".grid__item").length)) {
    pushGridItems($, cards, $node);
  }
}

function collectCards($, $slice) {
  const cards = [];
  $slice.children().each((_, ch) => processSliceChild($, cards, $(ch)));
  return dedupeCards(cards).map((c) => c.title);
}

function sliceStrategySection($, row) {
    const $slice = $("<div></div>");
  let capture = false;
  row.children().each((_, child) => {
    const $ch = $(child);
    if ($ch.hasClass("cm-about")) return;
    const h2 = innerText($, $ch.find("> .section-info__title-wrap > h2").first());
    if (h2 === "Cтратегия") capture = true;
    if (!capture) return;
    if ($ch.hasClass("service-section")) {
      if (innerText($, $ch.find(".section-info__title-wrap > h2").first()) === "Бренд") return false;
      $ch.children().each((__, sub) => $slice.append($(sub).clone()));
      return;
    }
    if (h2 === "Бренд") return false;
    $slice.append($ch.clone());
  });
  return $slice;
}

function sliceBrandSection($, row) {
  const $slice = $("<div></div>");
  const $brandSec = row.children(".service-section").last();
  if (!$brandSec.length) return $slice;
  $brandSec.children().each((_, ch) => {
    const $ch = $(ch);
    if ($ch.find(".cm-swiper").length && !$ch.find("h3, h4").length) return;
    $slice.append($ch.clone());
  });
  return $slice;
}

function sliceRow1Parts($, $row) {
  const $sec = $row.children(".service-section").first();
  const channels = $("<div></div>");
  const seo = $("<div></div>");
  const sales = $("<div></div>");
  if (!$sec.length) return { channels, seo, sales };
  $sec.children().each((i, child) => {
    const $ch = $(child);
    if ($ch.hasClass("service-section")) {
      const h2 = innerText(
        $,
        $ch
          .find(
            ".section-info__title-wrap > h2, .cm-promotion__caption > h2, > .section-info > h2.title, h2.h2.title",
          )
          .first(),
      );
      if (h2 === "SEO") seo.append($ch.clone());
      if (h2 === "Продажи") sales.append($ch.clone());
      return;
    }
    if (i >= 10 && i <= 11) channels.append($ch.clone());
  });
  return { channels, seo, sales };
}

function collectGridCardTitles($, $slice) {
  const titles = [];
  $slice.find(".grid__item").each((_, gi) => {
    const title = innerText($, $(gi).find("h4").first());
    if (title) titles.push(title);
  });
  return titles;
}

function prodPromotionCards($, row) {
  const $sec = row.children(".service-section").first();
  const titles = [];
  for (let i = 5; i <= 8; i += 1) {
    const $slice = $("<div></div>");
    $slice.append($sec.children().eq(i).clone());
    titles.push(...collectGridCardTitles($, $slice));
  }
  return [...new Set(titles)];
}

function prodStrategyCards($, row) {
  const $g1 = $("<div></div>");
  $g1.append(row.children().eq(2).clone());
  const cards1 = collectCards($, $g1);
  const $nested = row.children().eq(4);
  const $g2 = $("<div></div>");
  $g2.append($nested.find(".section-info").eq(1).clone());
  const cards2 = collectCards($, $g2);
  return [...cards1, ...cards2];
}

function prodBrandCards($, row) {
  const brandSec = row.children(".service-section").last();
  const $cs = $("<div></div>");
  $cs.append(brandSec.children().eq(1).clone());
  const $brand = $("<div></div>");
  $brand.append(brandSec.children().eq(4).clone());
  return [...collectCards($, $cs), ...collectCards($, $brand)];
}

function prodExpectation($) {
  const rows = $(".cm-page .row").toArray().map((el) => $(el));
  const out = {};
  if (rows[0]) {
    out["Cтратегия"] = prodStrategyCards($, rows[0]);
    out["Бренд"] = prodBrandCards($, rows[0]);
  }
  if (rows[1]) {
    const pre = prodPrePromotion($, rows[1]);
    out["__pre_awareness__"] = pre.awareness;
    out["__pre_site__"] = pre.site;
    out["__pre_sites_slider__"] = pre.sitesSlider ? ["ok"] : [];
    const { channels, seo, sales } = sliceRow1Parts($, rows[1]);
    out["Измеримое продвижение"] = prodPromotionCards($, rows[1]);
    out["Каналы контент-маркетинга"] = collectCards($, channels);
    out["SEO"] = collectCards($, seo);
    out["Продажи"] = collectCards($, sales);
  }
  return out;
}

function prodPrePromotion($, row) {
  const $sec = row.children(".service-section").first();
  if (!$sec.length) return { awareness: [], site: [], sitesSlider: false };
  const $a = $("<motion.div></motion.div>");
  $a.append($sec.children().eq(1).clone());
  const $s = $("<motion.div></motion.div>");
  $s.append($sec.children().eq(3).clone());
  return {
    awareness: collectCards($, $a),
    site: collectCards($, $s),
    sitesSlider: $sec.children().eq(4).hasClass("sites-slider"),
  };
}

function builtPrePromotion($) {
  const $sec = $(".marketing-pre-promotion-section").first();
  if (!$sec.length) return { awareness: [], site: [], sitesSlider: false };
  const grids = $sec.find(".content-block__grid--desc");
  const awareness = [];
  const site = [];
  grids
    .eq(0)
    .find(".block__name")
    .each((_, el) => awareness.push(innerText($, el)));
  grids
    .eq(1)
    .find(".block__name")
    .each((_, el) => site.push(innerText($, el)));
  return {
    awareness,
    site,
    sitesSlider: $sec.find(".marketing-sites-slider").length > 0,
  };
}

function builtPromotionCards($) {
  const $sec = $(".marketing-promotion-section").first();
  if (!$sec.length) return [];
  const cards = [];
  $sec.find(".content-block__grid--desc .block__name").each((_, el) => cards.push(innerText($, el)));
  return cards;
}

function builtHasSalesFigure($) {
  return $(".marketing-sales-figure img").length > 0;
}

function prodHasSalesFigure($) {
  return $(".cm-sales .sales-figure img").length > 0;
}

function builtSections($) {
  const out = {};
  $(".marketing-kontekst-section").each((_, sec) => {
    const $sec = $(sec);
    if ($sec.hasClass("marketing-pre-promotion-section")) return;
    if ($sec.hasClass("marketing-promotion-section")) return;
    let title = innerText($, $sec.find(".numbered-header__title").first());
    if (!title && $sec.hasClass("marketing-brand-section")) {
      title = innerText($, $sec.find(".marketing-section__inner-header h2").first());
    }
    const cards = [];
    $sec
      .find(".content-block__grid--desc .block__name")
      .each((__, el) => cards.push(innerText($, el)));
    out[title] = cards;
  });
  return out;
}

function main() {
  if (!fs.existsSync(capturePath)) {
    console.error("Нет capture:", capturePath);
    process.exit(1);
  }
  if (!fs.existsSync(builtPath)) {
    console.error("Нет built:", builtPath);
    process.exit(1);
  }
  const $p = cheerio.load(expandShowMore(fs.readFileSync(capturePath, "utf8")), { decodeEntities: false });
  const $b = cheerio.load(fs.readFileSync(builtPath, "utf8"), { decodeEntities: false });

  const prod = prodExpectation($p);
  const built = builtSections($b);
  built["Измеримое продвижение"] = builtPromotionCards($b);
  const builtPre = builtPrePromotion($b);
  const prodH2 = Object.keys(prod).filter((k) => !k.startsWith("__pre_"));
  const builtH2 = Object.keys(built);

  let failed = false;
  const compareList = (label, a, c) => {
    if (a.length !== c.length) {
      console.error(`FAIL: «${label}» карточек prod=${a.length} built=${c.length}`);
      failed = true;
      return;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== c[i]) {
        console.error(`FAIL: «${label}» [${i}] prod="${a[i]}" built="${c[i]}"`);
        failed = true;
      }
    }
  };
  compareList("Увеличение известности бренда", prod["__pre_awareness__"] || [], builtPre.awareness);
  compareList("Сайт (карточки)", prod["__pre_site__"] || [], builtPre.site);
  if ((prod["__pre_sites_slider__"] || []).length !== (builtPre.sitesSlider ? 1 : 0)) {
    console.error("FAIL: sites-slider prod/built");
    failed = true;
  }
  if (prodHasSalesFigure($p) !== builtHasSalesFigure($b)) {
    console.error("FAIL: sales-figure prod/built");
    failed = true;
  }
  const prodOrder = [
    "Cтратегия",
    "Бренд",
    "Измеримое продвижение",
    "Каналы контент-маркетинга",
    "SEO",
    "Продажи",
  ];
  const builtOrder = [];
  $b(".marketing-kontekst-section").each((_, sec) => {
    const $sec = $b(sec);
    if ($sec.hasClass("marketing-pre-promotion-section")) return;
    if ($sec.hasClass("marketing-promotion-section")) {
      builtOrder.push("Измеримое продвижение");
      return;
    }
    let title = innerText($b, $sec.find(".numbered-header__title").first());
    if (!title && $sec.hasClass("marketing-brand-section")) {
      title = innerText($b, $sec.find(".marketing-section__inner-header h2").first());
    }
    if (title) builtOrder.push(title);
  });
  if (builtOrder.join("|") !== prodOrder.join("|")) {
    console.error("FAIL: порядок секций");
    console.error("  prod:", prodOrder.join(" → "));
    console.error("  built:", builtOrder.join(" → "));
    failed = true;
  }
  for (const title of prodH2) {
    if (!built[title]) {
      console.error(`FAIL: нет секции «${title}»`);
      failed = true;
      continue;
    }
    const a = prod[title];
    const c = built[title];
    if (a.length !== c.length) {
      console.error(`FAIL: «${title}» карточек prod=${a.length} built=${c.length}`);
      failed = true;
    }
    for (let i = 0; i < Math.min(a.length, c.length); i += 1) {
      if (a[i] !== c[i]) {
        console.error(`FAIL: «${title}» [${i}] prod="${a[i]}" built="${c[i]}"`);
        failed = true;
      }
    }
  }
  for (const title of builtH2) {
    if (!prod[title]) {
      console.error(`FAIL: лишняя секция «${title}»`);
      failed = true;
    }
  }
  if (failed) {
    console.error("\nProd:", JSON.stringify(prod, null, 2));
    console.error("\nBuilt:", JSON.stringify(built, null, 2));
    process.exit(1);
  }
  console.log("compare-marketing-prod-structure: ok", prodH2.length, "секций");
  for (const t of prodH2) console.log(`  ${t}: ${prod[t].length} карточек`);
}

main();
