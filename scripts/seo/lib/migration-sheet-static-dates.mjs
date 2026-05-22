/**
 * Дата go-live на serenity.agency (новый статический контур):
 * первый коммит, где путь появился в map $is_new_page (nginx/routing.conf).
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..", "..");
const ROUTING_FILE = "nginx/routing.conf";

/** pathname → уникальная строка правила в routing.conf */
export const ROUTING_GO_LIVE_SNIPPET = {
  "/": "~^/$",
  "/blog": "~^/blog(/|$)",
  "/services": "~^/services/?$",
  "/services/marketing": "services/marketing/?$",
  "/kontekstnaya_reklama": "kontekstnaya_reklama/?$",
  "/targeting": "~^/targeting/?$",
};

/** @type {Map<string, string>} */
const cache = new Map();

/**
 * @param {string} urlPath
 * @returns {string} YYYY-MM-DD или ""
 */
export function staticGoLiveDateFromRouting(urlPath) {
  const snippet = ROUTING_GO_LIVE_SNIPPET[urlPath];
  if (!snippet) return "";
  if (cache.has(urlPath)) return cache.get(urlPath) || "";

  let iso = "";
  try {
    const hashes = execSync(
      `git log --reverse --format=%H -- ${ROUTING_FILE}`,
      { cwd: ROOT, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
    )
      .trim()
      .split("\n")
      .filter(Boolean);

    let wasAbsent = true;
    for (const hash of hashes) {
      let content = "";
      try {
        content = execSync(`git show ${hash}:${ROUTING_FILE}`, {
          cwd: ROOT,
          encoding: "utf8",
          maxBuffer: 512 * 1024,
        });
      } catch {
        continue;
      }
      const present = content.includes(snippet);
      if (present && wasAbsent) {
        iso = execSync(`git show -s --format=%cI ${hash}`, {
          cwd: ROOT,
          encoding: "utf8",
        }).trim();
      }
      wasAbsent = !present;
    }
  } catch {
    iso = "";
  }

  const date = iso ? iso.slice(0, 10) : "";
  cache.set(urlPath, date);
  return date;
}

/**
 * @param {string} urlPath
 * @param {string} site
 * @param {string} [fallback]
 */
export function migrationStaticDate(urlPath, site, fallback = "") {
  if (site !== "новый") return fallback;
  return staticGoLiveDateFromRouting(urlPath) || fallback;
}
