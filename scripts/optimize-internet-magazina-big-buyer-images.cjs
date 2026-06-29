#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const assetsDir = path.join(
  process.env.USERPROFILE || "",
  ".cursor",
  "projects",
  "c-Users-Projects-serenity",
  "assets",
);
const mainSrc =
  process.env.BIG_BUYER_MAIN_SRC ||
  path.join(
    assetsDir,
    "c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_rtaqBqAT9eecCRKO1dwAG8qYJ8HZXRWhZB9orgax-7c3b3f7d-446f-4bee-a29c-af4d256e6cea.png",
  );
const bgSrc =
  process.env.BIG_BUYER_BG_SRC ||
  path.join(
    assetsDir,
    "c__Users_________AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_9fh4fcSqhJqL5MGi0ZZIDoYUdHvvjXNtZBxkcJuG-2d6a4120-a7dd-4b73-a58e-df95e864e342.png",
  );
const outDir = path.join(root, "img", "services", "sozdanie-internet-magazina", "cases");
const slideOut = path.join(outDir, "big-buyer-slide.webp");
const bgOut = path.join(outDir, "big-buyer-bg.webp");

for (const f of [mainSrc, bgSrc]) {
  if (!fs.existsSync(f)) {
    console.error("Не найден:", f);
    process.exit(1);
  }
}

fs.mkdirSync(outDir, { recursive: true });

async function run() {
  await sharp(mainSrc)
    .resize({ width: 906, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(slideOut);

  await sharp(bgSrc)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(bgOut);

  console.log("slide", (fs.statSync(slideOut).size / 1024).toFixed(0), "KB →", path.relative(root, slideOut));
  console.log("bg", (fs.statSync(bgOut).size / 1024).toFixed(0), "KB →", path.relative(root, bgOut));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
