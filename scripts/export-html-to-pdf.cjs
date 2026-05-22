#!/usr/bin/env node
/**
 * HTML → PDF через Playwright (A4, фон и обложка).
 * Usage: node scripts/export-html-to-pdf.cjs <input.html> [output.pdf]
 */
const fs = require("fs");
const path = require("path");

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/export-html-to-pdf.cjs <input.html> [output.pdf]");
  process.exit(1);
}

const inputPath = path.resolve(input);
const outputPath = path.resolve(
  process.argv[3] || inputPath.replace(/\.html?$/i, ".pdf")
);

if (!fs.existsSync(inputPath)) {
  console.error("File not found:", inputPath);
  process.exit(1);
}

async function main() {
  const { chromium } = require("playwright");
  const chromePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  const executablePath = chromePaths.find((p) => fs.existsSync(p));

  const launchOpts = { headless: true };
  if (executablePath) launchOpts.executablePath = executablePath;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage();
  await page.goto(`file://${inputPath}`, { waitUntil: "networkidle" });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log("PDF:", outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
