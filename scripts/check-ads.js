const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const live = process.argv.includes("--live");
const sites = [
  { name: "main", directory: "dist", host: "solforge.cloud", excluded: ["about.html", "contact.html", "privacy.html", "terms.html"] },
  ...["crypto", "stocks", "fortune"].map((name) => ({ name, directory: `sites/${name}/dist`, host: `${name}.solforge.cloud`, excluded: ["about.html", "privacy.html"] }))
];

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith(".html") ? [file] : [];
  });
}

// Audit every localized output, independently of the builders' inclusion lists.
function inspect(html, expected) {
  const issues = [];
  const count = [...html.matchAll(/<aside\b[^>]*\bdata-coupang-ad(?:\s|>)/g)].length;
  if (count !== Number(expected)) issues.push(`Expected ${Number(expected)} banner, found ${count}`);
  if (/adsbygoogle|googlesyndication|ca-pub-/.test(html)) issues.push("AdSense code remains");
  if (expected) {
    if (!html.includes('data-coupang-placement="upper-content"')) issues.push("Upper-page ad placement missing");
    if (!html.includes('data-coupang-layout="responsive"')) issues.push("Responsive banner missing");
    for (const [mode, width, height] of [["desktop", "970", "140"], ["mobile", "300", "250"]]) {
      const document = (html.match(new RegExp(`data-${mode}-srcdoc="([^"]+)"`))?.[1] || "")
        .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      for (const marker of ['https://ads-partners.coupang.com/g.js', '"id":1030868', '"trackingCode":"AF5479527"', `"width":"${width}"`, `"height":"${height}"`]) {
        if (!document.includes(marker)) issues.push(`${mode}: missing ${marker}`);
      }
    }
  }
  return { count, issues };
}

async function main() {
  const records = [];
  for (const site of sites) {
    for (const lang of ["ko", "en"]) {
      const directory = path.join(ROOT, site.directory, lang);
      const files = htmlFiles(directory);
      if (!files.length) throw new Error(`No pages found: ${directory}`);
      for (const file of files) {
        const relative = path.relative(directory, file).split(path.sep).join("/");
        const route = relative === "index.html" ? "" : relative.replace(/\.html$/, "");
        records.push({ site: site.name, lang, file: relative, url: `https://${site.host}/${lang}/${route}`, expected: !site.excluded.includes(relative), localFile: file });
      }
    }
  }

  let index = 0;
  async function worker() {
    while (index < records.length) {
      const record = records[index++];
      try {
        let html;
        if (live) {
          const response = await fetch(record.url, { signal: AbortSignal.timeout(30000) });
          record.status = response.status;
          html = await response.text();
        } else {
          html = fs.readFileSync(record.localFile, "utf8");
        }
        Object.assign(record, inspect(html, record.expected));
        if (live && record.status !== 200) record.issues.push(`HTTP ${record.status}`);
      } catch (error) {
        record.issues = [error.message];
      }
      delete record.localFile;
    }
  }
  await Promise.all(Array.from({ length: live ? 6 : 1 }, worker));
  const failures = records.filter((record) => record.issues.length);
  const summary = sites.map((site) => {
    const pages = records.filter((record) => record.site === site.name);
    return { site: site.name, pages: pages.length, withAds: pages.filter((record) => record.expected).length, excluded: pages.filter((record) => !record.expected).length, failures: pages.filter((record) => record.issues.length).length };
  });
  for (const row of summary) console.log(JSON.stringify(row));
  if (live) {
    const output = path.join(ROOT, "test-results", "ads-live-audit.json");
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), summary, records }, null, 2) + "\n");
  }
  for (const failure of failures) console.error(failure.url, failure.issues.join("; "));
  if (failures.length) process.exitCode = 1;
  else console.log(`Checked ${records.length} ${live ? "live" : "built"} localized pages: one banner on every public content/tool/directory page, no ads on informational pages.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
