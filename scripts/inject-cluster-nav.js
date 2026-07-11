#!/usr/bin/env node
/**
 * inject-cluster-nav.js
 * Adds a <nav class="clusterNav"> block to cluster child pages.
 * Idempotent: skips pages that already have a clusterNav.
 * Run from project root: node scripts/inject-cluster-nav.js
 */

const fs = require('fs');
const path = require('path');

const PAGES = [
  // ── Resources cluster ──────────────────────────────────────────────────
  {
    file: 'resources/onderhoudschecklist-auto/index.html',
    parents: [{ label: 'Resources', url: '/resources/' }],
    current: 'Onderhoudschecklist auto',
  },
  {
    file: 'resources/onderhoudschecklist-motor/index.html',
    parents: [{ label: 'Resources', url: '/resources/' }],
    current: 'Onderhoudschecklist motor',
  },
  {
    file: 'resources/welke-onderhoudsdocumenten-bewaren/index.html',
    parents: [{ label: 'Resources', url: '/resources/' }],
    current: 'Welke documenten bewaren',
  },
  {
    file: 'resources/checklist-verkoop-voertuig/index.html',
    parents: [{ label: 'Resources', url: '/resources/' }],
    current: 'Checklist verkoop voertuig',
  },
  {
    file: 'resources/onderhoudshistorie-checklist/index.html',
    parents: [{ label: 'Resources', url: '/resources/' }],
    current: 'Onderhoudshistorie checklist',
  },
  {
    file: 'resources/jaarlijkse-onderhoudsplanning/index.html',
    parents: [{ label: 'Resources', url: '/resources/' }],
    current: 'Jaarlijkse onderhoudsplanning',
  },

  // ── Onderhoudshistorie cluster ──────────────────────────────────────────
  {
    file: 'onderhoudshistorie-auto/index.html',
    parents: [{ label: 'Onderhoudshistorie', url: '/onderhoudshistorie-motor/' }],
    current: 'Onderhoudshistorie auto',
  },
  {
    file: 'onderhoudshistorie-opbouwen/index.html',
    parents: [{ label: 'Onderhoudshistorie', url: '/onderhoudshistorie-motor/' }],
    current: 'Onderhoudshistorie opbouwen',
  },
  {
    file: 'onderhoudshistorie-reconstrueren/index.html',
    parents: [{ label: 'Onderhoudshistorie', url: '/onderhoudshistorie-motor/' }],
    current: 'Onderhoudshistorie reconstrueren',
  },
  {
    file: 'motor-kopen-onderhoudshistorie/index.html',
    parents: [{ label: 'Onderhoudshistorie', url: '/onderhoudshistorie-motor/' }],
    current: 'Motor kopen en onderhoudshistorie',
  },
  {
    file: 'voertuighistorie-bij-verkoop/index.html',
    parents: [{ label: 'Onderhoudshistorie', url: '/onderhoudshistorie-motor/' }],
    current: 'Voertuighistorie bij verkoop',
  },

  // ── Motor-onderhoud cluster ─────────────────────────────────────────────
  {
    file: 'motor-onderhoud-app/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Motor onderhoud app',
  },
  {
    file: 'motor-onderhoud-excel/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Motor onderhoud in Excel',
  },
  {
    file: 'motor-onderhoud-schema/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Motor onderhoud schema',
  },
  {
    file: 'beste-motor-onderhoud-app/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Beste motor onderhoud app',
  },
  {
    file: 'zelf-motor-onderhoud-documenteren/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Zelf motor onderhoud documenteren',
  },
  {
    file: 'onderhoudskosten-motor/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Onderhoudskosten motor',
  },

  // ── Auto-onderhoud cluster ──────────────────────────────────────────────
  {
    file: 'auto-onderhoud-app/index.html',
    parents: [{ label: 'Auto onderhoud', url: '/auto-onderhoud-bijhouden/' }],
    current: 'Auto onderhoud app',
  },

  // ── Digitaal onderhoudsboekje cluster ──────────────────────────────────
  {
    file: 'digitaal-onderhoudsboekje-motor/index.html',
    parents: [{ label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' }],
    current: 'Digitaal onderhoudsboekje motor',
  },
  {
    file: 'digitaal-onderhoudsboekje-vs-papier/index.html',
    parents: [{ label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' }],
    current: 'Digitaal vs papier',
  },
  {
    file: 'onderhoudsboekje/index.html',
    parents: [{ label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' }],
    current: 'Onderhoudsboekje',
  },
  {
    file: 'onderhoudsboekje/auto/index.html',
    parents: [
      { label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' },
      { label: 'Onderhoudsboekje', url: '/onderhoudsboekje/' },
    ],
    current: 'Onderhoudsboekje auto',
  },
  {
    file: 'onderhoudsboekje/motor/index.html',
    parents: [
      { label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' },
      { label: 'Onderhoudsboekje', url: '/onderhoudsboekje/' },
    ],
    current: 'Onderhoudsboekje motor',
  },
  {
    file: 'onderhoudsboekje/oldtimer/index.html',
    parents: [
      { label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' },
      { label: 'Onderhoudsboekje', url: '/onderhoudsboekje/' },
    ],
    current: 'Onderhoudsboekje oldtimer',
  },
  {
    file: 'onderhoudsboekje/youngtimer/index.html',
    parents: [
      { label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' },
      { label: 'Onderhoudsboekje', url: '/onderhoudsboekje/' },
    ],
    current: 'Onderhoudsboekje youngtimer',
  },
  {
    file: 'onderhoudsboekje-motor/index.html',
    parents: [{ label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' }],
    current: 'Onderhoudsboekje motor',
  },
  {
    file: 'onderhoudsboekje-oldtimer/index.html',
    parents: [{ label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' }],
    current: 'Onderhoudsboekje oldtimer',
  },
  {
    file: 'onderhoudsboekje-youngtimer/index.html',
    parents: [{ label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' }],
    current: 'Onderhoudsboekje youngtimer',
  },
  {
    file: 'youngtimer-onderhoud-bijhouden/index.html',
    parents: [{ label: 'Digitaal onderhoudsboekje', url: '/digitaal-onderhoudsboekje/' }],
    current: 'Youngtimer onderhoud bijhouden',
  },

  // ── Motortype cluster ───────────────────────────────────────────────────
  {
    file: 'yamaha-mt-07-onderhoud/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Yamaha MT-07 onderhoud',
  },
  {
    file: 'bmw-r1250gs-onderhoud/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'BMW R 1250 GS onderhoud',
  },
  {
    file: 'honda-cbr1000rr-fireblade-onderhoud/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Honda CBR1000RR Fireblade onderhoud',
  },
  {
    file: 'ktm-390-duke-onderhoud/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'KTM 390 Duke onderhoud',
  },
  {
    file: 'triumph-bonneville-t120-onderhoud/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'Triumph Bonneville T120 onderhoud',
  },

  // ── Vergelijkingen cluster ──────────────────────────────────────────────
  {
    file: 'garagebook-vs-drivvo/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'GarageBook vs Drivvo',
  },
  {
    file: 'garagebook-vs-fuelly/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'GarageBook vs Fuelly',
  },
  {
    file: 'garagebook-vs-simply-auto/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'GarageBook vs Simply Auto',
  },
  {
    file: 'garagebook-vs-motominder/index.html',
    parents: [{ label: 'Motor onderhoud', url: '/motor-onderhoud-bijhouden/' }],
    current: 'GarageBook vs MotoMinder',
  },
];

function buildNav(parents, current) {
  const parts = parents.map(
    (p) => `<a href="${p.url}">${p.label}</a><span class="clusterNav__sep" aria-hidden="true">›</span>`
  );
  return (
    `\n<nav class="clusterNav" aria-label="Onderdeel van cluster">\n` +
    `  <span class="clusterNav__label">Onderdeel van:</span>\n` +
    `  ${parts.join('\n  ')}\n` +
    `  <span class="clusterNav__current">${current}</span>\n` +
    `</nav>`
  );
}

const ANCHOR = '<main id="main-content">';
let updated = 0;
let skipped = 0;

for (const page of PAGES) {
  const filePath = path.resolve(process.cwd(), page.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`MISSING: ${page.file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('clusterNav')) {
    skipped++;
    continue;
  }
  const nav = buildNav(page.parents, page.current);
  content = content.replace(ANCHOR, ANCHOR + nav);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`OK: ${page.file}`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} already had clusterNav.`);
