#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "json", "services", "pr", "legacy-content.json");

function decode(s) {
  return String(s || "")
    .replace(/\\u002F/g, "/")
    .replace(/\\u2028/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseNuxtBlocks(raw) {
  const blocks = [];
  const re = /component:"([^"]+)",name:"([^"]*)",data:\{([\s\S]*?)\}\}\}\}/g;
  let m;
  while ((m = re.exec(raw))) {
    blocks.push({ component: m[1], name: m[2], raw: m[3] });
  }
  return blocks;
}

function extractString(raw, key) {
  const re = new RegExp(`${key}:"((?:\\\\.|[^"\\\\])*)"`);
  const m = raw.match(re);
  return m ? decode(m[1]) : "";
}

function extractFacts(raw) {
  const items = [];
  for (const m of raw.matchAll(/number:"(\d+)",text:"((?:\\.|[^"\\])*)"/g)) {
    items.push({ number: m[1], text: decode(m[2]) });
  }
  return items;
}

function extractContentBlocks(raw) {
  const blocks = [];
  for (const m of raw.matchAll(/name:"((?:\\.|[^"\\])*)",description:"((?:\\.|[^"\\])*)"/g)) {
    blocks.push({ name: decode(m[1]), description: decode(m[2]) });
  }
  return blocks;
}

function extractCases(raw) {
  const cases = [];
  for (const m of raw.matchAll(
    /title:"((?:\\.|[^"\\])*)",subtitle:"((?:\\.|[^"\\])*)",description:"((?:\\.|[^"\\])*)",link:"((?:\\.|[^"\\])*)",image:"((?:\\.|[^"\\])*)"/g,
  )) {
    cases.push({
      title: decode(m[1]),
      subtitle: decode(m[2]),
      description: decode(m[3]),
      link: decode(m[4]),
      image: decode(m[5]),
    });
  }
  return cases;
}

function extractAdvantages(raw) {
  const out = { title: "", description: "", items: [] };
  out.title = extractString(raw, "title");
  out.description = extractString(raw, "description");
  for (const m of raw.matchAll(/title:"(\d+)",text:"((?:\\.|[^"\\])*)",image:"((?:\\.|[^"\\])*)"/g)) {
    out.items.push({ value: m[1], text: decode(m[2]), image: decode(m[3]) });
  }
  return out;
}

async function main() {
  const html = await (await fetch("https://serenity.agency/pr")).text();
  const idx = html.indexOf("window.__NUXT__=");
  const raw = html.slice(idx + "window.__NUXT__=".length, html.indexOf("</script>", idx)).trim();

  const heroDesk = raw.match(/desctop_picture:"([^"]+)"/)?.[1];
  const heroMob = raw.match(/mobile_full_screen_picture:"([^"]+)"/)?.[1];
  const heroTitle = extractString(raw.slice(0, 3000), "title") || "PR-продвижение";
  const heroSubtitle = extractString(raw.slice(0, 5000), "subtitle");

  const out = {
    hero: { title: heroTitle, subtitle: heroSubtitle, desk: heroDesk, mob: heroMob },
    blocks: [],
  };

  const parts = raw.split(/component:"/);
  for (const part of parts.slice(1)) {
    const component = part.slice(0, part.indexOf('"'));
    const chunk = part;

    if (component === "facts-block") {
      const title = chunk.match(/title:"((?:\\.|[^"\\])*)"/)?.[1];
      const desc = chunk.match(/description:\{main:"((?:\\.|[^"\\])*)"/)?.[1];
      out.blocks.push({
        type: "facts",
        title: decode(title),
        description: decode(desc),
        facts: extractFacts(chunk),
      });
    }

    if (component === "content-block") {
      const title = chunk.match(/title:"((?:\\.|[^"\\])*)"/)?.[1];
      const descMain = chunk.match(/description:\{main:"((?:\\.|[^"\\])*)"/)?.[1];
      const descs = [];
      for (const m of chunk.matchAll(/descriptions:\[([^\]]*)\]/g)) {
        for (const d of m[1].matchAll(/"((?:\\.|[^"\\])*)"/g)) descs.push(decode(d[1]));
      }
      const numbered = chunk.match(/number:"(\d+)"/)?.[1] || null;
      const items = extractContentBlocks(chunk);
      const figure = chunk.match(/image:"([^"]+\.(?:webp|png|jpg))"/)?.[1];
      out.blocks.push({
        type: "content-block",
        number: numbered,
        title: decode(title),
        description: decode(descMain),
        descriptions: descs,
        items,
        figure,
      });
    }

    if (component === "cases-block") {
      out.blocks.push({ type: "cases-block", cases: extractCases(chunk) });
    }

    if (component === "advantages-block" || component === "advantage-block") {
      out.blocks.push({ type: "advantages", ...extractAdvantages(chunk) });
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log("Wrote", path.relative(process.cwd(), OUT));
  console.log(
    "blocks:",
    out.blocks.map((b) => `${b.type}${b.title ? ": " + b.title.slice(0, 40) : ""}${b.cases ? " (" + b.cases.length + ")" : ""}`),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
