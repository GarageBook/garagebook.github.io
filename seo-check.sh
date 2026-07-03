#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required for seo-check.sh" >&2
  exit 1
fi

node <<'NODE'
const fs = require('fs');
const cp = require('child_process');

const site = 'https://garagebook.nl';
const ignoredHtml = new Set([
  '404.html',
  '__layout_check__.html',
  'motor-onderhoud-bijhouden/alternatief.html',
]);

function listFiles(args) {
  return cp.execFileSync('rg', args, { encoding: 'utf8' })
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .filter((file) => !file.startsWith('_oud/') && !file.includes('/_oud/'));
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function pageUrl(file) {
  if (file === 'index.html') return `${site}/`;
  return `${site}/${file.replace(/index\.html$/, '')}`;
}

const failures = [];
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapSet = new Set(sitemapUrls);

for (const url of sitemapUrls) {
  if (url.startsWith(`${site}/`) && url !== `${site}/` && !url.endsWith('/')) {
    failures.push(`sitemap non-slash URL: ${url}`);
  }
}

const htmlFiles = listFiles(['--files', '-g', '*.html']);
const canonicalPages = htmlFiles.filter((file) => file.endsWith('index.html') && !ignoredHtml.has(file));
const canonicalRoutes = new Set(canonicalPages.map((file) => new URL(pageUrl(file)).pathname));

for (const file of canonicalPages) {
  const source = fs.readFileSync(file, 'utf8');
  const canonicalMatch = source.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  const expected = pageUrl(file);

  if (!canonicalMatch) {
    failures.push(`${file}: missing canonical tag`);
    continue;
  }

  if (canonicalMatch[1] !== expected) {
    failures.push(`${file}: canonical ${canonicalMatch[1]} !== ${expected}`);
  }
}

for (const file of canonicalPages) {
  const source = fs.readFileSync(file, 'utf8');

  for (const match of source.matchAll(/\bhref=["']([^"']+)["']/g)) {
    const href = match[1];

    if (href.startsWith('http://garagebook.nl/') || href.startsWith('https://garagebook.nl/')) {
      const url = new URL(href);
      const slashPath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
      if (url.pathname !== '/' && canonicalRoutes.has(slashPath) && !url.pathname.endsWith('/')) {
        failures.push(`${file}:${lineNumber(source, match.index)} internal absolute link without slash: ${href}`);
      }
    }

    if (!href.startsWith('/') || href === '/' || href.startsWith('//') || href.startsWith('/#')) {
      continue;
    }

    const cleanPath = href.split(/[?#]/)[0];
    if (!cleanPath || cleanPath === '/') {
      continue;
    }

    const slashPath = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
    if (canonicalRoutes.has(slashPath) && !cleanPath.endsWith('/')) {
      failures.push(`${file}:${lineNumber(source, match.index)} internal link without slash: ${href}`);
    }
  }
}

for (const file of canonicalPages) {
  const source = fs.readFileSync(file, 'utf8');
  if (/"@type"\s*:\s*"Product"/.test(source) || /@type[^<\n]*Product/.test(source)) {
    failures.push(`${file}: Product schema found; remove it or document why it is intentional`);
  }
}

for (const url of [
  `${site}/voertuighistorie-bij-verkoop/`,
  `${site}/blog/onderhoudsboekje-oldtimer-onderhoudshistorie/`,
]) {
  if (!sitemapSet.has(url)) {
    failures.push(`required GSC focus URL missing from sitemap: ${url}`);
  }
}

console.log(`Checked ${canonicalPages.length} canonical HTML pages.`);
console.log(`Checked ${sitemapUrls.length} sitemap URLs.`);

if (failures.length) {
  console.error('\nSEO check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('SEO check passed: slash canonicals, sitemap URLs, internal page links, focus sitemap URLs, and Product schema checks are clean.');
NODE
