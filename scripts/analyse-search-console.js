#!/usr/bin/env node
/**
 * analyse-search-console.js
 * Verwerkt handmatig geëxporteerde Google Search Console CSV-bestanden,
 * koppelt data aan de centrale pagina-inventaris en genereert een rapport.
 *
 * Gebruik:
 *   node scripts/analyse-search-console.js [--pages <pages.csv>] [--queries <queries.csv>]
 *
 * Optionele periode-vergelijking:
 *   node scripts/analyse-search-console.js --pages <now.csv> --pages-prev <prev.csv>
 *
 * Output: data/seo/reports/seo-report-YYYY-MM-DD.md + .csv
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10);

// ── Configureerbare drempelwaarden ────────────────────────────────────────────
const CONFIG = {
  newPageDays: 14,           // ≤ dit aantal dagen: "new / awaiting data"
  earlySignalDays: 42,       // ≤ dit: "early signals"
  rankingOppMinImpr: 10,     // minimale vertoningen voor ranking opportunity
  rankingOppPosMin: 8,       // positie >= dit voor ranking opportunity
  rankingOppPosMax: 30,      // positie <= dit voor ranking opportunity
  ctrOppMinImpr: 50,         // minimale vertoningen voor CTR opportunity
  ctrOppMaxPos: 10,          // positie <= dit voor CTR opportunity
  ctrOppMaxCTR: 0.03,        // CTR < dit% voor CTR opportunity
  indexConcernDays: 42,      // ouder dan dit en geen vertoningen: indexation concern
  performerMinClicks: 5,     // minimale klikken voor "performer"
};

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let pagesFile = null;
let pagesPrevFile = null;
let queriesFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pages' && args[i + 1]) pagesFile = args[++i];
  else if (args[i] === '--pages-prev' && args[i + 1]) pagesPrevFile = args[++i];
  else if (args[i] === '--queries' && args[i + 1]) queriesFile = args[++i];
}

// ── Load inventory ────────────────────────────────────────────────────────────
const inventoryPath = path.join(ROOT, 'data', 'seo', 'pages.json');
if (!fs.existsSync(inventoryPath)) {
  console.error('ERROR: data/seo/pages.json niet gevonden. Draai eerst: node scripts/build-page-inventory.js');
  process.exit(1);
}
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const indexablePages = inventory.pages.filter(p => p.indexable);

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());

  // Detect delimiter: tab or comma
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseLine(lines[i], sep);
    if (parts.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = (parts[idx] || '').replace(/^"|"$/g, '').trim(); });
    rows.push(row);
  }
  return { headers, rows };
}

function parseLine(line, sep) {
  if (sep !== ',') return line.split(sep);
  // Minimal CSV field split respecting quoted fields
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

// Normalize a GSC URL or path to a path with trailing slash
function normalizePath(raw) {
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://garagebook.nl${raw}`);
    if (u.hostname !== 'garagebook.nl') return null;
    return u.pathname.endsWith('/') ? u.pathname : u.pathname + '/';
  } catch (_) {
    return null;
  }
}

function parseNumber(v) {
  if (!v) return null;
  const n = parseFloat(v.replace(/[%,]/g, ''));
  return isNaN(n) ? null : n;
}

// Detect which field is the "page" vs "query" column
function detectMode(headers) {
  if (headers.includes('top pages') || headers.includes('page') || headers.includes('landing page')) return 'pages';
  if (headers.includes('top queries') || headers.includes('query') || headers.includes('keyword')) return 'queries';
  return 'unknown';
}

function pageField(headers) {
  return ['top pages', 'page', 'landing page', 'url'].find(h => headers.includes(h));
}

function queryField(headers) {
  return ['top queries', 'query', 'keyword', 'search query'].find(h => headers.includes(h));
}

function extractMetrics(row, headers) {
  const clicksKey = ['clicks', 'click s', 'kliks'].find(k => headers.includes(k));
  const imprKey = ['impressions', 'vertoningen'].find(k => headers.includes(k));
  const ctrKey = ['ctr'].find(k => headers.includes(k));
  const posKey = ['position', 'avg. position', 'gemiddelde positie', 'gemiddelde positie'].find(k => headers.includes(k));
  return {
    clicks: parseNumber(row[clicksKey]) ?? 0,
    impressions: parseNumber(row[imprKey]) ?? 0,
    ctr: parseNumber(row[ctrKey]),
    position: parseNumber(row[posKey]),
  };
}

// ── Load Search Console data ──────────────────────────────────────────────────
const scPages = {};   // urlPath → { clicks, impressions, ctr, position }
const scPrev = {};    // urlPath → { clicks, impressions, ctr, position } (previous period)
const scQueries = []; // [{ query, clicks, impressions, ctr, position }]

if (pagesFile) {
  const { headers, rows } = parseCSV(pagesFile);
  const field = pageField(headers);
  if (!field) {
    console.warn(`WARN: Kan pagina-kolom niet vinden in ${pagesFile}. Headers: ${headers.join(', ')}`);
  } else {
    for (const row of rows) {
      const p = normalizePath(row[field]);
      if (!p) continue;
      scPages[p] = extractMetrics(row, headers);
    }
    console.log(`Pages CSV: ${Object.keys(scPages).length} pagina's geladen uit ${pagesFile}`);
  }
}

if (pagesPrevFile) {
  const { headers, rows } = parseCSV(pagesPrevFile);
  const field = pageField(headers);
  if (field) {
    for (const row of rows) {
      const p = normalizePath(row[field]);
      if (!p) continue;
      scPrev[p] = extractMetrics(row, headers);
    }
    console.log(`Pages-prev CSV: ${Object.keys(scPrev).length} pagina's geladen uit ${pagesPrevFile}`);
  }
}

if (queriesFile) {
  const { headers, rows } = parseCSV(queriesFile);
  const field = queryField(headers);
  if (!field) {
    console.warn(`WARN: Kan query-kolom niet vinden in ${queriesFile}. Headers: ${headers.join(', ')}`);
  } else {
    for (const row of rows) {
      const q = row[field];
      if (!q) continue;
      scQueries.push({ query: q, ...extractMetrics(row, headers) });
    }
    console.log(`Queries CSV: ${scQueries.length} queries geladen uit ${queriesFile}`);
  }
}

const hasScData = Object.keys(scPages).length > 0;

// ── Classify pages ────────────────────────────────────────────────────────────
function classifyPage(page, sc, prev) {
  const age = page.pageAgeDays ?? 9999;
  const impr = sc?.impressions ?? 0;
  const clicks = sc?.clicks ?? 0;
  const pos = sc?.position ?? null;
  const ctr = sc?.ctr ?? null;

  if (age <= CONFIG.newPageDays) return 'new';
  if (age <= CONFIG.earlySignalDays && impr < 5) return 'early-signals';

  if (!sc || impr === 0) {
    return age > CONFIG.indexConcernDays ? 'indexation-concern' : 'early-signals';
  }

  if (clicks >= CONFIG.performerMinClicks && pos !== null && pos <= 7) {
    const prevClicks = prev?.clicks ?? 0;
    const trend = prevClicks > 0 ? ((clicks - prevClicks) / prevClicks * 100).toFixed(0) : null;
    return trend !== null && parseFloat(trend) < -15 ? 'declining' : 'performer';
  }

  if (pos !== null && pos >= CONFIG.rankingOppPosMin && pos <= CONFIG.rankingOppPosMax && impr >= CONFIG.rankingOppMinImpr) {
    return 'ranking-opportunity';
  }

  if (pos !== null && pos <= CONFIG.ctrOppMaxPos && impr >= CONFIG.ctrOppMinImpr && (ctr !== null && ctr / 100 < CONFIG.ctrOppMaxCTR)) {
    return 'ctr-opportunity';
  }

  return 'monitor';
}

// ── Build enriched page list ──────────────────────────────────────────────────
const enriched = indexablePages.map(page => {
  const sc = scPages[page.urlPath] ?? null;
  const prev = scPrev[page.urlPath] ?? null;
  const classification = classifyPage(page, sc, prev);

  return {
    ...page,
    sc,
    scPrev: prev,
    classification,
  };
});

// ── Cannibalisatie detectie ───────────────────────────────────────────────────
// Zoek titels die sterk overlappen (zelfde eerste 6 woorden)
const titlePrefix = {};
const cannibalisationWarnings = [];
for (const p of enriched) {
  if (!p.title) continue;
  const key = p.title.toLowerCase().split(/\s+/).slice(0, 6).join(' ');
  if (titlePrefix[key]) {
    cannibalisationWarnings.push(`"${p.urlPath}" en "${titlePrefix[key]}" lijken sterk op elkaar (title-prefix: "${key}")`);
  } else {
    titlePrefix[key] = p.urlPath;
  }
}

// ── Bereken statistieken ──────────────────────────────────────────────────────
const byType = {};
const byCluster = {};
for (const p of enriched) {
  byType[p.pageType] = (byType[p.pageType] || 0) + 1;
  byCluster[p.cluster] = (byCluster[p.cluster] || 0) + 1;
}

const orphans = enriched.filter(p => p.inboundLinkCount === 0 && p.urlPath !== '/');
const noImpressions = enriched.filter(p => !p.sc || p.sc.impressions === 0);
const newPages = enriched.filter(p => p.classification === 'new');
const rankingOpps = enriched.filter(p => p.classification === 'ranking-opportunity')
  .sort((a, b) => (a.sc?.impressions ?? 0) > (b.sc?.impressions ?? 0) ? -1 : 1);
const ctrOpps = enriched.filter(p => p.classification === 'ctr-opportunity')
  .sort((a, b) => (b.sc?.impressions ?? 0) - (a.sc?.impressions ?? 0));
const performers = enriched.filter(p => p.classification === 'performer')
  .sort((a, b) => (b.sc?.clicks ?? 0) - (a.sc?.clicks ?? 0));
const indexConcerns = enriched.filter(p => p.classification === 'indexation-concern');
const earlySignals = enriched.filter(p => p.classification === 'early-signals');

// ── Aanbevolen acties ─────────────────────────────────────────────────────────
const actions = [];

if (indexConcerns.length > 0) {
  actions.push({
    priority: 1,
    impact: 'hoog',
    confidence: 'hoog',
    effort: 'laag',
    action: `Controleer indexatie van ${indexConcerns.length} pagina('s) zonder vertoningen ouder dan ${CONFIG.indexConcernDays} dagen`,
    pages: indexConcerns.map(p => p.urlPath),
  });
}

for (const p of rankingOpps.slice(0, 3)) {
  actions.push({
    priority: 2,
    impact: 'hoog',
    confidence: 'middel',
    effort: 'middel',
    action: `Ranking opportunity: "${p.title}" staat op positie ${p.sc?.position?.toFixed(1)} met ${p.sc?.impressions} vertoningen`,
    pages: [p.urlPath],
  });
}

for (const p of ctrOpps.slice(0, 2)) {
  const ctrPct = p.sc?.ctr != null ? p.sc.ctr.toFixed(1) + '%' : '-';
  actions.push({
    priority: 3,
    impact: 'middel',
    confidence: 'hoog',
    effort: 'laag',
    action: `CTR opportunity: "${p.title}" heeft CTR ${ctrPct} bij positie ${p.sc?.position?.toFixed(1)} en ${p.sc?.impressions} vertoningen`,
    pages: [p.urlPath],
  });
}

if (orphans.length > 0) {
  actions.push({
    priority: 4,
    impact: 'middel',
    confidence: 'hoog',
    effort: 'laag',
    action: `${orphans.length} pagina('s) zonder inkomende interne links: voeg contextlinks toe`,
    pages: orphans.map(p => p.urlPath),
  });
}

if (cannibalisationWarnings.length > 0) {
  actions.push({
    priority: 5,
    impact: 'middel',
    confidence: 'middel',
    effort: 'middel',
    action: `Mogelijke cannibalisatie: ${cannibalisationWarnings.length} pagina-paren met overlappende titels`,
    pages: [],
  });
}

// Begrens tot 10 acties
const topActions = actions.slice(0, 10);

// ── Genereer Markdown-rapport ─────────────────────────────────────────────────
function pct(n, total) { return total > 0 ? ` (${(n / total * 100).toFixed(0)}%)` : ''; }

let md = `# GarageBook SEO-rapport\n\nGegenereerd: ${TODAY}`;
if (hasScData) md += `  \nSearch Console data: ${pagesFile || ''}${queriesFile ? ` / ${queriesFile}` : ''}`;
md += `\n\n---\n\n`;

md += `## Samenvatting\n\n`;
md += `| Metriek | Waarde |\n|---|---|\n`;
md += `| Totaal indexeerbare pagina's | ${enriched.length} |\n`;
md += `| Pagina's met vertoningen | ${enriched.filter(p => (p.sc?.impressions ?? 0) > 0).length}${pct(enriched.filter(p => (p.sc?.impressions ?? 0) > 0).length, enriched.length)} |\n`;
md += `| Pagina's zonder vertoningen | ${noImpressions.length} |\n`;
md += `| Nieuwe pagina's (≤${CONFIG.newPageDays}d) | ${newPages.length} |\n`;
md += `| Vroege signalen (${CONFIG.newPageDays + 1}–${CONFIG.earlySignalDays}d) | ${earlySignals.length} |\n`;
md += `| Indexation concerns | ${indexConcerns.length} |\n`;
md += `| Ranking opportunities | ${rankingOpps.length} |\n`;
md += `| CTR opportunities | ${ctrOpps.length} |\n`;
md += `| Performers | ${performers.length} |\n`;
md += `| Orphan pagina's | ${orphans.length} |\n\n`;

md += `## Pagina's per type\n\n`;
md += `| Type | Aantal |\n|---|---|\n`;
for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  md += `| ${type} | ${count} |\n`;
}

md += `\n## Pagina's per cluster\n\n`;
md += `| Cluster | Aantal |\n|---|---|\n`;
for (const [cluster, count] of Object.entries(byCluster).sort((a, b) => b[1] - a[1])) {
  md += `| ${cluster} | ${count} |\n`;
}

if (indexConcerns.length > 0) {
  md += `\n## Indexation concerns\n\nPagina's ouder dan ${CONFIG.indexConcernDays} dagen zonder vertoningen:\n\n`;
  for (const p of indexConcerns) {
    md += `- \`${p.urlPath}\` — ${p.pageType}, ${p.pageAgeDays}d oud, 0 vertoningen\n`;
  }
}

if (newPages.length > 0) {
  md += `\n## Nieuwe pagina's (wachten op meetdata)\n\n`;
  for (const p of newPages) {
    md += `- \`${p.urlPath}\` — ${p.pageType}, ${p.pageAgeDays}d oud\n`;
  }
}

if (performers.length > 0) {
  md += `\n## Performers\n\n`;
  md += `| Pagina | Klikken | Vertoningen | CTR | Positie |\n|---|---|---|---|---|\n`;
  for (const p of performers.slice(0, 10)) {
    const s = p.sc;
    md += `| \`${p.urlPath}\` | ${s.clicks} | ${s.impressions} | ${s.ctr?.toFixed(1) ?? '-'}% | ${s.position?.toFixed(1) ?? '-'} |\n`;
  }
}

if (rankingOpps.length > 0) {
  md += `\n## Ranking opportunities (positie ${CONFIG.rankingOppPosMin}–${CONFIG.rankingOppPosMax})\n\n`;
  md += `| Pagina | Positie | Vertoningen | Klikken |\n|---|---|---|---|\n`;
  for (const p of rankingOpps.slice(0, 10)) {
    const s = p.sc;
    md += `| \`${p.urlPath}\` | ${s.position?.toFixed(1) ?? '-'} | ${s.impressions} | ${s.clicks} |\n`;
  }
}

if (ctrOpps.length > 0) {
  md += `\n## CTR opportunities\n\n`;
  md += `| Pagina | Positie | Vertoningen | CTR |\n|---|---|---|---|\n`;
  for (const p of ctrOpps.slice(0, 10)) {
    const s = p.sc;
    md += `| \`${p.urlPath}\` | ${s.position?.toFixed(1) ?? '-'} | ${s.impressions} | ${s.ctr?.toFixed(1) ?? '-'}% |\n`;
  }
}

if (orphans.length > 0) {
  md += `\n## Orphan pagina's (geen inkomende interne links)\n\n`;
  for (const p of orphans) {
    md += `- \`${p.urlPath}\` — ${p.pageType}, ${p.cluster}\n`;
  }
}

if (cannibalisationWarnings.length > 0) {
  md += `\n## Mogelijke cannibalisatie\n\n`;
  for (const w of cannibalisationWarnings) {
    md += `- ${w}\n`;
  }
}

if (topActions.length > 0) {
  md += `\n## Aanbevolen vervolgacties (max. 10)\n\n`;
  for (const [i, a] of topActions.entries()) {
    md += `### ${i + 1}. ${a.action}\n\n`;
    md += `Impact: **${a.impact}** | Confidence: **${a.confidence}** | Moeite: **${a.effort}**\n`;
    if (a.pages.length > 0) {
      md += '\n' + a.pages.map(p => `- \`${p}\``).join('\n') + '\n';
    }
    md += '\n';
  }
}

md += `\n---\n\n*Rapport gegenereerd door \`scripts/analyse-search-console.js\`. Zie \`docs/seo-measurement.md\` voor instructies.*\n`;

// ── Genereer CSV ──────────────────────────────────────────────────────────────
const csvHeaders = ['url', 'pageType', 'cluster', 'role', 'classificatie', 'klikken', 'vertoningen', 'ctr', 'positie', 'inboundLinks', 'pageAgeDays', 'publishedDate'];
let csv = csvHeaders.join(',') + '\n';
for (const p of enriched) {
  const s = p.sc;
  csv += [
    p.url,
    p.pageType,
    p.cluster,
    p.role,
    p.classification,
    s?.clicks ?? '',
    s?.impressions ?? '',
    s?.ctr != null ? s.ctr.toFixed(1) + '%' : '',
    s?.position != null ? s.position.toFixed(1) : '',
    p.inboundLinkCount,
    p.pageAgeDays ?? '',
    p.publishedDate ?? '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
}

// ── Schrijf output ────────────────────────────────────────────────────────────
const reportsDir = path.join(ROOT, 'data', 'seo', 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const mdPath = path.join(reportsDir, `seo-report-${TODAY}.md`);
const csvPath = path.join(reportsDir, `seo-report-${TODAY}.csv`);

fs.writeFileSync(mdPath, md, 'utf8');
fs.writeFileSync(csvPath, csv, 'utf8');

console.log(`\nRapport geschreven:`);
console.log(`  Markdown: ${mdPath}`);
console.log(`  CSV:      ${csvPath}`);
if (!hasScData) {
  console.log(`\nNOTE: Geen Search Console data opgegeven. Rapport toont alleen inventaris-analyse.`);
  console.log(`Gebruik: node scripts/analyse-search-console.js --pages <export.csv> [--queries <queries.csv>]`);
}
