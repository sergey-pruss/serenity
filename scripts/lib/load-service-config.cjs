/**
 * Загрузка json/services/<slug>/service.config.json — единый контракт шаблона услуги.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const servicesRoot = path.join(root, "json", "services");

const KNOWN_SLUGS = ["kontekstnaya_reklama", "targeting", "marketing"];

function listServiceSlugs() {
  if (!fs.existsSync(servicesRoot)) return [];
  return fs
    .readdirSync(servicesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(servicesRoot, d.name, "service.config.json")))
    .map((d) => d.name)
    .sort();
}

function loadServiceConfig(slug) {
  if (!slug || typeof slug !== "string") {
    throw new Error("loadServiceConfig: нужен slug услуги");
  }
  const configPath = path.join(servicesRoot, slug, "service.config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Нет service.config.json: ${path.relative(root, configPath)}`);
  }
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (raw.slug !== slug) {
    throw new Error(`${configPath}: slug в файле (${raw.slug}) не совпадает с каталогом (${slug})`);
  }
  const cfg = resolvePaths(raw);
  return cfg;
}

function resolvePaths(cfg) {
  const slug = cfg.slug;
  const a = cfg.assemble;
  if (!a || typeof a !== "object") {
    throw new Error(`service.config.json (${slug}): нет блока assemble`);
  }

  const partials = a.partials || {};
  const requiredPartials = ["faq", "inlineLead", "moreCases", "awards", "synergy"];
  for (const key of requiredPartials) {
    if (!partials[key]) {
      throw new Error(`service.config.json (${slug}): assemble.partials.${key}`);
    }
  }

  const markers = a.markers || {};
  const requiredMarkers = ["mainStart", "mainEnd", "cssBundleStart", "cssBundleEnd"];
  for (const key of requiredMarkers) {
    if (!markers[key]) {
      throw new Error(`service.config.json (${slug}): assemble.markers.${key}`);
    }
  }

  if (!a.pageDir || !a.layoutSourceEnv || !a.tmpFull || !a.tmpParity) {
    throw new Error(`service.config.json (${slug}): assemble.pageDir / layoutSourceEnv / tmpFull / tmpParity`);
  }

  const pageDir = a.pageDir;
  const indexPath = path.join(root, pageDir, "index.html");
  const manifestPath = path.join(root, pageDir, "nuxt-css-manifest.json");
  const tmpFullPath = path.join(root, "tmp", a.tmpFull);
  const tmpParityPath = path.join(root, "tmp", a.tmpParity);

  const partialPaths = {};
  for (const [key, file] of Object.entries(partials)) {
    partialPaths[key] = path.join(root, "html", "partials", "services", file);
  }

  const contentDir = path.join(servicesRoot, slug);
  const content = {};
  if (cfg.content) {
    for (const [key, file] of Object.entries(cfg.content)) {
      content[key] = path.join(contentDir, file);
    }
  }

  return {
    ...cfg,
    root,
    indexPath,
    manifestPath,
    tmpFullPath,
    tmpParityPath,
    partialPaths,
    contentPaths: content,
    assemble: {
      ...a,
      indexPath,
      manifestPath,
      tmpFullPath,
      tmpParityPath,
      partialPaths,
    },
  };
}

module.exports = {
  root,
  servicesRoot,
  KNOWN_SLUGS,
  listServiceSlugs,
  loadServiceConfig,
};
