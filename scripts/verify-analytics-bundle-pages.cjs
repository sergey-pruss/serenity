/**
 * На всех собранных публичных страницах (корень, blog/**, case/all/**)
 * ровно один init Яндекс.Метрики и один подключаемый leave-request-cta.js.
 * Запуск: npm run test:analytics-bundle
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

const ymInitRe = /ym\s*\(\s*30205029\s*,\s*"init"/g;
const leaveCtaRe = /\/_sa\/js\/leave-request-cta\.js/g;

function collectIndexHtmlFiles(dir, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectIndexHtmlFiles(p, acc);
    else if (e.name === "index.html") acc.push(p);
  }
}

function checkFile(absPath) {
  const rel = path.relative(root, absPath);
  const html = fs.readFileSync(absPath, "utf8");
  const ym = (html.match(ymInitRe) || []).length;
  assert(ym === 1, `${rel}: ожидается ровно один ym(30205029, "init"), получено ${ym}`);
  const leave = (html.match(leaveCtaRe) || []).length;
  assert(leave === 1, `${rel}: ожидается ровно один /_sa/js/leave-request-cta.js, получено ${leave}`);
}

(() => {
  const files = [];
  const indexRoot = path.join(root, "index.html");
  assert(fs.existsSync(indexRoot), "index.html отсутствует");
  files.push(indexRoot);
  collectIndexHtmlFiles(path.join(root, "blog"), files);
  collectIndexHtmlFiles(path.join(root, "case", "all"), files);

  assert(files.length >= 10, `слишком мало index.html для проверки (${files.length})`);

  for (const f of files) checkFile(f);

  console.log(`verify-analytics-bundle-pages: ok (${files.length} файлов)`);
})();
