#!/usr/bin/env node
/**
 * Regression checks for public GarageBook garage discovery from the static site.
 *
 * Production currently serves one static sitemap.xml urlset from GitHub Pages.
 * sitemap-garages.xml is optional: absent is valid today, present files are
 * validated as future static exports from the Laravel app.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://garagebook.nl';
const EXAMPLES_FILE = 'openbare-garages/index.html';
const EXAMPLES_URL = `${SITE}/openbare-garages/`;
const GARAGE_SITEMAP_FILE = 'sitemap-garages.xml';

const failures = [];
const notes = [];

function listFiles(args) {
  const output = cp.execFileSync('rg', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  return output ? output.split(/\n/).filter(Boolean) : [];
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function attr(source, selectorRegex, attrName) {
  const tag = source.match(selectorRegex)?.[0];
  if (!tag) return null;
  return tag.match(new RegExp(`\\b${attrName}=["']([^"']+)["']`, 'i'))?.[1] ?? null;
}

function activeTextFiles() {
  return listFiles([
    '--files',
    '-g', '*.html',
    '-g', '*.json',
    '-g', '*.xml',
    '-g', '*.js',
    '-g', '*.sh',
    '-g', '*.txt',
    '-g', 'robots.txt',
  ])
    .filter((file) => !file.startsWith('node_modules/'))
    .filter((file) => !file.startsWith('_oud/') && !file.includes('/_oud/'))
    .filter((file) => !file.startsWith('docs/'))
    .filter((file) => !file.startsWith('data/seo/reports/'))
    .filter((file) => !['temp.txt', 'outreach-backlink-motor.md', 'scripts/check-public-garage-seo.js'].includes(file));
}

function locsFrom(source) {
  return [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

function rootElement(source) {
  return source.match(/<([a-z][\w:-]*)\b[^>]*>/i)?.[1]?.toLowerCase() ?? null;
}

function checkBasicXml(file, source) {
  if (!source.trim().startsWith('<?xml')) failures.push(`${file}: XML declaration is missing`);

  const root = rootElement(source);
  if (!root) {
    failures.push(`${file}: XML root element is missing`);
    return null;
  }

  if (!new RegExp(`</${root}>\\s*$`, 'i').test(source)) {
    failures.push(`${file}: XML root element is not closed`);
  }

  return root;
}

function checkNoAppHostGarageUrls() {
  const pattern = /https:\/\/app\.garagebook\.nl\/garage\//i;
  for (const file of activeTextFiles()) {
    const source = read(file);
    const match = source.match(pattern);
    if (match) failures.push(`${file}:${lineNumber(source, match.index)} public garage URL uses app host: ${match[0]}`);
  }
}

function checkSitemaps() {
  if (!fs.existsSync(path.join(ROOT, 'sitemap.xml'))) {
    failures.push('sitemap.xml: missing static sitemap');
    return;
  }

  const source = read('sitemap.xml');
  const root = checkBasicXml('sitemap.xml', source);
  if (root !== 'urlset') failures.push(`sitemap.xml: expected <urlset>, found <${root || 'missing'}>`);
  if (/<sitemapindex\b/i.test(source)) failures.push('sitemap.xml: sitemap index is not the current production architecture');
  if (/https:\/\/app\.garagebook\.nl\/garage\//i.test(source)) failures.push('sitemap.xml: sitemap must not contain app-host public garage URLs');

  const locs = locsFrom(source);
  const seen = new Map();
  for (const loc of locs) {
    seen.set(loc, (seen.get(loc) || 0) + 1);

    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      failures.push(`sitemap.xml: invalid sitemap loc: ${loc}`);
      continue;
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== 'garagebook.nl') {
      failures.push(`sitemap.xml: sitemap loc must use ${SITE}: ${loc}`);
    }
    if (parsed.pathname.startsWith('/garage/')) {
      failures.push(`sitemap.xml: individual /garage/ URLs do not belong in the static marketing sitemap: ${loc}`);
    }
  }

  for (const [loc, count] of seen.entries()) {
    if (count > 1) failures.push(`sitemap.xml: duplicate sitemap loc (${count}x): ${loc}`);
  }

  const examplesCount = locs.filter((loc) => loc === EXAMPLES_URL).length;
  if (examplesCount !== 1) failures.push(`sitemap.xml: expected exactly one ${EXAMPLES_URL} entry, found ${examplesCount}`);

  checkOptionalGarageSitemap();
}

function checkOptionalGarageSitemap() {
  if (!fs.existsSync(path.join(ROOT, GARAGE_SITEMAP_FILE))) {
    notes.push('Garage sitemap: not present (allowed; optional)');
    return;
  }

  const source = read(GARAGE_SITEMAP_FILE);
  const root = checkBasicXml(GARAGE_SITEMAP_FILE, source);
  if (root !== 'urlset') failures.push(`${GARAGE_SITEMAP_FILE}: expected <urlset>, found <${root || 'missing'}>`);
  if (/https:\/\/app\.garagebook\.nl\/garage\//i.test(source)) failures.push(`${GARAGE_SITEMAP_FILE}: must not contain app-host public garage URLs`);
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(source)) failures.push(`${GARAGE_SITEMAP_FILE}: must not contain email addresses`);
  if (/\b(owner|eigenaar|email|phone|telephone|kenteken|license_plate|name)\b/i.test(source)) {
    failures.push(`${GARAGE_SITEMAP_FILE}: contains a personal or sensitive field/string`);
  }

  const seen = new Map();
  for (const loc of locsFrom(source)) {
    seen.set(loc, (seen.get(loc) || 0) + 1);

    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      failures.push(`${GARAGE_SITEMAP_FILE}: invalid sitemap loc: ${loc}`);
      continue;
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== 'garagebook.nl') {
      failures.push(`${GARAGE_SITEMAP_FILE}: sitemap loc must use ${SITE}: ${loc}`);
    }
    if (!parsed.pathname.startsWith('/garage/')) failures.push(`${GARAGE_SITEMAP_FILE}: only public garage URLs are allowed: ${loc}`);

    const slug = parsed.pathname.replace(/^\/garage\//, '').replace(/\/$/, '');
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) failures.push(`${GARAGE_SITEMAP_FILE}: invalid or empty public slug in loc: ${loc}`);
  }

  for (const [loc, count] of seen.entries()) {
    if (count > 1) failures.push(`${GARAGE_SITEMAP_FILE}: duplicate sitemap loc (${count}x): ${loc}`);
  }

  notes.push('Garage sitemap: present and valid');
}

function checkExamplesPage() {
  if (!fs.existsSync(path.join(ROOT, EXAMPLES_FILE))) {
    failures.push(`${EXAMPLES_FILE}: missing public garage examples page`);
    return;
  }

  const source = read(EXAMPLES_FILE);
  const canonicalTags = [...source.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)];
  const canonical = attr(source, /<link\b[^>]*\brel=["']canonical["'][^>]*>/i, 'href');
  const ogUrl = attr(source, /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i, 'content');

  if (canonicalTags.length !== 1) failures.push(`${EXAMPLES_FILE}: expected exactly one canonical, found ${canonicalTags.length}`);
  if (canonical !== EXAMPLES_URL) failures.push(`${EXAMPLES_FILE}: canonical must be ${EXAMPLES_URL}, found ${canonical || 'missing'}`);
  if (ogUrl !== canonical) failures.push(`${EXAMPLES_FILE}: og:url must equal canonical`);
  if (/href=["'](?:#|TODO|TBD|PLACEHOLDER|javascript:)/i.test(source)) failures.push(`${EXAMPLES_FILE}: contains a placeholder or non-crawlable href`);
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(source)) failures.push(`${EXAMPLES_FILE}: must not contain email addresses`);
  if (!/nog geen individuele voertuigen/i.test(source)) failures.push(`${EXAMPLES_FILE}: must clearly state that no individual vehicles are shown yet`);

  const linkedFrom = listFiles(['--files', '-g', '*.html'])
    .filter((file) => file !== EXAMPLES_FILE)
    .filter((file) => !file.startsWith('node_modules/'))
    .filter((file) => !file.startsWith('_oud/') && !file.includes('/_oud/'))
    .filter((file) => read(file).includes('/openbare-garages/'));

  if (linkedFrom.length === 0) failures.push(`${EXAMPLES_FILE}: page has no active incoming internal link`);
}

function checkGarageHrefs() {
  for (const file of listFiles(['--files', '-g', '*.html'])) {
    if (file.startsWith('node_modules/') || file.startsWith('_oud/') || file.includes('/_oud/')) continue;
    const source = read(file);
    for (const match of source.matchAll(/\bhref=["']([^"']*\/garage\/[^"']*)["']/gi)) {
      const href = match[1];
      if (href.startsWith('https://app.garagebook.nl/garage/')) {
        failures.push(`${file}:${lineNumber(source, match.index)} public garage href uses app host: ${href}`);
      } else if (href.startsWith('/garage/')) {
        continue;
      } else if (href.startsWith('https://garagebook.nl/garage/')) {
        continue;
      } else {
        failures.push(`${file}:${lineNumber(source, match.index)} unexpected public garage href: ${href}`);
      }
    }
  }
}

function checkShowcaseDataPrivacy() {
  const candidates = [
    'data/public-garage-showcase.json',
    'data/openbare-garages.json',
    'data/garage-showcase.json',
  ];

  for (const file of candidates) {
    if (!fs.existsSync(path.join(ROOT, file))) continue;
    const source = read(file);
    let parsed;
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      failures.push(`${file}: JSON is not parseable: ${error.message}`);
      continue;
    }

    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(source)) failures.push(`${file}: showcase data must not contain email addresses`);
    if (/\b(name|email|user|owner|phone|telephone|kenteken|license_plate)\b/i.test(source)) {
      failures.push(`${file}: showcase data contains a field name that may expose personal or sensitive data`);
    }
    if (!JSON.stringify(parsed).includes('showcase_eligible')) {
      failures.push(`${file}: showcase data must include explicit showcase_eligible fields`);
    }
    if (!/"showcase_eligible"\s*:\s*true/.test(source)) failures.push(`${file}: showcase data must require explicit showcase_eligible: true`);
  }
}

checkNoAppHostGarageUrls();
checkSitemaps();
checkExamplesPage();
checkGarageHrefs();
checkShowcaseDataPrivacy();

if (failures.length) {
  console.error('Public garage SEO check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Public garage SEO check passed: app-host garage URLs, static sitemap, examples page, internal links and optional showcase data are clean.');
for (const note of notes) console.log(note);
