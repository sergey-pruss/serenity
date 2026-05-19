#!/usr/bin/env node
import {
  yandexOrganicUrlFromNodeText,
  yandexOrganicUrlFromPathText,
} from "./lib/yandex-organic-url.mjs";

const cases = [
  [
    "serenity.agency › korporativnyj_sajt",
    "https://serenity.agency/korporativnyj_sajt",
  ],
  [
    "serenity.agency > korporativnyj_sajt",
    "https://serenity.agency/korporativnyj_sajt",
  ],
  [
    "serenity.agency\nkorporativnyj_sajt",
    "https://serenity.agency/korporativnyj_sajt",
  ],
];

for (const [input, want] of cases) {
  const got =
    yandexOrganicUrlFromPathText(input) || yandexOrganicUrlFromNodeText(input);
  if (got !== want) {
    console.error("FAIL:", JSON.stringify(input), "→", got, "ожидалось", want);
    process.exit(1);
  }
}

console.log("OK: парсер пути Яндекса (serenity.agency › korporativnyj_sajt)");
