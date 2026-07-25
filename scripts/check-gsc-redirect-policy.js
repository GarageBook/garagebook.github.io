#!/usr/bin/env node
/**
 * Local regression checks for GSC redirect/canonical issues on garagebook.nl.
 *
 * This verifies repository-owned facts: official URL policy, concrete route
 * existence, sitemap membership, canonical/og consistency, and legacy variants
 * that must not appear in source files. It does not pretend to validate
 * server-side redirects that are controlled by GitHub Pages or hosting config.
 */
'use strict';

const fs = require('fs');
const cp = require('child_process');

const SITE = 'https://garagebook.nl';
const HOST = 'garagebook.nl';

const sources = [
  'https://garagebook.nl/motor-onderhoud-app',
  'https://garagebook.nl/blog/beste-motor-onderhoud-app',
  'https://garagebook.nl/blog/youngtimer-onderhoud-bijhouden-digitaal-onderhoudsboekje',
  'https://garagebook.nl/digitaal-onderhoudsboekje-vs-papier',
  'https://garagebook.nl/motor-kopen-onderhoudshistorie',
  'https://garagebook.nl/voertuighistorie-bij-verkoop',
  'https://garagebook.nl/motor-onderhoud-excel',
  'https://garagebook.nl/motor-onderhoud-schema',
  'https://garagebook.nl/onderhoudsboekje-motor',
  'https://garagebook.nl/honda-cbr1000rr-fireblade-onderhoud',
  'https://garagebook.nl/onderhoudsboekje/oldtimer',
  'https://garagebook.nl/auto-onderhoud-app',
  'https://garagebook.nl/auto-onderhoud-bijhouden',
  'https://garagebook.nl/beste-motor-onderhoud-app',
  'https://garagebook.nl/circuit-onderhoud-motor',
  'https://garagebook.nl/digitaal-onderhoudsboekje',
  'https://garagebook.nl/blog/universeel-onderhoudsboekje-kopen-dit-is-het-beste-alternatief-2026',
  'https://www.garagebook.nl/motor-onderhoud-schema/',
  'https://www.garagebook.nl/motor-onderhoud-app/',
  'https://www.garagebook.nl/motor-onderhoud-excel/',
  'https://www.garagebook.nl/motor-onderhoud-bijhouden/',
];

const legacyIndexUrls = [
  'https://garagebook.nl/youngtimer-onderhoud-bijhouden/index.html',
];

const legacyBlogs = [
  'https://garagebook.nl/blogs/',
  'https://garagebook.nl/blogs/beste-motor-onderhoud-app/',
  'https://garagebook.nl/blogs/youngtimer-onderhoud-bijhouden-digitaal-onderhoudsboekje/',
  'https://garagebook.nl/blogs/universeel-onderhoudsboekje-kopen-dit-is-het-beste-alternatief-2026/',
];

const failures = [];
cp.execFileSync('node', ['scripts/check-public-garage-seo.js'], { stdio: 'inherit' });

function listFiles(args) {
  const output = cp.execFileSync('rg', args, { encoding: 'utf8' }).trim();
  return output ? output.split(/\n/).filter(Boolean) : [];
}

function canonicalTarget(source) {
  const parsed = new URL(source);
  parsed.protocol = 'https:';
  parsed.hostname = HOST;
  if (parsed.pathname.endsWith('/index.html')) {
    parsed.pathname = parsed.pathname.replace(/\/index\.html$/, '/');
  } else if (!parsed.pathname.endsWith('/')) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  return parsed.href;
}

function fileForUrl(url) {
  const pathname = new URL(url).pathname;
  if (pathname === '/') return 'index.html';
  return `${pathname.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
}

function attr(source, selectorRegex, attrName) {
  const tag = source.match(selectorRegex)?.[0];
  if (!tag) return null;
  return tag.match(new RegExp(`\\b${attrName}=["']([^"']+)["']`, 'i'))?.[1] ?? null;
}

const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
const sitemapSet = new Set(sitemapUrls);

function checkOptionalGarageSitemap() {
  const file = 'sitemap-garages.xml';
  if (!fs.existsSync(file)) return;

  const source = fs.readFileSync(file, 'utf8');
  if (!/<urlset\b/i.test(source) || /<sitemapindex\b/i.test(source)) {
    failures.push(`${file}: optional garage sitemap must be a <urlset>`);
  }
  if (/https:\/\/app\.garagebook\.nl\/garage\//i.test(source)) {
    failures.push(`${file}: public garage URLs must not use the app host`);
  }

  const locs = [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  const seen = new Set();
  for (const loc of locs) {
    if (seen.has(loc)) failures.push(`${file}: duplicate URL: ${loc}`);
    seen.add(loc);

    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      failures.push(`${file}: invalid URL: ${loc}`);
      continue;
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== HOST || !parsed.pathname.startsWith('/garage/')) {
      failures.push(`${file}: URL must use https://garagebook.nl/garage/...: ${loc}`);
    }
  }
}

