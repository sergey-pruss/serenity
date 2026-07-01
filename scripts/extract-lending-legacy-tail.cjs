#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { extractFaqPairsFromHtml } = require("./lib/build-faq-page-jsonld.cjs");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(__dirname, "lending-legacy-snapshot.html"), "utf8");

function between(start, end) {
  const i = html.indexOf(start);
  if (i < 0) return null;
  const j = end ? html.indexOf(end, i + start.length) : -1;
  return j >= 0 ? html.slice(i, j + (end?.length || 0)) : html.slice(i, i + 4000);
}

const out = {
  hasTeam: html.includes("team__head"),
  hasClients: html.includes("clients-wrapper"),
  hasBlog: html.includes("blog-block"),
  hasMoreCases: html.includes("more-case-wr"),
  hasAwards: html.includes("home-awards") || html.includes("awards"),
  hasSynergy: html.includes("synergy__title"),
  hasForm: html.includes("forms modern") || html.includes("order-popup"),
};

const team = between('<div data-v-c03ce8dc="" class="team__head">', "</div> </div> <div data-v-c03ce8dc=\"\" class=\"row team__cards");
if (team) out.teamHead = team.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);

const titleMatch = html.match(/data-role="title"[^>]*>([^<]+)</) || html.match(/order-popup__meta[\s\S]*?<h2[^>]*>([^<]+)</);
if (titleMatch) out.leadTitle = titleMatch[1];

const leadMatch = html.match(/data-role="lead"[^>]*>([\s\S]*?)<\/div>/);
if (leadMatch) out.leadText = leadMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const synergyTitle = between("synergy__title", "</h2>");
if (synergyTitle) out.synergyTitle = synergyTitle;

const faqPairs = extractFaqPairsFromHtml(html);
out.faqCount = faqPairs.length;
out.faqQuestions = faqPairs.map((p) => p.question);

const blogDesc = html.match(/blog-block-mainstr[\s\S]*?services__description[^>]*>([^<]+)</);
if (blogDesc) out.blogDesc = blogDesc[1];

fs.writeFileSync(path.join(root, "json", "services", "lending_na_tilda", "_legacy-extract.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
