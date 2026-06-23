#!/usr/bin/env node
const https = require("https");

https
  .get("https://serenity.agency/uvelichenie-konversii-saita", (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => {
      const title = d.match(/<title>([^<]+)/)?.[1];
      const desc = d.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1];
      const h1 =
        d.match(/class="c-title-block__title"[^>]*>([^<]+)/)?.[1] ||
        d.match(/class="jumbotron-img-aurora__title[^"]*"[^>]*>([^<]+)/)?.[1] ||
        d.match(/class="title-block[^"]*"[^>]*>([^<]+)/)?.[1];
      const sub =
        d.match(/class="c-title-block__subtitle"[^>]*>([^<]+)/)?.[1] ||
        d.match(/class="jumbotron-img-aurora__subtitle"[^>]*>([^<]+)/)?.[1] ||
        d.match(/class="subtitle-block"[^>]*>([\s\S]*?)<\/p>/)?.[1]?.replace(/\s+/g, " ").trim();
      const heroImg =
        d.match(/src="([^"]*uvelichenie[^"]+\.(webp|jpg|png))"/i)?.[1] ||
        d.match(/services\/uvelichenie[^"']+\.(webp|jpg|png)/i)?.[0] ||
        d.match(/storage__[^"']+\.(webp|jpg|png)/i)?.[0];
      console.log(JSON.stringify({ title, desc, h1, sub, heroImg }, null, 2));
    });
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  });
