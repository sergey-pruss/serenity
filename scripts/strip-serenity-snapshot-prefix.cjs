"use strict";

/** Совпадает с nginx `location ^~ /_sa/` и Worker (src/worker.mjs). */
const PREFIX = "/_sa";

/** `/css/foo` или `/_sa/css/foo` → нормализует для доступа к файлам в корне репозитория (`css/foo`). */
function stripSerenitySnapshotPrefix(urlPathWithoutQuery) {
  let p = urlPathWithoutQuery || "/";
  if (p === PREFIX || p.startsWith(`${PREFIX}/`)) {
    return p.slice(PREFIX.length) || "/";
  }
  return p;
}

module.exports = { stripSerenitySnapshotPrefix, SERENITY_SNAPSHOT_PREFIX: PREFIX };
