import fs from "fs";
import path from "path";

/**
 * Скачивает svgset.svg с продакшена в publish/ — иначе <use xlink:href> с другого origin блокируется.
 */
export async function writeSvgsetFromOrigin(originRaw, destPath) {
  const o = originRaw.replace(/\/+$/, "");
  const url = `${o}/svgset.svg`;
  const res = await fetch(url, {
    headers: { "user-agent": "serenity_lanidng-capture/1" },
  });
  if (!res.ok) throw new Error(`svgset.svg: ${res.status} ${res.statusText}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.writeFile(destPath, buf);
  return destPath;
}