checkOptionalGarageSitemap();

for (const url of sitemapUrls) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== HOST) {
    failures.push(`sitemap.xml: non-canonical sitemap URL: ${url}`);
  }
  if (parsed.pathname.includes('/index.html')) failures.push(`sitemap.xml: /index.html URL is not allowed: ${url}`);
  if (parsed.pathname.startsWith('/blogs/')) failures.push(`sitemap.xml: old /blogs/ route is not allowed: ${url}`);
  if (url !== `${SITE}/` && !parsed.pathname.endsWith('/')) failures.push(`sitemap.xml: URL must use trailing slash: ${url}`);
}

for (const source of sources) {
  const target = canonicalTarget(source);
  const file = fileForUrl(target);
  if (!fs.existsSync(file)) failures.push(`${source}: canonical target file is missing: ${file}`);
  if (!sitemapSet.has(target)) failures.push(`${source}: canonical target missing from sitemap.xml: ${target}`);
  if (source === target) failures.push(`${source}: source is already canonical; expected this list to contain redirect variants only`);
}

for (const source of legacyIndexUrls) {
  const target = canonicalTarget(source);
  const file = fileForUrl(target);
  if (!fs.existsSync(file)) failures.push(`${source}: canonical target file is missing: ${file}`);
  if (!sitemapSet.has(target)) failures.push(`${source}: canonical target missing from sitemap.xml: ${target}`);
}

for (const source of legacyBlogs) {
  if (fs.existsSync(fileForUrl(source))) failures.push(`${source}: old /blogs/ route has a physical page; only /blog/ should be official`);
  if (sitemapSet.has(source)) failures.push(`${source}: old /blogs/ route must not be in sitemap.xml`);
}

const textFiles = listFiles([
  '--files',
  '-g', '*.html',
  '-g', '*.xml',
  '-g', '*.txt',
  '-g', '*.json',
  '-g', '*.md',
  '-g', '*.js',
  '-g', '*.sh',
])
  .filter((file) => !file.startsWith('node_modules/'))
  .filter((file) => !file.startsWith('_oud/') && !file.includes('/_oud/'))
  .filter((file) => file !== 'scripts/check-gsc-redirect-policy.js');

for (const file of textFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (/https?:\/\/www\.garagebook\.nl/i.test(source)) failures.push(`${file}: contains www.garagebook.nl`);
  if (/https?:\/\/garagebook\.nl\/[^"'\s<)]*\/index\.html/i.test(source)) failures.push(`${file}: contains absolute /index.html URL`);
  if (/https?:\/\/garagebook\.nl\/blogs\//i.test(source)) failures.push(`${file}: contains old /blogs/ URL`);
  if (/\bhref=["']\/blogs\//i.test(source)) failures.push(`${file}: contains root-relative old /blogs/ link`);
  if (/\bhref=["'][^"']*\/index\.html/i.test(source)) failures.push(`${file}: contains href to /index.html`);
}

const htmlFiles = listFiles(['--files', '-g', '*.html'])
  .filter((file) => file.endsWith('index.html'))
  .filter((file) => !file.startsWith('_oud/') && !file.includes('/_oud/'))
  .filter((file) => !['404.html', '__layout_check__.html', 'insights/_template/index.html'].includes(file));

for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const canonical = attr(source, /<link\b[^>]*\brel=["']canonical["'][^>]*>/i, 'href');
  const ogUrl = attr(source, /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i, 'content');
  if (canonical && ogUrl && canonical !== ogUrl) failures.push(`${file}: og:url differs from canonical`);
}

if (failures.length) {
  console.error('GSC redirect policy check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`GSC redirect policy check passed: ${sources.length} GSC variants, ${legacyIndexUrls.length} /index.html legacy URL, ${legacyBlogs.length} /blogs/ legacy URLs.`);
