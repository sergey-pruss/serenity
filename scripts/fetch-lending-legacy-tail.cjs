#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { extractFaqPairsFromHtml } = require("./lib/build-faq-page-jsonld.cjs");

const OUT = path.join(__dirname, "..", "json", "services", "lending_na_tilda", "legacy-tail.json");

function decode(s) {
  return String(s || "")
    .replace(/\\u002F/g, "/")
    .replace(/\\n/g, "\n")
    .replace(/&nbsp;/g, " ");
}

async function main() {
  const res = await fetch("https://serenity.agency/lending_na_tilda");
  const html = await res.text();
  const out = { faq: extractFaqPairsFromHtml(html) };

  const idx = html.indexOf("window.__NUXT__=");
  if (idx >= 0) {
    const end = html.indexOf("</script>", idx);
    const raw = html.slice(idx + "window.__NUXT__=".length, end).trim();
    try {
      // eslint-disable-next-line no-new-func
      const nuxt = new Function(`return ${raw}`)();
      const data = nuxt.data?.[0] || nuxt.state?.page || {};
      const layout = data.layout || data;
      const blocks = Array.isArray(layout.blocks) ? layout.blocks : Object.values(layout.blocks || {});
      for (const b of blocks) {
        const name = String(b?.name || b?.component || "").toLowerCase();
        const props = b?.props || b?.data || b;
        if (name.includes("faq") || props?.questions) {
          const qs = props.questions || props.items || [];
          for (const q of qs) {
            if (q?.question && q?.answer) out.faq.push({ question: decode(q.question), answer: decode(q.answer) });
          }
        }
        if (name.includes("team") && props?.title) out.teamTitle = decode(props.title);
        if (name.includes("team") && props?.description) out.teamDesc = decode(props.description);
        if (name.includes("order") || name.includes("form")) {
          if (props?.title) out.leadTitle = decode(props.title);
          if (props?.lead || props?.description) out.leadText = decode(props.lead || props.description);
        }
        if (name.includes("blog") && props?.description) out.blogDesc = decode(props.description);
        if (name.includes("synergy") && Array.isArray(props?.cards)) {
          out.synergyCards = props.cards.map((c) => ({
            title: decode(c.title || c.name),
            description: decode(c.description),
            href: c.href || c.link || c.url,
          }));
        }
      }
    } catch (e) {
      out.nuxtParseError = String(e.message || e);
    }
  }

  const team = html.match(/team__head[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  if (team && !out.teamTitle) {
    out.teamTitle = decode(team[1]).trim();
    out.teamDesc = decode(team[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  }

  if (!out.leadTitle) {
    const lead = html.match(/Заказать лендинг[^<"]{0,80}/);
    if (lead) out.leadTitle = decode(lead[0]).trim();
  }

  const leadText = html.match(/data-role="lead"[^>]*>([\s\S]*?)<\/div>/);
  if (leadText && !out.leadText) out.leadText = decode(leadText[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

  const blogDesc = html.match(/blog-block-mainstr[\s\S]*?services__description[^>]*>([^<]+)</i);
  if (blogDesc && !out.blogDesc) out.blogDesc = decode(blogDesc[1]).trim();

  if (!out.synergyCards?.length) {
    const synergyCards = [];
    for (const m of html.matchAll(
      /synergy__card-container[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?synergy__card-description[^>]*>([\s\S]*?)<\/p>[\s\S]*?href="([^"]+)"/gi,
    )) {
      synergyCards.push({
        title: decode(m[1]).trim(),
        description: decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
        href: m[3],
      });
    }
    if (synergyCards.length) out.synergyCards = synergyCards;
  }

  if (!out.faq.length) {
    for (const m of html.matchAll(/question:"([^"]+)"[\s\S]*?answer:"([^"]+)"/g)) {
      out.faq.push({ question: decode(m[1]), answer: decode(m[2]) });
    }
  }

  if (!out.leadTitle || out.leadTitle.includes("стоимость TILDA")) {
    out.leadTitle = "Заказать лендинг на Tilda";
  }

  const leadM = html.match(/lead:"([^"]{20,300})"/) || html.match(/Оставьте заявку[^"]{0,200}/);
  if (leadM && !out.leadText) out.leadText = decode(leadM[1] || leadM[0]);

  const teamBlock = html.match(
    /Разработка лендинга[^"]{20,400}/,
  );
  if (teamBlock) out.teamDesc = decode(teamBlock[0]);

  if (!out.synergyCards?.length) {
    for (const m of html.matchAll(/name:"([^"]+)"[^}]*description:"([^"]{10,300})"[^}]*link:"([^"]+)"/g)) {
      const title = decode(m[1]);
      if (!/корпоратив|интернет|seo|контекст|конверси|поддержк|маркетинг|таргет|стратег/i.test(title)) continue;
      out.synergyCards = out.synergyCards || [];
      out.synergyCards.push({ title, description: decode(m[2]), href: m[3] });
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(process.cwd(), OUT));
  console.log("faq:", out.faq.length, "synergy:", out.synergyCards?.length || 0, "team:", !!out.teamTitle);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
