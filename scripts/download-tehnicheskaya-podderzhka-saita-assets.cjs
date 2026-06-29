#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const slug = "tehnicheskaya-podderzhka-saita";
const baseDir = path.join(root, "img", "services", slug);

const files = [
  {
    url: "https://serenity.agency/storage/4s066B1vEY48R8MNhT3XayMrkWi299p6TUDQl8wz.webp",
    dest: "hero/hero.webp",
  },
  {
    url: "https://serenity.agency/storage/4s066B1vEY48R8MNhT3XayMrkWi299p6TUDQl8wz.webp",
    dest: "hero/hero__m.webp",
  },
  {
    url: "https://serenity.agency/storage/nlCX3BAqmakkd0yvxjv9YJH1tlSg8CrR8gqjR9OP.webp",
    dest: "cases/darkrain-bg.webp",
  },
  {
    url: "https://serenity.agency/storage/mIEQNgdEPTyak929o9QtcxC8rBL1TL03RZRQ5EQh.mp4",
    dest: "cases/darkrain-video.mp4",
  },
  {
    url: "https://serenity.agency/storage/BVCXP3CYQti2CIjsJuy0xbsQIvvv8B7i0HZAY0Xa.webp",
    dest: "cases/skladno-bg.webp",
  },
  {
    url: "https://serenity.agency/storage/W2Bh4fbFxStjwcQzt2PmbHY3iBEc3oCMQOwMlm6k.webp",
    dest: "cases/skladno-slide.webp",
  },
  {
    url: "https://serenity.agency/storage/Rt77nFu092hupbR5yoMqYp00VdjhZAG70E3qdXw2.webp",
    dest: "cases/sytnie-bg.webp",
  },
  {
    url: "https://serenity.agency/storage/dYo1fIa8NL08CN8t2IEdsWxX4XcqtdeGwcigzJ2W.webp",
    dest: "cases/sytnie-slide.webp",
  },
  { url: "https://serenity.agency/storage/pmmVTzhTM6RwHB9YAQaKCJ7Z4TwKNaCVB1jueGig.webp", dest: "team/akkaunt-menedzher.webp" },
  { url: "https://serenity.agency/storage/n0wdId2zxflU0Fwnmj1LH5seWEtH8PD8UXolbPaI.webp", dest: "team/prodzhekt-menedzher.webp" },
  { url: "https://serenity.agency/storage/iJyYX8DQGRIAX0MwYzoggOLp5oihfZdOCb6fQ6p1.webp", dest: "team/backend-developer.webp" },
  { url: "https://serenity.agency/storage/kP336LGe3ROliAZN3ihoC1qbMBrvq4bdLqimG9hf.webp", dest: "team/frontend-developer.webp" },
  { url: "https://serenity.agency/storage/zTTVZTYZt2SrcuvUJijRjEhQ1dqN0Z5K0SJhKMKE.webp", dest: "team/qa-specialist.webp" },
  { url: "https://serenity.agency/storage/XoTdwJt6PH9BgXKc66i8b5ouh3Hq97TrFgJDA7Td.webp", dest: "team/devops-inzhener.webp" },
  { url: "https://serenity.agency/storage/QLIMcCSZl3sHdVOd20K9ucm8aX2MUjB6HaKuMuhY.webp", dest: "team/analitik.webp" },
  { url: "https://serenity.agency/storage/Uq8ztrSEhBuklUn1GschXj0fGr1ONxT6PMZ60SQy.webp", dest: "team/dizajner.webp" },
  { url: "https://serenity.agency/storage/EWlTRe4dfyhMHq65IZ3i5MFaaLG9r0gWlJqeviBn.webp", dest: "team/lider.webp" },
  { url: "https://serenity.agency/storage/cdNtX2PJI6bmI9M8P9zx0TR50w9x9jfiJIo2yJ84.webp", dest: "synergy/sajty-desc.webp" },
  { url: "https://serenity.agency/storage/ojW6huDiN1qKUTlHOcGWGY9lyu4DsW7hENE5JliN.webp", dest: "synergy/sajty-tablet.webp" },
  { url: "https://serenity.agency/storage/DPNySxBo00WYhYT5LDFPoVTgRlnBHBRUZdWp5ThV.webp", dest: "synergy/sajty-mobile.webp" },
  { url: "https://serenity.agency/storage/dHAk61RjjbWTrQZXHNrhUUbfpnLCko8kjpq9EB7y.webp", dest: "synergy/korporativnyj-desc.webp" },
  { url: "https://serenity.agency/storage/BrosxDZs3gJ4uJbBBKDPRpzU3bVwPrDi26cxwH0q.webp", dest: "synergy/korporativnyj-tablet.webp" },
  { url: "https://serenity.agency/storage/SGNIfEhkWLya6iM6hwmyGqH0DnHxLb6eJ1XqxE03.webp", dest: "synergy/korporativnyj-mobile.webp" },
  { url: "https://serenity.agency/storage/OUdgcJRpn718VWJamQ7F7JKSRLAepjult1jhCMYU.webp", dest: "synergy/internet-magazin-desc.webp" },
  { url: "https://serenity.agency/storage/y4BxscSMhfi5dQvXB2KInddqpdfG6naDk57wOXB6.webp", dest: "synergy/internet-magazin-tablet.webp" },
  { url: "https://serenity.agency/storage/hkHQiNKEUKEslUHsrXBxh024zwT765f25sUEuCfC.webp", dest: "synergy/internet-magazin-mobile.webp" },
];

async function downloadOne({ url, dest }) {
  const out = path.join(baseDir, dest);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log("ok", path.relative(root, out), buf.length);
}

async function main() {
  for (const file of files) {
    await downloadOne(file);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
