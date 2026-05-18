#!/usr/bin/env node
/**
 * URL локального dev для страниц услуг (Mac + LAN для телефона/планшета).
 */
const os = require("os");

const DEFAULT_DEV_PORT = 8895;

const SERVICE_PATHS = {
  kontekst: "/kontekstnaya_reklama",
  targeting: "/targeting",
};

function getLanIPv4Addresses() {
  const seen = new Set();
  const out = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    if (!entries) continue;
    for (const iface of entries) {
      const v4 = iface.family === "IPv4" || iface.family === 4;
      if (!v4 || iface.internal || !iface.address) continue;
      if (seen.has(iface.address)) continue;
      seen.add(iface.address);
      out.push(iface.address);
    }
  }
  return out;
}

function resolveDevPort() {
  const raw = process.env.PORT;
  if (raw != null && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_DEV_PORT;
}

/** @returns {{ port: number, localhost: Record<string, string>, lan: Array<{ host: string, kontekst: string, targeting: string }> }} */
function getDevServiceUrls() {
  const port = resolveDevPort();
  const localhost = {
    kontekst: `http://127.0.0.1:${port}${SERVICE_PATHS.kontekst}`,
    targeting: `http://127.0.0.1:${port}${SERVICE_PATHS.targeting}`,
  };
  const lan = getLanIPv4Addresses().map((host) => ({
    host,
    kontekst: `http://${host}:${port}${SERVICE_PATHS.kontekst}`,
    targeting: `http://${host}:${port}${SERVICE_PATHS.targeting}`,
  }));
  return { port, localhost, lan };
}

function formatDevServiceUrlsMarkdown() {
  const { port, localhost, lan } = getDevServiceUrls();
  const lines = [
    `Порт dev: **${port}** (запустите \`npm run dev\`, если ещё не запущен).`,
    "",
    "**Mac / эмулятор в Chrome**",
    `- Контекст: ${localhost.kontekst}`,
    `- Таргетинг: ${localhost.targeting}`,
    "",
  ];
  if (lan.length) {
    lines.push("**Телефон / планшет (та же Wi‑Fi)**");
    for (const row of lan) {
      lines.push(`- Контекст (${row.host}): ${row.kontekst}`);
      lines.push(`- Таргетинг (${row.host}): ${row.targeting}`);
    }
  } else {
    lines.push(
      "**Телефон / планшет:** подставьте IP Mac — `ipconfig getifaddr en0` — вместо `<IP>`:",
    );
    lines.push(`- http://<IP>:${port}/kontekstnaya_reklama`);
    lines.push(`- http://<IP>:${port}/targeting`);
  }
  return lines.join("\n");
}

module.exports = {
  DEFAULT_DEV_PORT,
  SERVICE_PATHS,
  getDevServiceUrls,
  formatDevServiceUrlsMarkdown,
  getLanIPv4Addresses,
};
