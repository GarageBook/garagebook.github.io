#!/usr/bin/env node
/**
 * build-page-inventory.js
 * Extracts technical metadata from all HTML files + sitemap.xml,
 * merges with the manual page config, and writes data/seo/pages.json.
 *
 * Run from project root: node scripts/build-page-inventory.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://garagebook.nl';
const TODAY = new Date().toISOString().slice(0, 10);

// ── Manual config ──────────────────────────────────────────────────────────────
// Fields that can't be derived from HTML alone. Add new pages here.
// indexable defaults to true unless set explicitly.
const PAGE_CONFIG = {
  '/': { pageType: 'homepage', cluster: 'homepage', role: 'pillar', primaryIntent: 'brand / navigational', publishedDate: '2026-05-03' },
  '/blog/': { pageType: 'other-seo', cluster: 'blog', role: 'hub', primaryIntent: 'blog-overzicht navigational', publishedDate: '2026-05-18' },
  '/digitaal-onderhoudsboekje/': { pageType: 'pillar', cluster: 'digitaal-onderhoudsboekje', role: 'pillar', primaryIntent: 'informational / commercial: digitaal onderhoudsboekje', publishedDate: '2026-05-24' },
  '/motor-onderhoud-bijhouden/': { pageType: 'pillar', cluster: 'motor-onderhoud', role: 'pillar', primaryIntent: 'informational / commercial: motor onderhoud bijhouden', publishedDate: '2026-05-24' },
  '/auto-onderhoud-bijhouden/': { pageType: 'pillar', cluster: 'auto-onderhoud', role: 'pillar', primaryIntent: 'informational / commercial: auto onderhoud bijhouden', publishedDate: '2026-05-18' },
  '/onderhoudshistorie-motor/': { pageType: 'pillar', cluster: 'onderhoudshistorie', role: 'pillar', primaryIntent: 'informational: onderhoudshistorie motor', publishedDate: '2026-07-01' },
  '/resources/': { pageType: 'other-seo', cluster: 'resources', role: 'hub', primaryIntent: 'resources-overzicht navigational', publishedDate: '2026-07-11' },
  '/insights/': { pageType: 'other-seo', cluster: 'insights', role: 'hub', primaryIntent: 'insights-overzicht navigational', publishedDate: '2026-07-12' },
  '/openbare-garages/': { pageType: 'other-seo', cluster: 'onderhoudshistorie', role: 'support', primaryIntent: 'informational: openbare GarageBook garages', publishedDate: '2026-07-25' },
  // Child pages - motor-onderhoud cluster
  '/motor-onderhoud-app/': { pageType: 'child', cluster: 'motor-onderhoud', role: 'child', primaryIntent: 'commercial: motor onderhoud app', publishedDate: '2026-05-18' },
  '/motor-onderhoud-excel/': { pageType: 'child', cluster: 'motor-onderhoud', role: 'child', primaryIntent: 'informational: motor onderhoud excel', publishedDate: '2026-05-03' },
  '/motor-onderhoud-schema/': { pageType: 'child', cluster: 'motor-onderhoud', role: 'child', primaryIntent: 'informational: motor onderhoud schema', publishedDate: '2026-05-24' },
  '/beste-motor-onderhoud-app/': { pageType: 'child', cluster: 'motor-onderhoud', role: 'child', primaryIntent: 'commercial: beste motor onderhoud app', publishedDate: '2026-05-18' },
  '/zelf-motor-onderhoud-documenteren/': { pageType: 'child', cluster: 'motor-onderhoud', role: 'child', primaryIntent: 'informational: zelf motor onderhoud documenteren', publishedDate: '2026-05-24' },
  '/onderhoudskosten-motor/': { pageType: 'child', cluster: 'motor-onderhoud', role: 'child', primaryIntent: 'informational: onderhoudskosten motor', publishedDate: '2026-07-01' },
  '/circuit-onderhoud-motor/': { pageType: 'child', cluster: 'motor-onderhoud', role: 'child', primaryIntent: 'informational: circuit motor onderhoud', publishedDate: '2026-05-24' },
  // Child pages - auto-onderhoud cluster
  '/auto-onderhoud-app/': { pageType: 'child', cluster: 'auto-onderhoud', role: 'child', primaryIntent: 'commercial: auto onderhoud app', publishedDate: '2026-05-18' },
  // Child pages - digitaal-onderhoudsboekje cluster
  '/onderhoudsboekje/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational / commercial: onderhoudsboekje', publishedDate: '2026-06-16' },
  '/onderhoudsboekje/auto/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational: onderhoudsboekje auto', publishedDate: '2026-06-16' },
  '/onderhoudsboekje/motor/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational: onderhoudsboekje motor', publishedDate: '2026-06-16' },
  '/onderhoudsboekje/oldtimer/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational: onderhoudsboekje oldtimer', publishedDate: '2026-06-16' },
  '/onderhoudsboekje/youngtimer/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational: onderhoudsboekje youngtimer', publishedDate: '2026-06-16' },
  '/onderhoudsboekje-motor/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational / commercial: onderhoudsboekje motor', publishedDate: '2026-06-16' },
  '/digitaal-onderhoudsboekje-motor/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational: digitaal onderhoudsboekje motor', publishedDate: '2026-06-25' },
  '/digitaal-onderhoudsboekje-vs-papier/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational: digitaal vs papier onderhoudsboekje', publishedDate: '2026-06-29' },
  '/onderhoudsboekje-oldtimer/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational / commercial: onderhoudsboekje oldtimer', publishedDate: '2026-06-16' },
  '/onderhoudsboekje-youngtimer/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational / commercial: onderhoudsboekje youngtimer', publishedDate: '2026-06-16' },
  '/youngtimer-onderhoud-bijhouden/': { pageType: 'child', cluster: 'digitaal-onderhoudsboekje', role: 'child', primaryIntent: 'informational: youngtimer onderhoud bijhouden', publishedDate: '2026-05-17' },
  // Child pages - onderhoudshistorie cluster
  '/onderhoudshistorie-auto/': { pageType: 'child', cluster: 'onderhoudshistorie', role: 'child', primaryIntent: 'informational: onderhoudshistorie auto', publishedDate: '2026-07-11' },
  '/onderhoudshistorie-opbouwen/': { pageType: 'child', cluster: 'onderhoudshistorie', role: 'child', primaryIntent: 'informational: onderhoudshistorie opbouwen', publishedDate: '2026-07-11' },
  '/onderhoudshistorie-reconstrueren/': { pageType: 'child', cluster: 'onderhoudshistorie', role: 'child', primaryIntent: 'informational: onderhoudshistorie reconstrueren', publishedDate: '2026-07-11' },
  '/motor-kopen-onderhoudshistorie/': { pageType: 'child', cluster: 'onderhoudshistorie', role: 'child', primaryIntent: 'informational: motor kopen onderhoudshistorie', publishedDate: '2026-05-24' },
  '/voertuighistorie-bij-verkoop/': { pageType: 'child', cluster: 'onderhoudshistorie', role: 'child', primaryIntent: 'informational: voertuighistorie bij verkoop', publishedDate: '2026-07-03' },
  // Comparisons
  '/garagebook-vs-drivvo/': { pageType: 'comparison', cluster: 'vergelijking', role: 'child', primaryIntent: 'commercial: GarageBook vs Drivvo', publishedDate: '2026-07-01' },
  '/garagebook-vs-fuelly/': { pageType: 'comparison', cluster: 'vergelijking', role: 'child', primaryIntent: 'commercial: GarageBook vs Fuelly', publishedDate: '2026-07-01' },
  '/garagebook-vs-simply-auto/': { pageType: 'comparison', cluster: 'vergelijking', role: 'child', primaryIntent: 'commercial: GarageBook vs Simply Auto', publishedDate: '2026-07-01' },
  '/garagebook-vs-motominder/': { pageType: 'comparison', cluster: 'vergelijking', role: 'child', primaryIntent: 'commercial: GarageBook vs MotoMinder', publishedDate: '2026-07-01' },
  // Motortype pages
  '/yamaha-mt-07-onderhoud/': { pageType: 'motortype', cluster: 'motortype', role: 'child', primaryIntent: 'informational: Yamaha MT-07 onderhoud', publishedDate: '2026-07-02' },
  '/bmw-r1250gs-onderhoud/': { pageType: 'motortype', cluster: 'motortype', role: 'child', primaryIntent: 'informational: BMW R 1250 GS onderhoud', publishedDate: '2026-07-02' },
  '/honda-cbr1000rr-fireblade-onderhoud/': { pageType: 'motortype', cluster: 'motortype', role: 'child', primaryIntent: 'informational: Honda CBR1000RR Fireblade onderhoud', publishedDate: '2026-07-02' },
  // Resources
  '/resources/onderhoudschecklist-auto/': { pageType: 'resource', cluster: 'resources', role: 'child', primaryIntent: 'informational: onderhoudschecklist auto', publishedDate: '2026-07-11' },
  '/resources/onderhoudschecklist-motor/': { pageType: 'resource', cluster: 'resources', role: 'child', primaryIntent: 'informational: onderhoudschecklist motor', publishedDate: '2026-07-11' },
  '/resources/welke-onderhoudsdocumenten-bewaren/': { pageType: 'resource', cluster: 'resources', role: 'child', primaryIntent: 'informational: welke onderhoudsdocumenten bewaren', publishedDate: '2026-07-11' },
  '/resources/checklist-verkoop-voertuig/': { pageType: 'resource', cluster: 'resources', role: 'child', primaryIntent: 'informational: checklist verkoop voertuig', publishedDate: '2026-07-11' },
  '/resources/onderhoudshistorie-checklist/': { pageType: 'resource', cluster: 'resources', role: 'child', primaryIntent: 'informational: onderhoudshistorie checklist', publishedDate: '2026-07-11' },
  '/resources/jaarlijkse-onderhoudsplanning/': { pageType: 'resource', cluster: 'resources', role: 'child', primaryIntent: 'informational: jaarlijkse onderhoudsplanning', publishedDate: '2026-07-11' },
  // Insights
  '/insights/garagebook-gebruik-en-onderhoud-2026/': { pageType: 'insight', cluster: 'insights', role: 'article', primaryIntent: 'informational: GarageBook gebruik en onderhoud 2026', publishedDate: '2026-07-12' },
  // Other SEO pages (in sitemap)
  '/over-garagebook/': { pageType: 'other-seo', cluster: '-', role: '-', primaryIntent: 'brand informational', publishedDate: '2026-07-02' },
  '/pers/': { pageType: 'other-seo', cluster: '-', role: '-', primaryIntent: 'brand: pers', publishedDate: '2026-07-02' },
  '/contact/': { pageType: 'other-seo', cluster: '-', role: '-', primaryIntent: 'navigational: contact', publishedDate: '2026-07-02' },
  '/privacy/': { pageType: 'other-seo', cluster: '-', role: '-', primaryIntent: 'legal: privacy', publishedDate: '2026-07-02' },
  '/media/': { pageType: 'other-seo', cluster: '-', role: '-', primaryIntent: 'brand: media kit', publishedDate: '2026-07-02' },
  '/garage-samenwerking/': { pageType: 'other-seo', cluster: '-', role: '-', primaryIntent: 'commercial: garage samenwerking', publishedDate: '2026-05-19' },
  // Blog posts
  '/blog/onderhoudsboekje-kwijt-wat-te-doen/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: onderhoudsboekje kwijt', publishedDate: '2026-06-16' },
  '/blog/onderhoudsboekje-invullen-oldtimer-youngtimer/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: onderhoudsboekje invullen oldtimer youngtimer', publishedDate: '2026-06-16' },
  '/blog/digitaal-vs-fysiek-onderhoudsboekje/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: digitaal vs fysiek onderhoudsboekje', publishedDate: '2026-06-16' },
  '/blog/motor-apk-europa-zelf-onderhoud/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: motor APK Europa zelf onderhoud', publishedDate: '2026-05-24' },
  '/blog/beste-motor-onderhoud-app/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'commercial: beste motor onderhoud app', publishedDate: '2026-05-18' },
  '/blog/liberty-rider-alternatief-motor-onderhoud/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'commercial: Liberty Rider alternatief', publishedDate: '2026-05-18' },
  '/blog/motor-onderhoud-bijhouden-excel-of-app/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: motor onderhoud bijhouden excel of app', publishedDate: '2026-05-18' },
  '/blog/onderhoudshistorie-motor-bewijs-bij-verkoop/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: onderhoudshistorie motor bewijs bij verkoop', publishedDate: '2026-05-18' },
  '/blog/auto-onderhoud-bijhouden-digitaal/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: auto onderhoud bijhouden digitaal', publishedDate: '2026-05-18' },
  '/blog/digitaal-onderhoudsboekje-auto-motor-verschil/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: digitaal onderhoudsboekje auto motor verschil', publishedDate: '2026-05-18' },
  '/blog/digitaal-onderhoudsboekje-auto-motor-online/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: digitaal onderhoudsboekje auto motor online', publishedDate: '2026-05-24' },
  '/blog/onderhoudsboekje-oldtimer-onderhoudshistorie/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: onderhoudsboekje oldtimer onderhoudshistorie', publishedDate: '2026-07-03' },
  '/blog/youngtimer-onderhoud-bijhouden-digitaal-onderhoudsboekje/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: youngtimer onderhoud bijhouden digitaal', publishedDate: '2026-05-24' },
  '/blog/zelf-motor-onderhouden-bewijs-bijhouden/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: zelf motor onderhouden bewijs bijhouden', publishedDate: '2026-05-24' },
  '/blog/universeel-onderhoudsboekje-kopen-dit-is-het-beste-alternatief-2026/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'commercial: universeel onderhoudsboekje alternatief', publishedDate: '2026-05-24' },
  '/blog/hoe-een-complete-onderhoudshistorie-de-verkoopwaarde-van-je-motor-verhoogt/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: onderhoudshistorie verkoopwaarde motor', publishedDate: '2026-05-24' },
  '/blog/waarom-een-universeel-onderhoudsboekje-achterhaald-is-en-wat-je-beter-kunt-gebruiken/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: universeel onderhoudsboekje achterhaald', publishedDate: '2026-05-24' },
  '/blog/motor-verkopen-dit-doet-een-goede-onderhoudshistorie-met-je-prijs/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: motor verkopen onderhoudshistorie prijs', publishedDate: '2026-05-24' },
  '/blog/digitaal-onderhoudsboekje-voor-je-motor-wat-is-het-en-hoe-werkt-het/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: digitaal onderhoudsboekje motor wat en hoe', publishedDate: '2026-05-24' },
  '/blog/waarom-elke-motor-een-digitaal-onderhoudsboek-zou-moeten-hebben/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: digitaal onderhoudsboek motor', publishedDate: '2026-05-24' },
  '/blog/onderhoudshistorie-van-je-motor-kwijt-dit-kun-je-doen-en-voorkomen-in-de-toekomst/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: onderhoudshistorie motor kwijt', publishedDate: '2026-05-24' },
  '/blog/hoe-motorrijders-hun-onderhoud-nu-bijhouden-en-waarom-dat-vaak-misgaat/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: hoe motorrijders onderhoud bijhouden', publishedDate: '2026-05-24' },
  '/blog/digitaal-onderhoudsboekje-voor-je-motor-van-papieren-boekje-naar-complete-historie/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: van papieren boekje naar digitaal', publishedDate: '2026-05-24' },
  '/blog/de-verborgen-waarde-van-een-goed-gedocumenteerde-motor/': { pageType: 'blog', cluster: 'blog', role: 'post', primaryIntent: 'informational: verborgen waarde gedocumenteerde motor', publishedDate: '2026-05-24' },
  // Non-indexed pages (no sitemap entry)
  '/geratel/': { pageType: 'other-seo', cluster: '-', role: '-', primaryIntent: 'partner: geratel', publishedDate: '2026-05-19', indexable: false },
  '/ktm-390-duke-onderhoud/': { pageType: 'motortype', cluster: 'motortype', role: 'child', primaryIntent: 'informational: KTM 390 Duke onderhoud', publishedDate: '2026-07-02', indexable: false },
  '/triumph-bonneville-t120-onderhoud/': { pageType: 'motortype', cluster: 'motortype', role: 'child', primaryIntent: 'informational: Triumph Bonneville T120 onderhoud', publishedDate: '2026-07-02', indexable: false },
};

// Files to ignore entirely
const IGNORED_FILES = new Set([
  '404.html',
  '__layout_check__.html',
  'motor-onderhoud-bijhouden/alternatief.html',
  'insights/_template/index.html',
]);

// ── Helper functions ──────────────────────────────────────────────────────────

function attr(source, selectorRegex, attrName) {
  const tag = source.match(selectorRegex)?.[0];
  if (!tag) return null;
  return tag.match(new RegExp(`\\b${attrName}=["']([^"']+)["']`, 'i'))?.[1] ?? null;
}

function tagContent(source, tagName) {
  const m = source.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function collectJsonLdTypes(source) {
  const types = [];
  for (const block of source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(block[1].trim());
      collectTypes(parsed, types);
    } catch (_) {}
  }
  return [...new Set(types)];
}

function collectTypes(val, out) {
  if (!val || typeof val !== 'object') return;
  if (Array.isArray(val)) { val.forEach(v => collectTypes(v, out)); return; }
  if (val['@type']) {
    if (Array.isArray(val['@type'])) out.push(...val['@type']);
    else out.push(val['@type']);
  }
  for (const child of Object.values(val)) collectTypes(child, out);
}

function urlToFile(urlPath) {
  if (urlPath === '/') return 'index.html';
  return urlPath.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
}

function fileToUrlPath(file) {
  if (file === 'index.html') return '/';
  return '/' + file.replace(/index\.html$/, '');
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ── Parse sitemap ─────────────────────────────────────────────────────────────
const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const sitemapLastmod = {};
for (const m of sitemapXml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
  const urlPath = new URL(m[1].trim()).pathname;
  sitemapLastmod[urlPath] = m[2].trim();
}

// ── Scan HTML files ───────────────────────────────────────────────────────────
function findHtmlFiles(dir, base = '') {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      result.push(...findHtmlFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.html') && !IGNORED_FILES.has(rel)) {
      result.push(rel);
    }
  }
  return result;
}

const allHtmlFiles = findHtmlFiles(ROOT).filter(f => f.endsWith('index.html'));

// ── Build inbound link counts ─────────────────────────────────────────────────
const inboundCounts = {};
for (const file of allHtmlFiles) {
  if (IGNORED_FILES.has(file)) continue;
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const fromPath = fileToUrlPath(file);
  for (const m of source.matchAll(/\bhref=["']([^"'#?]+)['"]/g)) {
    let href = m[1].trim();
    if (!href.startsWith('/') && !href.startsWith('https://garagebook.nl')) continue;
    let targetPath;
    if (href.startsWith('https://garagebook.nl')) {
      try { targetPath = new URL(href).pathname; } catch (_) { continue; }
    } else {
      targetPath = href.endsWith('/') ? href : `${href}/`;
    }
    if (targetPath === fromPath) continue; // skip self-links
    if (!targetPath || targetPath === '/') continue;
    inboundCounts[targetPath] = (inboundCounts[targetPath] || 0) + 1;
  }
}

// ── Build inventory ───────────────────────────────────────────────────────────
const pages = [];

for (const file of allHtmlFiles) {
  if (IGNORED_FILES.has(file)) continue;

  const urlPath = fileToUrlPath(file);
  const url = `${SITE}${urlPath}`;
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');

  const title = tagContent(source, 'title');
  const description = attr(source, /<meta\b[^>]*\bname=["']description["'][^>]*>/i, 'content');
  const canonical = attr(source, /<link\b[^>]*\brel=["']canonical["'][^>]*>/i, 'href');
  const robots = attr(source, /<meta\b[^>]*\bname=["']robots["'][^>]*>/i, 'content') || 'index, follow';
  const h1Count = (source.match(/<h1\b[^>]*>/gi) || []).length;
  const hasOg = /<meta\b[^>]*\bproperty=["']og:/i.test(source);
  const structuredDataTypes = collectJsonLdTypes(source);

  const isNoindex = /(^|[,\s])noindex([,\s]|$)/i.test(robots);
  const inSitemap = !!sitemapLastmod[urlPath];
  const lastModified = sitemapLastmod[urlPath] || null;

  const config = PAGE_CONFIG[urlPath] || {};
  const indexable = config.indexable !== false && !isNoindex;

  const publishedDate = config.publishedDate || lastModified || null;
  const pageAgedays = daysSince(publishedDate);

  // URL depth: count non-empty path segments
  const urlDepth = urlPath.split('/').filter(Boolean).length;

  const inboundLinkCount = inboundCounts[urlPath] || 0;

  pages.push({
    url,
    path: file,
    urlPath,
    pageType: config.pageType || 'child',
    cluster: config.cluster || '-',
    role: config.role || 'child',
    primaryIntent: config.primaryIntent || '',
    indexable,
    inSitemap,
    publishedDate,
    lastModified,
    pageAgeDays: pageAgedays,
    urlDepth,
    inboundLinkCount,
    title,
    description,
    canonical: canonical || null,
    robots,
    h1Count,
    hasOg,
    structuredDataTypes,
  });
}

// Sort: homepage first, then by urlPath
pages.sort((a, b) => {
  if (a.urlPath === '/') return -1;
  if (b.urlPath === '/') return 1;
  return a.urlPath.localeCompare(b.urlPath);
});

const inventory = {
  generated: TODAY,
  totalPages: pages.length,
  indexablePages: pages.filter(p => p.indexable).length,
  pages,
};

const outPath = path.join(ROOT, 'data', 'seo', 'pages.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(inventory, null, 2) + '\n', 'utf8');
console.log(`Written ${pages.length} pages to data/seo/pages.json (${inventory.indexablePages} indexable).`);
