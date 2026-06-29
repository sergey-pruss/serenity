#!/usr/bin/env node
/**
 * Локальный превью /tehnicheskaya-podderzhka-saita (полный static root, как npm run dev).
 */
const { startStaticServer } = require("./lib/test-static-server.cjs");

const PORT = Number(process.env.PORT || 18996);
const PAGE = "/tehnicheskaya-podderzhka-saita";

startStaticServer(PORT)
  .then(() => {
    console.log(`tehpod preview: http://127.0.0.1:${PORT}${PAGE}`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
