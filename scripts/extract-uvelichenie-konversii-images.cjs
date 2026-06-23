#!/usr/bin/env node
const https = require("https");

https
  .get("https://serenity.agency/uvelichenie-konversii-saita", (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => {
      const idx = d.indexOf("c-title-block");
      console.log(d.slice(Math.max(0, idx - 200), idx + 4000));
    });
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  });
