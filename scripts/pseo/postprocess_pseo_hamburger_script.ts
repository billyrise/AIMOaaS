/**
 * Replace old hamburger script (no setProperty) with new one in PSEO article HTML files.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PSEO_ARTICLES_DIR = join(ROOT, "ja", "resources", "pseo");

// Old script: toggles is-open but does NOT use setProperty (broken with landing.css !important)
const OLD_SCRIPT =
  /<script>[\s\S]*?getElementById\('mobile-menu'\)[\s\S]*?classList\.toggle\('is-open'\)[\s\S]*?setAttribute\('aria-hidden'[\s\S]*?<\/script>/;

const NEW_SCRIPT = `<script>
(function(){
function init(){ var m=document.getElementById('mobile-menu'); var b=document.getElementById('hamburger-btn');
if(!b||!m)return;
m.style.setProperty('display','none','important');
b.addEventListener('click',function(e){ e.preventDefault(); var open=m.classList.toggle('is-open'); m.style.setProperty('display',open?'flex':'none','important'); m.setAttribute('aria-hidden',open?'false':'true'); b.setAttribute('aria-expanded',open?'true':'false'); });
window.addEventListener('resize',function(){ if(window.matchMedia('(min-width: 1280px)').matches){ m.classList.remove('is-open'); m.style.setProperty('display','none','important'); m.setAttribute('aria-hidden','true'); b.setAttribute('aria-expanded','false'); }});
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); }else{ init(); }
})();
</script>`;

function main(): void {
  const dirs = readdirSync(PSEO_ARTICLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let updated = 0;
  let skipped = 0;

  for (const dir of dirs) {
    const indexPath = join(PSEO_ARTICLES_DIR, dir, "index.html");
    if (!existsSync(indexPath)) continue;

    let html = readFileSync(indexPath, "utf8");
    if (html.includes("setProperty")) {
      skipped++;
      continue;
    }
    if (!OLD_SCRIPT.test(html)) {
      skipped++;
      continue;
    }

    html = html.replace(OLD_SCRIPT, NEW_SCRIPT);
    writeFileSync(indexPath, html, "utf8");
    updated++;
  }

  console.log(`PSEO hamburger script: updated ${updated} article(s), skipped ${skipped}.`);
}

main();
