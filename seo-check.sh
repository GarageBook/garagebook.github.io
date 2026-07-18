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
const host = 'garagebook.nl';
const ignoredHtml = new Set([
  '404.html',
  '__layout_check__.html',
  'motor-onderhoud-bijhouden/alternatief.html',
  'insights/_template/index.html',
]);
const noindexAllowlist = new Set([
  // Intentional non-indexed pages that are synced but kept out of sitemap.
  'geratel/index.html',
  'ktm-390-duke-onderhoud/index.html',
  'triumph-bonneville-t120-onderhoud/index.html',
]);
const allowedJsonLdTypes = new Set([
  'Article',
  'Blog',
  'BlogPosting',
  'BreadcrumbList',
  'ContactPage',
  'FAQPage',
  'HowTo',
  'HowToStep',
  'ListItem',
  'Organization',
  'Person',
  'Question',
  'Answer',
  'SoftwareApplication',
  'WebPage',
  'WebSite',
  'Offer',
  'ImageObject',
]);
const requiredSitemapUrls = [
  `${site}/`,
  `${site}/blog/`,
  `${site}/digitaal-onderhoudsboekje/`,
  `${site}/motor-onderhoud-app/`,
  `${site}/auto-onderhoud-app/`,
  `${site}/voertuighistorie-bij-verkoop/`,
  `${site}/onderhoudsboekje-oldtimer/`,
  `${site}/blog/onderhoudsboekje-oldtimer-onderhoudshistorie/`,
];

function listFiles(args) {
  const output = cp.execFileSync('rg', args, { encoding: 'utf8' }).trim();
  if (!output) return [];
  return output
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

function tagContent(source, tagName) {
  const match = source.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function attr(source, selectorRegex, attrName) {
  const tag = source.match(selectorRegex)?.[0];
  if (!tag) return null;
  return tag.match(new RegExp(`\\b${attrName}=["']([^"']+)["']`, 'i'))?.[1] ?? null;
}

function jsonLdBlocks(source) {
  return [...source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
}

function collectTypes(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out);
    return out;
  }
  if (value['@type']) {
    if (Array.isArray(value['@type'])) out.push(...value['@type']);
    else out.push(value['@type']);
  }
  for (const child of Object.values(value)) collectTypes(child, out);
  return out;
}

function cleanInternalPath(href) {
  if (href.startsWith('http://garagebook.nl/') || href.startsWith('https://garagebook.nl/')) {
    const url = new URL(href);
    return { path: url.pathname, search: url.search, hash: url.hash, original: href, absolute: true };
  }

  if (!href.startsWith('/') || href.startsWith('//')) return null;
  if (href === '/' || href.startsWith('/#')) return null;
  const [withoutHash, hash = ''] = href.split('#', 2);
  const [path, search = ''] = withoutHash.split('?', 2);
  return { path, search: search ? `?${search}` : '', hash: hash ? `#${hash}` : '', original: href, absolute: false };
}

const failures = [];
const passNotes = [];

if (!fs.existsSync('sitemap.xml')) {
  failures.push('sitemap.xml: missing required sitemap file');
}

const sitemap = fs.existsSync('sitemap.xml') ? fs.readFileSync('sitemap.xml', 'utf8') : '';
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
const sitemapSet = new Set(sitemapUrls);

for (const [index, url] of sitemapUrls.entries()) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    failures.push(`sitemap.xml: invalid URL in loc ${index + 1}: ${url}`);
    continue;
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== host) {
    failures.push(`sitemap.xml: non-canonical host/protocol in loc: ${url}`);
  }
  if (parsed.search) failures.push(`sitemap.xml: querystring not allowed in loc: ${url}`);
  if (parsed.hash) failures.push(`sitemap.xml: anchor not allowed in loc: ${url}`);
  if (url !== `${site}/` && !parsed.pathname.endsWith('/')) {
    failures.push(`sitemap.xml: non-slash URL in loc: ${url}`);
  }
}

const seenSitemap = new Map();
for (const url of sitemapUrls) {
  seenSitemap.set(url, (seenSitemap.get(url) || 0) + 1);
}
for (const [url, count] of seenSitemap.entries()) {
  if (count > 1) failures.push(`sitemap.xml: duplicate loc (${count}x): ${url}`);
}
for (const url of requiredSitemapUrls) {
  if (!sitemapSet.has(url)) failures.push(`sitemap.xml: required focus URL missing: ${url}`);
}

