import fs from "node:fs";
import path from "node:path";

const MIN_BYTES = 2048;

/**
 * Полный HTML главной из снимка.
 * Приоритет: `publish/index.frozen.html` (после `npm run freeze:publish`) → `publish/index.html`.
 */
export function loadPublishHomeDocument(): string | null {
  const root = process.cwd();
  const frozen = path.join(root, "publish", "index.frozen.html");
  const normal = path.join(root, "publish", "index.html");

  for (const file of [frozen, normal]) {
    try {
      if (!fs.existsSync(file)) continue;
      const st = fs.statSync(file);
      if (!st.isFile() || st.size < MIN_BYTES) continue;
      return fs.readFileSync(file, "utf8");
    } catch {
      /* next */
    }
  }
  return null;
}
