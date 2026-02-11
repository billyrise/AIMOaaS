#!/usr/bin/env node
/**
 * Lucide UMD をバージョン固定で取得し assets/js/lucide.min.js に保存する。
 * Phase 1: 自前ホスト + バージョン固定（キャッシュ安定）。defer は HTML 側で付与。
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const VERSION = "0.460.0";
const URL = `https://unpkg.com/lucide@${VERSION}/dist/umd/lucide.min.js`;
const OUT = path.resolve(__dirname, "..", "assets", "js", "lucide.min.js");

const dir = path.dirname(OUT);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

https
  .get(URL, (res) => {
    if (res.statusCode !== 200) {
      console.error("HTTP", res.statusCode, URL);
      process.exit(1);
    }
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      fs.writeFileSync(OUT, Buffer.concat(chunks));
      console.log("Written", OUT, "(" + Buffer.concat(chunks).length, "bytes)");
      process.exit(0);
    });
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  });