const htmlFiles = listFiles(['--files', '-g', '*.html']);
const canonicalPages = htmlFiles.filter((file) => file.endsWith('index.html') && !ignoredHtml.has(file));
const canonicalRoutes = new Set(canonicalPages.map((file) => new URL(pageUrl(file)).pathname));

for (const file of canonicalPages) {
  const source = fs.readFileSync(file, 'utf8');
  const expected = pageUrl(file);
  const canonical = attr(source, /<link\b[^>]*\brel=["']canonical["'][^>]*>/i, 'href');
  const canonicalTags = [...source.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)];

  if (canonicalTags.length !== 1) {
    failures.push(`${file}: expected exactly one canonical tag, found ${canonicalTags.length}`);
  }

  if (!canonical) {
    failures.push(`${file}: missing canonical tag`);
  } else {
    let parsed;
    try {
      parsed = new URL(canonical);
    } catch {
      failures.push(`${file}: canonical is not a valid absolute URL: ${canonical}`);
      parsed = null;
    }

    if (parsed) {
      if (parsed.protocol !== 'https:' || parsed.hostname !== host) {
        failures.push(`${file}: canonical uses wrong host/protocol: ${canonical}`);
      }
      if (canonical !== expected) {
        failures.push(`${file}: canonical ${canonical} !== expected ${expected}`);
      }
      if (canonical !== `${site}/` && !parsed.pathname.endsWith('/')) {
        failures.push(`${file}: canonical is missing trailing slash: ${canonical}`);
      }
      if (parsed.search) failures.push(`${file}: canonical must not contain querystring: ${canonical}`);
      if (parsed.hash) failures.push(`${file}: canonical must not contain anchor: ${canonical}`);
    }
  }

  const ogUrl = attr(source, /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i, 'content');
  if (!ogUrl) {
    failures.push(`${file}: missing og:url`);
  } else if (canonical && ogUrl !== canonical) {
    failures.push(`${file}: og:url ${ogUrl} !== canonical ${canonical}`);
  }

  const title = tagContent(source, 'title');
  if (!title) failures.push(`${file}: missing or empty title`);

  const description = attr(source, /<meta\b[^>]*\bname=["']description["'][^>]*>/i, 'content');
  if (!description || !description.trim()) failures.push(`${file}: missing or empty meta description`);

  const h1Count = [...source.matchAll(/<h1\b[^>]*>/gi)].length;
  if (h1Count !== 1) failures.push(`${file}: expected exactly one H1, found ${h1Count}`);

  const robots = attr(source, /<meta\b[^>]*\bname=["']robots["'][^>]*>/i, 'content');
  if (robots && /(^|[,\s])noindex([,\s]|$)/i.test(robots) && !noindexAllowlist.has(file)) {
    failures.push(`${file}: noindex is not allowed for canonical page`);
  }

  for (const block of jsonLdBlocks(source)) {
    let parsed;
    try {
      parsed = JSON.parse(block[1].trim());
    } catch (error) {
      failures.push(`${file}:${lineNumber(source, block.index)} JSON-LD is not parseable: ${error.message}`);
      continue;
    }

    for (const type of collectTypes(parsed)) {
      if (type === 'Product') failures.push(`${file}:${lineNumber(source, block.index)} Product schema is not allowed on marketing/blog pages`);
      if (typeof type === 'string' && !allowedJsonLdTypes.has(type)) {
        passNotes.push(`${file}: JSON-LD type present and not explicitly allowlisted: ${type}`);
      }
    }
  }
}

for (const file of canonicalPages) {
  const source = fs.readFileSync(file, 'utf8');

  for (const match of source.matchAll(/\bhref=["']([^"']+)["']/g)) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    if (/^https?:\/\//i.test(href) && !href.startsWith('http://garagebook.nl/') && !href.startsWith('https://garagebook.nl/')) continue;

    const internal = cleanInternalPath(href);
    if (!internal) continue;

    if (internal.path.endsWith('/index.html')) {
      failures.push(`${file}:${lineNumber(source, match.index)} internal link must not point to index.html: ${href}`);
      continue;
    }

    const slashPath = internal.path.endsWith('/') ? internal.path : `${internal.path}/`;
    if (canonicalRoutes.has(slashPath) && !internal.path.endsWith('/')) {
      failures.push(`${file}:${lineNumber(source, match.index)} internal page link must use trailing slash canonical: ${href}`);
    }
  }
}

// ── Nieuwe regressiechecks (Sprint 7) ─────────────────────────────────────────

// 1. Centrale pagina-inventaris moet bestaan
if (!fs.existsSync('data/seo/pages.json')) {
  failures.push('data/seo/pages.json: centrale pagina-inventaris ontbreekt (draai: node scripts/build-page-inventory.js)');
}

// 2. Duplicate titles over alle indexeerbare pagina's
const seenTitles = new Map();
for (const file of canonicalPages) {
  const robots = attr(fs.readFileSync(file, 'utf8'), /<meta\b[^>]*\bname=["']robots["'][^>]*>/i, 'content') || '';
  if (/(^|[,\s])noindex([,\s]|$)/i.test(robots)) continue; // skip noindex pages
  const source = fs.readFileSync(file, 'utf8');
  const title = tagContent(source, 'title').toLowerCase().trim();
  if (!title) continue;
  if (seenTitles.has(title)) {
    failures.push(`duplicate title across pages: "${title}" — ${file} en ${seenTitles.get(title)}`);
  } else {
    seenTitles.set(title, file);
  }
}

// 3. Sitemap-URL's die niet overeenkomen met bestaande HTML-bestanden
const sitemapNoIndexAllowlist = new Set([]);
for (const url of sitemapUrls) {
  let parsed;
  try { parsed = new URL(url); } catch (_) { continue; }
  const pathname = parsed.pathname;
  const file = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
  if (!fs.existsSync(file)) {
    failures.push(`sitemap.xml: URL heeft geen bijbehorend HTML-bestand: ${url} (verwacht: ${file})`);
  }
}

// 4. Indexeerbare canonieke pagina's die niet in de sitemap staan
// (noindex-pages worden bewust weggelaten)
for (const file of canonicalPages) {
  if (noindexAllowlist.has(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const robots = attr(source, /<meta\b[^>]*\bname=["']robots["'][^>]*>/i, 'content') || '';
  if (/(^|[,\s])noindex([,\s]|$)/i.test(robots)) continue;
  const expectedUrl = pageUrl(file);
  if (!sitemapSet.has(expectedUrl)) {
    failures.push(`${file}: indexeerbare pagina ontbreekt in sitemap.xml (verwacht: ${expectedUrl})`);
  }
}

// 5. Orphan-check: indexeerbare niet-homepage pagina's zonder inkomende interne links
// Uitsluitingen: pagina's die bewust alleen via externe links bereikbaar zijn
const orphanExceptions = new Set([
  'garage-samenwerking/index.html', // partner-pagina, bereikbaar via contact/pers
]);
const allHtmlSources = {};
for (const file of canonicalPages) {
  allHtmlSources[file] = fs.readFileSync(file, 'utf8');
}
for (const targetFile of canonicalPages) {
  if (targetFile === 'index.html') continue; // homepage nooit orphan
  if (orphanExceptions.has(targetFile)) continue;
  const targetRobots = attr(allHtmlSources[targetFile], /<meta\b[^>]*\bname=["']robots["'][^>]*>/i, 'content') || '';
  if (/(^|[,\s])noindex([,\s]|$)/i.test(targetRobots)) continue;
  const targetPath = new URL(pageUrl(targetFile)).pathname;
  const targetSlash = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;
  let found = false;
  for (const [srcFile, srcSource] of Object.entries(allHtmlSources)) {
    if (srcFile === targetFile) continue;
    for (const m of srcSource.matchAll(/\bhref=["']([^"'#?]+)['"]/g)) {
      const href = m[1].trim();
      let hrefPath;
      if (href.startsWith('https://garagebook.nl') || href.startsWith('http://garagebook.nl')) {
        try { hrefPath = new URL(href).pathname; } catch (_) { continue; }
      } else if (href.startsWith('/')) {
        hrefPath = href;
      } else { continue; }
      const hrefSlash = hrefPath.endsWith('/') ? hrefPath : `${hrefPath}/`;
      if (hrefSlash === targetSlash) { found = true; break; }
    }
    if (found) break;
  }
  if (!found) {
    failures.push(`${targetFile}: indexeerbare pagina heeft geen inkomende interne links (orphan)`);
  }
}

console.log(`Checked ${canonicalPages.length} canonical HTML pages.`);
console.log(`Checked ${sitemapUrls.length} sitemap URLs.`);
console.log(`Checked ${canonicalPages.length} pages for basic SEO, internal links, and JSON-LD.`);

if (failures.length) {
  console.error('\nSEO check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('SEO check passed: canonicals, sitemap, internal links, structured data, and basic SEO are clean.');
NODE
