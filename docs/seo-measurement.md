# SEO-meting en contentprestaties

Handleiding voor het meten en rapporteren van SEO-prestaties op garagebook.nl.

## Overzicht

Het meetproces bestaat uit drie onderdelen:

1. **Centrale pagina-inventaris** (`data/seo/pages.json`) — gegenereerd vanuit HTML + sitemap.
2. **Search Console-analyse** (`scripts/analyse-search-console.js`) — koppelt GSC-exports aan de inventaris en classificeert pagina's.
3. **SEO-regressiecheck** (`seo-check.sh`) — wordt automatisch bij elke publish uitgevoerd.

---

## 1. Centrale pagina-inventaris

### Genereren

```bash
node scripts/build-page-inventory.js
```

Dit leest:
- `sitemap.xml` voor lastmod-datums
- Alle `index.html`-bestanden voor technische metadata (title, description, canonical, robots, H1, OG, JSON-LD)
- De ingebouwde configuratie in het script voor cluster, paginatype, rol en primaire zoekintentie

Output: `data/seo/pages.json`

### Wanneer bijwerken?

Draai het script opnieuw na elke sprint waarbij:
- Nieuwe pagina's zijn toegevoegd, of
- Clusters, paginatypes of zoekintentie zijn gewijzigd

Voeg nieuwe pagina's toe aan `PAGE_CONFIG` in `scripts/build-page-inventory.js`.

### Velden per pagina

| Veld | Beschrijving |
|---|---|
| `url` | Volledige URL |
| `urlPath` | Pad (bijv. `/motor-onderhoud-bijhouden/`) |
| `pageType` | homepage, pillar, child, blog, resource, insight, comparison, motortype, other-seo |
| `cluster` | Contentcluster (bijv. `motor-onderhoud`) |
| `role` | pillar, hub, child, post, article |
| `primaryIntent` | Kort label van de zoekintentie |
| `indexable` | true of false |
| `inSitemap` | true of false |
| `publishedDate` | Eerste publicatiedatum |
| `lastModified` | Datum van laatste inhoudelijke wijziging (uit sitemap) |
| `pageAgeDays` | Leeftijd in dagen |
| `inboundLinkCount` | Aantal inkomende interne links |
| `title` | HTML title |
| `description` | Meta description |
| `canonical` | Canonical URL |
| `robots` | Robots meta-inhoud |
| `h1Count` | Aantal H1-elementen op de pagina |
| `hasOg` | Open Graph aanwezig (ja/nee) |
| `structuredDataTypes` | Lijst van JSON-LD @types |

---

## 2. Search Console-analyse

### Benodigde exports

Exporteer handmatig vanuit [Google Search Console](https://search.google.com/search-console):

1. **Paginaprestaties**: Zoekresultaten > Filteren op garagebook.nl > Exporteren > Pagina's (CSV)
2. **Queryprestaties** (optioneel): Zelfde export met tab "Zoekopdrachten"

Bewaar exports in een lokale map. Gebruik beschrijvende bestandsnamen, bijv.:
- `gsc-pages-2026-07.csv`
- `gsc-queries-2026-07.csv`

### Analyse uitvoeren

```bash
# Alleen inventaris (geen SC-data)
node scripts/analyse-search-console.js

# Met paginaprestaties
node scripts/analyse-search-console.js --pages gsc-pages-2026-07.csv

# Met pagina's + queries
node scripts/analyse-search-console.js \
  --pages gsc-pages-2026-07.csv \
  --queries gsc-queries-2026-07.csv

# Met trendvergelijking (huidige vs. vorige periode)
node scripts/analyse-search-console.js \
  --pages gsc-pages-2026-07.csv \
  --pages-prev gsc-pages-2026-06.csv
```

### Output

Rapporten worden geschreven naar `data/seo/reports/`:
- `seo-report-YYYY-MM-DD.md` — leesbaar Markdown-rapport
- `seo-report-YYYY-MM-DD.csv` — tabeloverzicht voor spreadsheet-analyse

### Classificaties

| Classificatie | Definitie |
|---|---|
| `new` | Pagina ≤ 14 dagen oud |
| `early-signals` | Pagina 15–42 dagen oud, weinig vertoningen |
| `indexation-concern` | Ouder dan 42 dagen, 0 vertoningen |
| `ranking-opportunity` | Positie 8–30, ≥ 10 vertoningen |
| `ctr-opportunity` | Positie 1–10, ≥ 50 vertoningen, CTR < 3% |
| `performer` | ≥ 5 klikken, positie ≤ 7 |
| `declining` | Performer met > 15% daling t.o.v. vorige periode |
| `monitor` | Pagina met data, maar geen speciale actie nodig |

Drempelwaarden zijn configureerbaar via `CONFIG` bovenin het script.

### Content-aging

- **0–14 dagen**: nieuw, alleen technische controle
- **15–42 dagen**: vroege signalen, nog onvoldoende voor uitspraken
- **Ouder dan 42 dagen**: inhoudelijke beoordeling mogelijk

---

## 3. Sitemap lastmod

`sitemap.xml` bevat per URL een `<lastmod>`-datum. Deze datum wordt **niet** automatisch bijgewerkt bij elke publish.

Werk `lastmod` handmatig bij in `sitemap.xml` wanneer een pagina inhoudelijk is gewijzigd. Dit geeft Google een betrouwbaar signaal voor hercrawling.

Bij een **nieuwe pagina**: voeg direct bij toevoeging een `lastmod` in met de publicatiedatum.

---

## 4. SEO-regressiecheck

`seo-check.sh` wordt automatisch uitgevoerd via `publish-commit.sh` en `publish-sync.sh`.

Extra checks toegevoegd in Sprint 7:

- `data/seo/pages.json` moet bestaan
- Duplicate page titles worden geblokkeerd
- Sitemap-URL's moeten corresponderen met bestaande HTML-bestanden
- Indexeerbare pagina's moeten in de sitemap staan
- Orphan-pagina's (geen inkomende interne links) worden geblokkeerd

Bewuste uitzonderingen zijn configureerbaar via `orphanExceptions` in het script.

---

## 5. Hoe vaak uitvoeren?

| Actie | Frequentie |
|---|---|
| `seo-check.sh` | Automatisch bij elke publish |
| `build-page-inventory.js` | Na elke sprint met nieuwe pagina's |
| `analyse-search-console.js` | Maandelijks, of na een sprint met nieuwe content |
| Search Console-export downloaden | Maandelijks |

---

## 6. Nieuwe pagina toevoegen aan inventaris

1. Voeg de pagina toe aan `PAGE_CONFIG` in `scripts/build-page-inventory.js` met cluster, type, rol en intent.
2. Voeg de pagina toe aan `sitemap.xml` met een correcte `lastmod`.
3. Draai `node scripts/build-page-inventory.js` om `data/seo/pages.json` bij te werken.
4. Voeg de pagina toe aan `publish-sync.sh` en `publish-commit.sh` (bestaand patroon volgen).
