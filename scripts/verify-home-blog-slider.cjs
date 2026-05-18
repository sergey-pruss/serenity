/**
 * Слайдер «Блог» на главной: 9 карточек = posts[0..8] из json/blogs-all.json.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const partialPath = path.join(root, "html", "partials", "section-blog.html");
const blogsPath = path.join(root, "json", "blogs-all.json");
const SLIDE_COUNT = 9;

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const partial = fs.readFileSync(partialPath, "utf8");
const { posts } = JSON.parse(fs.readFileSync(blogsPath, "utf8"));
assert(Array.isArray(posts) && posts.length >= SLIDE_COUNT, `В blogs-all.json меньше ${SLIDE_COUNT} постов`);

const norm = (href) => {
  let h = String(href || "").trim();
  if (h.endsWith("/")) h = h.slice(0, -1);
  return h;
};

const expected = posts.slice(0, SLIDE_COUNT).map((p) => norm(p.href));
const block = partial.split("blog-box__last")[0];
const found = [...block.matchAll(/href="(\/blog\/article\/[^"]+)"/g)].map((m) => m[1]);

assert(found.length === SLIDE_COUNT, `В слайдере ${found.length} статей, ожидается ${SLIDE_COUNT}`);

for (let i = 0; i < SLIDE_COUNT; i++) {
  assert(
    found[i] === expected[i],
    `Карточка ${i + 1}: ${found[i] || "(нет)"} ≠ ${expected[i]} (${posts[i].description})`,
  );
  const img = posts[i].media?.image;
  if (img && img.startsWith("/_sa/")) {
    const rel = img.replace(/^\/_sa\//, "");
    assert(fs.existsSync(path.join(root, rel)), `Нет файла превью: ${rel}`);
  }
}

console.log(`OK: слайдер «Блог» на главной — ${SLIDE_COUNT} карточек совпадают с лентой /blog/`);
