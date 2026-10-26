"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const repo = path.resolve(process.argv[2] || ".");
const mode = process.argv[3] || "--check";
if (!["--check", "--write"].includes(mode)) {
  throw new Error("Use --check or --write");
}

function git(...args) {
  return cp.execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    maxBuffer: 5 * 1024 * 1024,
  }).trim();
}

function contentSignature(html) {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const descriptionTag = html.match(/<meta\b[^>]*name="description"[^>]*>/i)?.[0] || "";
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    || html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]
    || "";
  const withoutScripts = main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const structuredData = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).join(" ");
  return [title, descriptionTag, withoutScripts, structuredData].join(" ").replace(/\s+/g, " ").trim();
}

function provenContentDate(file, rootCommit) {
  const lines = git("log", "--format=%H:%as", "--", file).split("\n").filter(Boolean);
  if (lines.length === 0) {
    throw new Error("No Git history for sitemap page: " + file);
  }

  let newer = lines[0].split(":");
  let newerContent = contentSignature(git("show", newer[0] + ":" + file));
  for (const line of lines.slice(1)) {
    const older = line.split(":");
    const olderContent = contentSignature(git("show", older[0] + ":" + file));
    if (newerContent !== olderContent) {
      return newer[1];
    }
    newer = older;
    newerContent = olderContent;
  }

  return newer[0] === rootCommit ? null : newer[1];
}

const sitemapPath = path.join(repo, "sitemap.xml");
const original = fs.readFileSync(sitemapPath, "utf8");
const rootCommit = git("rev-list", "--max-parents=0", "HEAD").split("\n")[0];
let changed = 0;
let checked = 0;
const updated = original.replace(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>\s*<\/url>/g, (entry, url, currentDate) => {
  const parsed = new URL(url);
  if (parsed.origin !== "https://garagebook.nl" || parsed.search || parsed.hash) {
    throw new Error("Invalid sitemap URL: " + url);
  }
  const file = parsed.pathname === "/" ? "index.html" : parsed.pathname.slice(1) + "index.html";
  if (!fs.existsSync(path.join(repo, file))) {
    throw new Error("Sitemap page does not exist: " + file);
  }
  checked++;
  const provenDate = provenContentDate(file, rootCommit);
  if (!provenDate || provenDate <= currentDate) {
    return entry;
  }
  changed++;
  return entry.replace("<lastmod>" + currentDate + "</lastmod>", "<lastmod>" + provenDate + "</lastmod>");
});

if (checked !== [...original.matchAll(/<loc>/g)].length) {
  throw new Error("Every sitemap URL must have a lastmod date");
}

if (checked === 0) {
  throw new Error("No sitemap URLs checked");
}
if (mode === "--check" && changed > 0) {
  throw new Error(changed + " sitemap lastmod dates lag proven content changes");
}
if (mode === "--write" && updated !== original) {
  fs.writeFileSync(sitemapPath, updated);
}
console.log("Checked " + checked + " sitemap URLs; " + changed + " lastmod dates " + (mode === "--write" ? "updated" : "out of date") + ".");
